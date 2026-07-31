from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Đọc từ biến môi trường / file .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    ai_service_api_key: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""
    gemini_model: str = "gemini-flash-latest"

    # Render tự đặt biến này cho mỗi bản build (tên biến do Render quy định, đừng
    # đổi). Trả ra ở /health để biết CHÍNH XÁC production đang chạy commit nào —
    # phiên 2026-07-30 đã 3 lần không xác nhận được "Render deploy chưa" vì phải
    # vào dashboard mới biết, mà máy dev lại bị mạng công ty chặn onrender.com.
    render_git_commit: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
