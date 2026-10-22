"""Dựng nội dung file cho AI (Gemini Part / OpenAI content block) từ file
Storage (đề bài) hoặc bytes inline (bài làm)."""

import base64
import io
import mimetypes
import zipfile
from typing import Literal
from xml.etree import ElementTree

from fastapi import HTTPException
from google.genai import types
from supabase import Client, create_client

from app.config import get_settings

_CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".json",
    ".java", ".c", ".cpp", ".cs", ".md", ".sql", ".txt",
}

# Chữ ký đầu file để phát hiện file hỏng/bị mã hóa TRƯỚC khi gửi Gemini
# (Gemini chỉ trả "Unable to process input image" rất khó hiểu).
_MAGIC_BYTES: dict[str, bytes] = {
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/jpeg": b"\xff\xd8\xff",
    "image/gif": b"GIF8",
    "application/pdf": b"%PDF",
}

# Phần mềm DLP/mã hóa của doanh nghiệp chèn marker này vào đầu file. Trình duyệt
# không được giải mã nên upload lên là bytes đã mã hóa.
_ENCRYPTED_MARKERS = (b"SECURE FILE", b"This file is encrypted")

ENCRYPTED_HINT = (
    "File \"{name}\" đang bị phần mềm bảo mật của công ty mã hóa nên hệ thống "
    "không đọc được nội dung thật. Hãy lưu file sang thư mục không bị mã hóa "
    "(VD Desktop cá nhân), hoặc dùng file .txt/.md, rồi upload lại."
)

# Gemini KHÔNG đọc được .docx trực tiếp (không nằm trong danh sách mime nó nhận),
# nên phải tự trích chữ. .docx là file ZIP chứa word/document.xml → zipfile +
# ElementTree của stdlib là đủ, không cần thêm dependency (python-docx/mammoth).
DOCX_MIME = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)
_W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Word/Excel/PowerPoint đời cũ là định dạng nhị phân đóng — không trích được chữ
# bằng stdlib. ⚠️ Bản đối chiếu phía web ở `web/src/lib/file-check.ts`
# (BLOCKED_EXTENSIONS) — sửa một bên nhớ xem bên kia.
_LEGACY_OFFICE = {
    ".doc": "Word đời cũ (.doc)",
    ".xls": "Excel đời cũ (.xls)",
    ".ppt": "PowerPoint đời cũ (.ppt)",
}


def _reject_if_unreadable(name: str, data: bytes) -> None:
    """Chặn sớm file bị mã hóa để báo lỗi cho người dùng biết đường xử lý."""
    head = data[:512]
    if any(marker in head for marker in _ENCRYPTED_MARKERS):
        raise HTTPException(status_code=400, detail=ENCRYPTED_HINT.format(name=name))


def docx_to_text(name: str, data: bytes) -> str:
    """Trích toàn bộ chữ trong .docx (kể cả bảng) theo từng đoạn `w:p`."""
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            document_xml = archive.read("word/document.xml")
        root = ElementTree.fromstring(document_xml)
    except (zipfile.BadZipFile, KeyError, ElementTree.ParseError) as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File \"{name}\" không phải file Word (.docx) đọc được — có thể "
                "bị hỏng, bị phần mềm bảo mật mã hóa, hoặc thực chất là .doc đời "
                "cũ đổi tên. Hãy mở bằng Word rồi \"Lưu thành\" .docx và thử lại."
            ),
        ) from exc

    paragraphs: list[str] = []
    for para in root.iter(f"{_W_NS}p"):
        chunks: list[str] = []
        for node in para.iter():
            if node.tag == f"{_W_NS}t":
                chunks.append(node.text or "")
            elif node.tag == f"{_W_NS}tab":
                chunks.append("\t")
            elif node.tag in (f"{_W_NS}br", f"{_W_NS}cr"):
                chunks.append("\n")
        paragraphs.append("".join(chunks))

    text = "\n".join(paragraphs).strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File Word \"{name}\" không có chữ nào đọc được (bài làm có thể "
                "chỉ là ảnh chụp dán vào Word). Hãy dán code dạng chữ, hoặc lưu "
                "thành .pdf để hệ thống đọc được ảnh."
            ),
        )
    return text


def _supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def _is_code_file(name: str) -> bool:
    return any(name.lower().endswith(ext) for ext in _CODE_EXTENSIONS)


def _classify(
    name: str, data: bytes, mime: str | None = None
) -> tuple[Literal["text", "binary"], str, str | None]:
    """Quyết định file là TEXT hay BINARY — DÙNG CHUNG cho cả Gemini lẫn OpenAI.

    Trả (kind, text, resolved_mime): `text` chỉ có nghĩa khi kind=="text"
    (rỗng khi "binary"); `resolved_mime` chỉ có nghĩa khi kind=="binary". Tách
    khỏi `bytes_to_part` để `bytes_to_openai_content` không phải chép lại luật
    docx/.doc cũ/magic-bytes — hai provider phải coi cùng 1 file là text hay
    nhị phân GIỐNG NHAU.
    """
    _reject_if_unreadable(name, data)

    if mime is None:
        mime, _ = mimetypes.guess_type(name)

    lowered = name.lower()

    legacy = next((v for k, v in _LEGACY_OFFICE.items() if lowered.endswith(k)), None)
    if legacy:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File \"{name}\" là {legacy} — định dạng này không trích được "
                "chữ. Hãy mở bằng Word/Office rồi \"Lưu thành\" .docx (hoặc .pdf) "
                "và thử lại."
            ),
        )

    # Đặt TRƯỚC nhánh text: mimetypes đoán .docx ra mime riêng (không phải text/*)
    # nên nếu để rơi xuống dưới sẽ gửi bytes ZIP thô cho AI và nó từ chối.
    if lowered.endswith(".docx") or mime == DOCX_MIME:
        return "text", docx_to_text(name, data), None

    if mime is None or mime.startswith("text/") or _is_code_file(name):
        return "text", data.decode("utf-8", errors="replace"), None

    # Ảnh/PDF hỏng → báo rõ thay vì để AI trả lỗi khó hiểu.
    expected = _MAGIC_BYTES.get(mime)
    if expected and not data.startswith(expected):
        raise HTTPException(
            status_code=400,
            detail=(
                f"File \"{name}\" không phải {mime} hợp lệ (nội dung không khớp "
                "định dạng). File có thể bị hỏng hoặc bị phần mềm bảo mật mã hóa — "
                "hãy thử upload lại bằng file khác."
            ),
        )
    return "binary", "", mime


def bytes_to_part(name: str, data: bytes, mime: str | None = None) -> types.Part:
    """Bọc bytes thành Part cho Gemini: code/text dạng text, còn lại (PDF/ảnh) nhị phân."""
    kind, text, resolved_mime = _classify(name, data, mime)
    if kind == "text":
        return types.Part.from_text(text=f"--- File: {name} ---\n{text}")
    return types.Part.from_bytes(data=data, mime_type=resolved_mime)


def bytes_to_openai_content(name: str, data: bytes, mime: str | None = None) -> dict:
    """Bọc bytes thành 1 content block Chat Completions của OpenAI.

    Ảnh đi qua `image_url` kiểu data URI base64 (chuẩn OpenAI hỗ trợ file
    nhị phân qua chat, không cần Files API riêng); PDF qua `file` cùng cách.
    """
    kind, text, resolved_mime = _classify(name, data, mime)
    if kind == "text":
        return {"type": "text", "text": f"--- File: {name} ---\n{text}"}

    b64 = base64.b64encode(data).decode("ascii")
    mime_type = resolved_mime or "application/octet-stream"
    if mime_type == "application/pdf":
        return {
            "type": "file",
            "file": {
                "filename": name,
                "file_data": f"data:{mime_type};base64,{b64}",
            },
        }
    return {
        "type": "image_url",
        "image_url": {"url": f"data:{mime_type};base64,{b64}"},
    }


def _download_bytes(bucket: str, path: str) -> bytes:
    try:
        return _supabase().storage.from_(bucket).download(path)
    except Exception as exc:
        raise HTTPException(
            status_code=404, detail=f"Không tải được file: {bucket}/{path}"
        ) from exc


def _clean_spec_filename(path: str) -> str:
    raw_name = path.split("/")[-1]
    # Bỏ tiền tố timestamp vd: 1729600000-hw3_data.csv hoặc 1729600000-att-hw3_data.csv
    parts = raw_name.split("-")
    if len(parts) >= 2 and parts[0].isdigit():
        if parts[1] == "att" and len(parts) >= 3:
            return "-".join(parts[2:])
        return "-".join(parts[1:])
    return raw_name


def download_as_part(bucket: str, path: str) -> types.Part:
    """Tải 1 file từ Storage và bọc thành Part cho Gemini (multimodal)."""
    return bytes_to_part(_clean_spec_filename(path), _download_bytes(bucket, path))


def download_as_openai_content(bucket: str, path: str) -> dict:
    """Tải 1 file từ Storage và bọc thành content block cho OpenAI."""
    return bytes_to_openai_content(_clean_spec_filename(path), _download_bytes(bucket, path))
