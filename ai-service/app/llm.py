"""Chọn provider theo từng request — Gemini là mặc định, OpenAI opt-in.

Routes gọi `generate_json` ở ĐÂY thay vì gọi thẳng app.gemini/app.openai_client,
để logic "provider nào dùng module nào" nằm ĐÚNG MỘT CHỖ. `file_parts` phải
đã được dựng ĐÚNG kiểu cho provider đang gọi (Gemini Part / OpenAI content
block — xem app/storage.py) TRƯỚC khi truyền vào đây; dispatcher này không tự
chuyển đổi giữa hai kiểu.
"""

from typing import Any, Literal

from app import gemini, openai_client

Provider = Literal["gemini", "openai"]


def generate_json(
    prompt: str,
    response_schema: dict[str, Any],
    file_parts: list[Any] | None = None,
    api_key: str | None = None,
    provider: Provider = "gemini",
) -> dict[str, Any]:
    if provider == "openai":
        return openai_client.generate_json(prompt, response_schema, file_parts, api_key)
    return gemini.generate_json(prompt, response_schema, file_parts, api_key)
