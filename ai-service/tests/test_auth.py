"""Test auth middleware — không gọi Gemini thật."""

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def fake_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_health_needs_no_key() -> None:
    # Render dùng /health làm healthCheckPath, và người vận hành mở thẳng trên
    # trình duyệt — đòi key ở đây là tự khóa cả hai đường.
    assert client.get("/health").status_code == 200


def test_health_reports_the_running_commit(monkeypatch: pytest.MonkeyPatch) -> None:
    # Để trả lời "Render deploy chưa?" bằng MỘT request thay vì mở dashboard
    # (phiên 2026-07-30 đã 3 lần không xác nhận được vì máy dev bị chặn onrender).
    monkeypatch.setenv("RENDER_GIT_COMMIT", "0d878823456789abcdef")
    get_settings.cache_clear()

    body = client.get("/health").json()

    assert body["status"] == "ok"
    # 7 ký tự để so bằng mắt với `git log --oneline`.
    assert body["commit"] == "0d87882"


def test_health_says_local_when_not_on_render(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    get_settings.cache_clear()

    assert client.get("/health").json()["commit"] == "local"


def test_protected_endpoint_rejects_missing_key() -> None:
    res = client.post(
        "/generate-review", json={"student_name": "A", "session_title": "B"}
    )
    assert res.status_code == 401


def test_protected_endpoint_rejects_wrong_key() -> None:
    res = client.post(
        "/generate-review",
        json={"student_name": "A", "session_title": "B"},
        headers={"X-API-Key": "wrong"},
    )
    assert res.status_code == 401


def test_validation_runs_after_valid_key() -> None:
    # Key đúng + body thiếu trường bắt buộc → 422 (đã qua được lớp auth).
    res = client.post(
        "/generate-review", json={}, headers={"X-API-Key": "test-key"}
    )
    assert res.status_code == 422
