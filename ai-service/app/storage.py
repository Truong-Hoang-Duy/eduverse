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


def _supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def _is_code_file(name: str) -> bool:
    return any(name.lower().endswith(ext) for ext in _CODE_EXTENSIONS)


def bytes_to_part(name: str, data: bytes, mime: str | None = None) -> types.Part:
    """Bọc bytes thành Part: code/text đưa dạng text, còn lại (PDF/ảnh) dạng nhị phân."""
    if mime is None:
        mime, _ = mimetypes.guess_type(name)

    if mime is None or mime.startswith("text/") or _is_code_file(name):
        text = data.decode("utf-8", errors="replace")
        return types.Part.from_text(text=f"--- File: {name} ---\n{text}")
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
