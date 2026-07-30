"""Test nhận xét sản phẩm cuối khóa — KHÔNG gọi Gemini thật."""

import pytest
from fastapi.testclient import TestClient

from app import prompts
from app.config import get_settings
from app.main import app
from app.routes.grading import PROJECT_REVIEW_SCHEMA, _entry_first

client = TestClient(app)


@pytest.fixture(autouse=True)
def fake_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_should_reject_request_without_api_key() -> None:
    res = client.post(
        "/review-project",
        json={"files": [{"path": "index.html", "content": "<h1>hi</h1>"}]},
    )
    assert res.status_code == 401


def test_should_reject_empty_file_list() -> None:
    res = client.post(
        "/review-project", json={"files": []}, headers={"X-API-Key": "test-key"}
    )
    assert res.status_code == 422


def test_response_schema_has_no_score() -> None:
    # Sản phẩm cuối khóa CHỈ nhận xét — điểm số lọt vào là sai yêu cầu nghiệp vụ.
    assert "score" not in PROJECT_REVIEW_SCHEMA["properties"]
    assert set(PROJECT_REVIEW_SCHEMA["properties"]) == {
        "diem_manh",
        "can_cai_thien",
        "goi_y",
    }


def test_entry_files_are_sorted_first() -> None:
    paths = ["js/utils.js", "css/style.css", "index.html", "js/app.js", "README.md"]

    ordered = sorted(paths, key=_entry_first)

    # index.html trước, rồi các entry khác, file phụ ở sau.
    assert ordered[0] == "index.html"
    assert ordered.index("js/app.js") < ordered.index("js/utils.js")
    assert ordered[-1] in ("css/style.css", "js/utils.js")


def test_prompt_forbids_scoring_and_lists_files() -> None:
    prompt = prompts.build_project_review_prompt(
        course_name="Web cơ bản",
        notes="Chú ý phần xử lý form",
        file_paths=["index.html", "js/app.js"],
    )

    assert "KHÔNG cho điểm" in prompt
    assert "thang điểm" in prompt
    assert "Web cơ bản" in prompt
    assert "Chú ý phần xử lý form" in prompt
    assert "js/app.js" in prompt
    # Không có đề bài nên prompt tuyệt đối không được nhắc "đối chiếu với đề".
    assert "ĐỀ BÀI" not in prompt


def test_prompt_works_without_course_and_notes() -> None:
    prompt = prompts.build_project_review_prompt(
        course_name="", notes=None, file_paths=["main.py"]
    )

    assert "Khóa học:" not in prompt
    assert "Ghi chú của giáo viên" not in prompt
    assert "main.py" in prompt


def test_project_review_does_not_apply_tone_rule() -> None:
    # Đây là nhận xét kỹ thuật cho GV, cùng họ với chấm bài — TONE_RULE chỉ áp cho
    # 3 prompt viết nhận xét gửi phụ huynh (xem SESSION_NOTES).
    prompt = prompts.build_project_review_prompt(
        course_name="", notes=None, file_paths=["main.py"]
    )

    assert prompts.TONE_RULE not in prompt
