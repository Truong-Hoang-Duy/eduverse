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

# Key DÙNG CHUNG hết lượt: chờ thêm KHÔNG giải quyết được gì (hết cho tới hôm sau)
# nên phải chỉ đúng đường — app có sẵn tính năng khai key riêng ở trang Hồ sơ.
# Câu cũ "AI đang bận, thử lại sau ít phút" khiến GV bấm lại vô ích (sửa 2026-07-30).
QUOTA_MESSAGE = (
    "Key dùng chung của hệ thống đã hết lượt hôm nay. Vào trang Hồ sơ thêm API "
    "key Gemini riêng của bạn (miễn phí, 1.500 lượt/ngày) để dùng tiếp ngay."
)
QUOTA_MESSAGE_OWN_KEY = (
    "API key của bạn đã hết lượt dùng hôm nay (Gemini free: 1.500 lượt/ngày). "
    "Thử lại sau hoặc dùng key khác."
)
# Gemini tự trả 503 UNAVAILABLE khi model đang tắc nghẽn — KHÁC hết lượt: thử lại
# sau ít phút là được, không phải chờ sang ngày mai. Nói rõ để GV không đi tìm key
# mới một cách vô ích (dính 2026-07-30: E2E đỏ, phải đọc log mới biết là tắc nghẽn).
BUSY_MESSAGE = (
    "Google đang quá tải mô hình AI (không phải hết lượt của bạn). "
    "Chờ một hai phút rồi bấm lại là được."
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
            # PHẢI log: trước đây nhánh này im lặng nên trong log không phân biệt
            # được "hết lượt" với "tắc nghẽn"/lỗi khác, chẩn đoán sai mấy lần.
            logger.warning(
                "Gemini quota exhausted (own_key=%s): %s", own_key, exc
            )
            raise HTTPException(
                status_code=503,
                detail=QUOTA_MESSAGE_OWN_KEY if own_key else QUOTA_MESSAGE,
            ) from exc
        # Model tắc nghẽn — cùng mã 503 với hết lượt nhưng cách xử lý khác hẳn.
        if exc.code == 503:
            logger.warning("Gemini unavailable (high demand): %s", exc)
            raise HTTPException(status_code=503, detail=BUSY_MESSAGE) from exc
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
