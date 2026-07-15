"""Wrapper gọi Gemini — mọi endpoint dùng chung, xử lý quota tại một chỗ."""

import json
import logging
from functools import lru_cache
from typing import Any

from fastapi import HTTPException
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

QUOTA_MESSAGE = "AI đang bận, thử lại sau ít phút"
QUOTA_MESSAGE_OWN_KEY = (
    "API key của bạn đã hết lượt dùng hôm nay (Gemini free: 1.500 lượt/ngày). "
    "Thử lại sau hoặc dùng key khác."
)
BAD_KEY_MESSAGE = (
    "API key không hợp lệ. Kiểm tra lại key trong trang Hồ sơ, hoặc xóa đi để "
    "dùng key mặc định của hệ thống."
)


@lru_cache(maxsize=64)
def _client(api_key: str) -> genai.Client:
    # Cache client theo từng key: tạo mới mỗi request sẽ bị GC dọn ngay
    # giữa chừng → httpx client đóng → "client has been closed".
    return genai.Client(api_key=api_key)


def generate_json(
    prompt: str,
    response_schema: dict[str, Any],
    file_parts: list[types.Part] | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    """Gọi Gemini với structured output, trả về dict đã parse.

    file_parts: các file (đề bài PDF/ảnh, code) chèn TRƯỚC prompt text.
    api_key: key riêng của người dùng; None thì dùng key mặc định trong env.
    """
    own_key = bool(api_key)
    key = api_key or get_settings().gemini_api_key

    contents: list[Any] = list(file_parts or [])
    contents.append(prompt)
    try:
        response = _client(key).models.generate_content(
            model=get_settings().gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )
    except genai_errors.APIError as exc:
        if exc.code == 429:
            raise HTTPException(
                status_code=503,
                detail=QUOTA_MESSAGE_OWN_KEY if own_key else QUOTA_MESSAGE,
            ) from exc
        # Key sai/hết hạn → nói thẳng để người dùng biết đường sửa.
        if exc.code in (400, 403) and "API key" in str(exc):
            raise HTTPException(status_code=400, detail=BAD_KEY_MESSAGE) from exc
        logger.error("Gemini API error: %s", exc)
        raise HTTPException(status_code=502, detail="Lỗi khi gọi AI, thử lại sau") from exc

    try:
        return json.loads(response.text or "")
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON: %r", response.text)
        raise HTTPException(status_code=502, detail="AI trả về dữ liệu không hợp lệ") from exc
