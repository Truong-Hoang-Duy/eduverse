"""Wrapper gọi Gemini — mọi endpoint dùng chung, xử lý quota tại một chỗ."""

import json
import logging
from typing import Any

from fastapi import HTTPException
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

QUOTA_MESSAGE = "AI đang bận, thử lại sau ít phút"


def _client() -> genai.Client:
    return genai.Client(api_key=get_settings().gemini_api_key)


def generate_json(
    prompt: str,
    response_schema: dict[str, Any],
    file_parts: list[types.Part] | None = None,
) -> dict[str, Any]:
    """Gọi Gemini với structured output, trả về dict đã parse.

    file_parts: các file (đề bài PDF/ảnh, code) chèn TRƯỚC prompt text.
    """
    contents: list[Any] = list(file_parts or [])
    contents.append(prompt)
    try:
        response = _client().models.generate_content(
            model=get_settings().gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )
    except genai_errors.APIError as exc:
        if exc.code == 429:
            raise HTTPException(status_code=503, detail=QUOTA_MESSAGE) from exc
        logger.error("Gemini API error: %s", exc)
        raise HTTPException(status_code=502, detail="Lỗi khi gọi AI, thử lại sau") from exc

    try:
        return json.loads(response.text or "")
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON: %r", response.text)
        raise HTTPException(status_code=502, detail="AI trả về dữ liệu không hợp lệ") from exc
