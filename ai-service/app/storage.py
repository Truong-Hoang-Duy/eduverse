"""Tải file đề bài / bài làm từ Supabase Storage bằng service key."""

import mimetypes

from fastapi import HTTPException
from google.genai import types
from supabase import Client, create_client

from app.config import get_settings


def _supabase() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def download_as_part(bucket: str, path: str) -> types.Part:
    """Tải 1 file từ Storage và bọc thành Part cho Gemini (multimodal)."""
    try:
        data: bytes = _supabase().storage.from_(bucket).download(path)
    except Exception as exc:
        raise HTTPException(
            status_code=404, detail=f"Không tải được file: {bucket}/{path}"
        ) from exc

    mime, _ = mimetypes.guess_type(path)
    if mime is None or mime.startswith("text/") or _is_code_file(path):
        # Code/text đưa vào dạng text để Gemini đọc trực tiếp.
        text = data.decode("utf-8", errors="replace")
        return types.Part.from_text(text=f"--- File: {path} ---\n{text}")
    return types.Part.from_bytes(data=data, mime_type=mime)


_CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".json",
    ".java", ".c", ".cpp", ".cs", ".md", ".sql",
}


def _is_code_file(path: str) -> bool:
    return any(path.lower().endswith(ext) for ext in _CODE_EXTENSIONS)
