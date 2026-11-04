"""Test cho tính năng AI tự động soạn hướng dẫn & mô tả đoạn code mẫu (Sổ tay Code)."""

import pytest
from fastapi.testclient import TestClient

from app import prompts
from app.config import get_settings
from app.main import app


@pytest.fixture(autouse=True)
def fake_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_build_suggest_code_snippet_prompt_includes_code_and_rules() -> None:
    prompt = prompts.build_suggest_code_snippet_prompt(
        code="%matplotlib inline",
        teacher_hint="lỗi không hiện biểu đồ",
    )

    assert "%matplotlib inline" in prompt
    assert "lỗi không hiện biểu đồ" in prompt
    assert "'title'" in prompt
    assert "'usage_guide'" in prompt
    assert "'category'" in prompt
    assert "xưng hô gọi học viên là 'em'" in prompt
    assert "TUYỆT ĐỐI KHÔNG dùng từ 'con'" in prompt


def test_build_suggest_code_snippet_prompt_without_hint() -> None:
    prompt = prompts.build_suggest_code_snippet_prompt(code="import pandas as pd")

    assert "import pandas as pd" in prompt
    assert "Ghi chú / Gợi ý ban đầu của giáo viên:" not in prompt


def test_suggest_code_snippet_endpoint_returns_valid_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_generate_json(prompt, response_schema, api_key=None, provider=None):
        assert "%matplotlib inline" in prompt
        return {
            "title": "Khắc phục lỗi không hiển thị biểu đồ trên Jupyter Notebook",
            "usage_guide": "Khi chạy code vẽ biểu đồ mà không thấy hình hiện ra, em chèn dòng lệnh này vào dòng đầu tiên của ô code rồi chạy lại nhé.",
            "category": "csa",
        }

    monkeypatch.setattr("app.routes.projects.generate_json", fake_generate_json)

    client = TestClient(app)
    res = client.post(
        "/suggest-code-snippet",
        headers={"X-API-Key": "test-key"},
        json={
            "code": "%matplotlib inline",
            "teacher_hint": "không hiện biểu đồ",
        },
    )

    assert res.status_code == 200
    data = res.json()
    assert (
        data["title"]
        == "Khắc phục lỗi không hiển thị biểu đồ trên Jupyter Notebook"
    )
    assert "em chèn dòng lệnh này" in data["usage_guide"]
    assert data["category"] == "csa"

