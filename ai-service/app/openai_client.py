"""Wrapper gọi OpenAI — vai trò song song với app/gemini.py, nhưng cho
provider opt-in OpenAI (model cấu hình ở `Settings.openai_model`).

🔴 KHÔNG có key OpenAI mặc định của hệ thống trong BẤT KỲ trường hợp nào —
khác Gemini (fallback `GEMINI_API_KEY` khi user chưa đặt key riêng), mỗi tài
khoản dùng ĐÚNG key OpenAI của chính họ. Web đã chặn gọi sang endpoint khi
provider="openai" mà chưa có key (xem web/src/lib/actions/api-key.ts →
getAiConfig()); `generate_json` ở đây tự chặn LẦN NỮA cho chắc, phòng khi web
có bug — không được lặng lẽ dùng key nào khác thay thế.
"""

import json
import logging
from functools import lru_cache
from typing import Any

from fastapi import HTTPException
from openai import APIError, APIStatusError, OpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)

BAD_KEY_MESSAGE = (
    "API key OpenAI không hợp lệ hoặc đã bị thu hồi. Kiểm tra lại key trong "
    "trang Hồ sơ, hoặc chuyển lại về dùng Gemini."
)
QUOTA_MESSAGE = (
    "API key OpenAI của bạn đã hết hạn mức hoặc hết tiền trong tài khoản. "
    "Kiểm tra lại ở platform.openai.com/usage, hoặc chuyển tạm về dùng Gemini."
)
BUSY_MESSAGE = "OpenAI đang quá tải, chờ một hai phút rồi bấm lại là được."
MISSING_KEY_MESSAGE = (
    "Bạn đang chọn dùng OpenAI nhưng chưa có API key riêng. Vào trang Hồ sơ "
    "nhập key, hoặc chuyển lại về dùng Gemini."
)


@lru_cache(maxsize=64)
def _client(api_key: str) -> OpenAI:
    # Cache theo key, giống app/gemini.py._client — tạo client mới mỗi request
    # sẽ bị GC dọn giữa chừng và đóng connection pool đang dùng dở.
    return OpenAI(api_key=api_key)


def _prompt_with_schema(prompt: str, response_schema: dict[str, Any]) -> str:
    # OpenAI Chat Completions ở chế độ response_format=json_object đòi hỏi chữ
    # "JSON" xuất hiện trong prompt, và không tự enforce schema như Gemini
    # (response_schema) — phải tự mô tả schema mong muốn trong lời gọi.
    return (
        f"{prompt}\n\n"
        "Trả lời DUY NHẤT bằng một JSON object hợp lệ đúng theo JSON Schema "
        "sau, không thêm chữ nào khác ngoài JSON:\n"
        f"{json.dumps(response_schema, ensure_ascii=False)}"
    )


def generate_json(
    prompt: str,
    response_schema: dict[str, Any],
    file_parts: list[dict] | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    """Gọi OpenAI với structured output (json_object), trả về dict đã parse.

    file_parts: content block kiểu OpenAI (`{"type": "text"|"image_url"|"file", ...}`)
    — dựng bằng app.storage.bytes_to_openai_content/download_as_openai_content,
    chèn TRƯỚC prompt text, cùng thứ tự với app.gemini.generate_json.
    """
    if not api_key:
        raise HTTPException(status_code=400, detail=MISSING_KEY_MESSAGE)

    content: list[dict] = list(file_parts or [])
    content.append({"type": "text", "text": _prompt_with_schema(prompt, response_schema)})

    try:
        response = _client(api_key).chat.completions.create(
            model=get_settings().openai_model,
            messages=[{"role": "user", "content": content}],
            response_format={"type": "json_object"},
        )
    except APIStatusError as exc:
        if exc.status_code == 401:
            raise HTTPException(status_code=400, detail=BAD_KEY_MESSAGE) from exc
        if exc.status_code == 429:
            logger.warning("OpenAI quota exhausted: %s", exc)
            raise HTTPException(status_code=503, detail=QUOTA_MESSAGE) from exc
        if exc.status_code == 503:
            logger.warning("OpenAI unavailable (high demand): %s", exc)
            raise HTTPException(status_code=503, detail=BUSY_MESSAGE) from exc
        logger.error("OpenAI API error: %s", exc)
        raise HTTPException(status_code=502, detail="Lỗi khi gọi AI, thử lại sau") from exc
    except APIError as exc:
        logger.error("OpenAI API error: %s", exc)
        raise HTTPException(status_code=502, detail="Lỗi khi gọi AI, thử lại sau") from exc

    raw = response.choices[0].message.content or ""
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("OpenAI returned non-JSON: %r", raw)
        raise HTTPException(status_code=502, detail="AI trả về dữ liệu không hợp lệ") from exc
