"""Test cách dịch lỗi OpenAI sang HTTP — KHÔNG gọi OpenAI thật.

Cùng lý do với tests/test_gemini_errors.py: nhiều nguyên nhân khác nhau (key
sai, hết hạn mức, model quá tải) không được lẫn vào nhau, vì chỉ `detail` mới
nói được người dùng phải làm gì. Khác Gemini ở một điểm quan trọng: OpenAI
KHÔNG có key hệ thống — thiếu key phải bị chặn TRƯỚC khi gọi SDK.
"""

import httpx2
import pytest
from fastapi import HTTPException
from openai import APIError, APIStatusError

from app import openai_client


def _fake_status_error(status_code: int, message: str = "boom") -> APIStatusError:
    request = httpx2.Request("POST", "https://api.openai.com/v1/chat/completions")
    response = httpx2.Response(status_code, request=request, json={"error": {"message": message}})
    return APIStatusError(message, response=response, body=None)


def call(monkeypatch: pytest.MonkeyPatch, exc: Exception, api_key="user-key"):
    """Gọi generate_json với OpenAI bị ép lỗi, trả về HTTPException bắt được."""

    class FakeCompletions:
        def create(self, **_kwargs):
            raise exc

    class FakeChat:
        completions = FakeCompletions()

    class FakeClient:
        chat = FakeChat()

    monkeypatch.setattr(openai_client, "_client", lambda _key: FakeClient())

    with pytest.raises(HTTPException) as excinfo:
        openai_client.generate_json("prompt", {"type": "object"}, api_key=api_key)
    return excinfo.value


def test_missing_key_is_blocked_before_calling_openai() -> None:
    # OpenAI KHÔNG có key hệ thống — thiếu key phải chặn NGAY, không được lặng
    # lẽ gọi bằng key nào khác.
    with pytest.raises(HTTPException) as excinfo:
        openai_client.generate_json("prompt", {"type": "object"}, api_key=None)

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == openai_client.MISSING_KEY_MESSAGE


def test_missing_key_rejects_empty_string_too() -> None:
    with pytest.raises(HTTPException) as excinfo:
        openai_client.generate_json("prompt", {"type": "object"}, api_key="")

    assert excinfo.value.detail == openai_client.MISSING_KEY_MESSAGE


def test_401_maps_to_bad_key_message(monkeypatch: pytest.MonkeyPatch) -> None:
    err = call(monkeypatch, _fake_status_error(401, "invalid_api_key"))

    assert err.status_code == 400
    assert err.detail == openai_client.BAD_KEY_MESSAGE


def test_429_maps_to_quota_message(monkeypatch: pytest.MonkeyPatch) -> None:
    err = call(monkeypatch, _fake_status_error(429, "rate_limit_exceeded"))

    assert err.status_code == 503
    assert err.detail == openai_client.QUOTA_MESSAGE
    assert "của bạn" in err.detail


def test_429_is_logged(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level("WARNING"):
        call(monkeypatch, _fake_status_error(429, "rate_limit_exceeded"))

    assert "quota" in caplog.text.lower()


def test_503_maps_to_busy_message_not_quota(monkeypatch: pytest.MonkeyPatch) -> None:
    err = call(monkeypatch, _fake_status_error(503, "model overloaded"))

    assert err.status_code == 503
    assert err.detail == openai_client.BUSY_MESSAGE
    assert err.detail != openai_client.QUOTA_MESSAGE


def test_other_status_maps_to_502(monkeypatch: pytest.MonkeyPatch) -> None:
    err = call(monkeypatch, _fake_status_error(500, "internal"))

    assert err.status_code == 502


def test_connection_error_maps_to_502(monkeypatch: pytest.MonkeyPatch) -> None:
    request = httpx2.Request("POST", "https://api.openai.com/v1/chat/completions")
    err = call(monkeypatch, APIError("connection failed", request, body=None))

    assert err.status_code == 502


def test_non_json_response_maps_to_502(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeMessage:
        content = "khong phai json"

    class FakeChoice:
        message = FakeMessage()

    class FakeResponse:
        choices = [FakeChoice()]

    class FakeCompletions:
        def create(self, **_kwargs):
            return FakeResponse()

    class FakeChat:
        completions = FakeCompletions()

    class FakeClient:
        chat = FakeChat()

    monkeypatch.setattr(openai_client, "_client", lambda _key: FakeClient())

    with pytest.raises(HTTPException) as excinfo:
        openai_client.generate_json("prompt", {"type": "object"}, api_key="user-key")

    assert excinfo.value.status_code == 502
