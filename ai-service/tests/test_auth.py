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
    assert client.get("/health").status_code == 200


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
