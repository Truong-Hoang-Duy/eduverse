"""Dựng Part cho Gemini từ file Storage (đề bài) hoặc bytes inline (bài làm)."""

import mimetypes

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


def _reject_if_unreadable(name: str, data: bytes) -> None:
    """Chặn sớm file bị mã hóa để báo lỗi cho người dùng biết đường xử lý."""
    head = data[:512]
    if any(marker in head for marker in _ENCRYPTED_MARKERS):
        raise HTTPException(status_code=400, detail=ENCRYPTED_HINT.format(name=name))


def _supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def _is_code_file(name: str) -> bool:
    return any(name.lower().endswith(ext) for ext in _CODE_EXTENSIONS)


def bytes_to_part(name: str, data: bytes, mime: str | None = None) -> types.Part:
    """Bọc bytes thành Part: code/text đưa dạng text, còn lại (PDF/ảnh) dạng nhị phân."""
    _reject_if_unreadable(name, data)

    if mime is None:
        mime, _ = mimetypes.guess_type(name)

    if mime is None or mime.startswith("text/") or _is_code_file(name):
        text = data.decode("utf-8", errors="replace")
        return types.Part.from_text(text=f"--- File: {name} ---\n{text}")

    # Ảnh/PDF hỏng → báo rõ thay vì để Gemini trả lỗi khó hiểu.
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
    return types.Part.from_bytes(data=data, mime_type=mime)


def download_as_part(bucket: str, path: str) -> types.Part:
    """Tải 1 file từ Storage và bọc thành Part cho Gemini (multimodal)."""
    try:
        data: bytes = _supabase().storage.from_(bucket).download(path)
    except Exception as exc:
        raise HTTPException(
            status_code=404, detail=f"Không tải được file: {bucket}/{path}"
        ) from exc

    return bytes_to_part(path, data)
