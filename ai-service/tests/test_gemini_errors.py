"""Test cách dịch lỗi Gemini sang HTTP — KHÔNG gọi Gemini thật.

Vì sao đáng test: hai nguyên nhân KHÁC HẲN nhau (hết lượt vs Google tắc nghẽn) đều
ra HTTP 503, nên chỉ `detail` mới nói được GV phải làm gì. Và trước 2026-07-30
nhánh hết-lượt KHÔNG log gì → trong log không phân biệt được với lỗi khác, đã dẫn
tới chẩn đoán sai mấy lần khi E2E đỏ.
"""

import pytest
from fastapi import HTTPException
from google.genai import errors as genai_errors

from app import gemini
from app.config import get_settings


@pytest.fixture(autouse=True)
def fake_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


class FakeApiError(genai_errors.APIError):
    """Dựng APIError với `code` cho trước, không đi qua HTTP thật."""

    def __init__(self, code: int, message: str) -> None:  # noqa: D107
        self.code = code
        self.message = message
        self.status = None
        self.details = None
        self.response = None
        Exception.__init__(self, message)


def raise_api_error(code: int, message: str = "boom"):
    def _fail(*_args, **_kwargs):
        raise FakeApiError(code, message)

    return _fail


def call(monkeypatch: pytest.MonkeyPatch, code: int, message: str, api_key=None):
    """Gọi generate_json với Gemini bị ép lỗi, trả về HTTPException bắt được."""

    class FakeModels:
        generate_content = staticmethod(raise_api_error(code, message))

    class FakeClient:
        models = FakeModels()

    monkeypatch.setattr(gemini, "_client", lambda _key: FakeClient())

    with pytest.raises(HTTPException) as exc:
        gemini.generate_json("prompt", {"type": "object"}, api_key=api_key)
    return exc.value


def test_quota_on_system_key_points_to_adding_an_own_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Hết lượt key dùng chung thì chờ thêm vô ích — phải chỉ sang trang Hồ sơ.
    err = call(monkeypatch, 429, "RESOURCE_EXHAUSTED")

    assert err.status_code == 503
    assert err.detail == gemini.QUOTA_MESSAGE
    assert "hết lượt" in err.detail
    assert "Hồ sơ" in err.detail


def test_quota_on_own_key_says_it_is_the_users_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    err = call(monkeypatch, 429, "RESOURCE_EXHAUSTED", api_key="user-key")

    assert err.detail == gemini.QUOTA_MESSAGE_OWN_KEY
    assert "của bạn" in err.detail


def test_quota_is_logged(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    # Trước đây nhánh này im lặng — không log thì không lần ra được nguyên nhân.
    with caplog.at_level("WARNING"):
        call(monkeypatch, 429, "RESOURCE_EXHAUSTED")

    assert "quota" in caplog.text.lower()


def test_high_demand_maps_to_503_but_says_retry_soon(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Cùng mã 503 với hết lượt, nhưng cách xử lý khác: chờ ít phút là được.
    err = call(monkeypatch, 503, "UNAVAILABLE: high demand")

    assert err.status_code == 503
    assert err.detail == gemini.BUSY_MESSAGE
    # Phải KHÁC hẳn thông báo hết lượt, nếu không GV đi tìm key mới một cách vô ích.
    assert err.detail != gemini.QUOTA_MESSAGE
    assert err.detail != gemini.QUOTA_MESSAGE_OWN_KEY
    assert "quá tải" in err.detail


def test_high_demand_is_logged(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level("WARNING"):
        call(monkeypatch, 503, "UNAVAILABLE")

    assert "unavailable" in caplog.text.lower()


def test_bad_key_maps_to_400_with_fix_instructions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    err = call(monkeypatch, 400, "API key not valid")

    assert err.status_code == 400
    assert err.detail == gemini.BAD_KEY_MESSAGE


def test_other_errors_map_to_502(monkeypatch: pytest.MonkeyPatch) -> None:
    err = call(monkeypatch, 500, "internal")

    assert err.status_code == 502
