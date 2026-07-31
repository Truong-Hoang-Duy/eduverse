"""Test gợi ý cho học viên đang bí — KHÔNG gọi Gemini thật.

Điểm khác cốt lõi so với hai endpoint cùng họ, và cũng là thứ các test dưới đây
canh: người đọc là HỌC VIÊN chứ không phải giáo viên. Vì thế prompt phải kiềm chế
ĐỘ KHÓ của kiến thức, và tuyệt đối không được cho điểm.
"""

import base64

import pytest
from fastapi.testclient import TestClient

from app import prompts
from app.config import get_settings
from app.main import app
from app.routes.grading import STUDENT_HELP_SCHEMA, _drop_diagnosis_without_code

client = TestClient(app)

SPEC_PATH = "khoa-abc/de-buoi-1.md"


@pytest.fixture(autouse=True)
def fake_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_should_reject_request_without_api_key() -> None:
    res = client.post(
        "/help-student",
        json={"spec_file_path": SPEC_PATH, "assignment_title": "Tính tổng"},
    )
    assert res.status_code == 401


def test_should_require_the_assignment() -> None:
    # Không có đề thì chẳng gợi ý được gì — chặn ở schema, đừng để tới Gemini.
    res = client.post(
        "/help-student", json={"files": []}, headers={"X-API-Key": "test-key"}
    )
    assert res.status_code == 422


def test_should_reject_a_file_that_is_not_valid_base64() -> None:
    res = client.post(
        "/help-student",
        json={
            "spec_file_path": SPEC_PATH,
            "assignment_title": "Tính tổng",
            "files": [{"name": "a.js", "content_b64": "khong-phai-base64!!!"}],
        },
        headers={"X-API-Key": "test-key"},
    )
    assert res.status_code == 400
    assert "a.js" in res.json()["detail"]


def test_response_schema_has_no_score() -> None:
    # Em đang HỎI BÀI, không nộp bài. Điểm lọt vào đây là sai hẳn nghiệp vụ.
    assert "score" not in STUDENT_HELP_SCHEMA["properties"]
    assert set(STUDENT_HELP_SCHEMA["properties"]) == {
        "dang_o_dau",
        "can_sua",
        "cac_buoc",
    }


def test_prompt_without_code_asks_for_steps_only() -> None:
    prompt = prompts.build_student_help_prompt(
        course_name="Scratch cơ bản",
        assignment_title="Tính tổng hai số",
        instructions=None,
        question=None,
        has_code=False,
        file_names=[],
    )

    assert "CHƯA gửi code" in prompt
    assert "KHÔNG giải hộ cả bài" in prompt
    assert "Scratch cơ bản" in prompt
    # Chưa có code thì hai khối kia phải rỗng — nói rõ trong chính JSON mẫu.
    assert '"dang_o_dau": ""' in prompt
    assert '"can_sua": []' in prompt


def test_prompt_with_code_asks_what_is_wrong_and_what_is_next() -> None:
    prompt = prompts.build_student_help_prompt(
        course_name="JavaScript Basic",
        assignment_title="Tính tổng hai số",
        instructions="Bắt buộc dùng let/const",
        question="Em chạy không ra kết quả ạ",
        has_code=True,
        file_names=["bai-lam.js", "anh-giao-dien.png"],
    )

    assert "đang làm dở" in prompt
    assert "bai-lam.js" in prompt
    assert "anh-giao-dien.png" in prompt
    assert "Bắt buộc dùng let/const" in prompt
    assert "Em chạy không ra kết quả ạ" in prompt
    # Hướng sai phải được nói thẳng, không để em đi tiếp rồi hỏng.
    assert "SAI" in prompt


def test_prompt_never_scores() -> None:
    for has_code in (True, False):
        prompt = prompts.build_student_help_prompt(
            course_name="",
            assignment_title="Bài 1",
            instructions=None,
            question=None,
            has_code=has_code,
            file_names=[],
        )
        assert "KHÔNG chấm điểm" in prompt
        assert "score" not in prompt


def test_prompt_holds_the_difficulty_down_for_a_student_reader() -> None:
    # Yêu cầu gốc của user: "hướng dẫn đơn giản, đừng dùng kiến thức quá khó".
    prompt = prompts.build_student_help_prompt(
        course_name="",
        assignment_title="Bài 1",
        instructions=None,
        question=None,
        has_code=False,
        file_names=[],
    )

    assert prompts.STUDENT_HELP_RULE in prompt
    assert "HỌC SINH NHỎ TUỔI" in prompts.STUDENT_HELP_RULE
    assert "không nhắc tới kỹ thuật nâng cao" in prompts.STUDENT_HELP_RULE
    # Được minh họa cú pháp vài dòng, nhưng không viết sẵn lời giải.
    assert "2-3 DÒNG" in prompts.STUDENT_HELP_RULE
    assert "không viết sẵn lời giải" in prompts.STUDENT_HELP_RULE


def test_student_help_does_not_apply_tone_rule() -> None:
    # TONE_RULE là luật chống đại ngôn cho nhận xét gửi PHỤ HUYNH. Ở đây thứ phải
    # kiềm chế là độ khó của kiến thức — trộn hai luật vào nhau là hiểu sai cả hai.
    prompt = prompts.build_student_help_prompt(
        course_name="",
        assignment_title="Bài 1",
        instructions=None,
        question=None,
        has_code=False,
        file_names=[],
    )

    assert prompts.TONE_RULE not in prompt


def test_should_wipe_the_diagnosis_when_the_student_sent_no_code() -> None:
    # Bug THẬT đo được 2026-07-31: dù prompt dặn trả rỗng, Gemini vẫn viết "Em
    # đang ở bước chuẩn bị và chưa biết bắt đầu". Câu đó vô nghĩa với em, và phía
    # web dựa vào `dang_o_dau` rỗng để chọn tiêu đề "CÁC BƯỚC LÀM BÀI".
    data = {
        "dang_o_dau": "Em đang ở bước chuẩn bị và chưa biết bắt đầu",
        "can_sua": ["Chưa có gì để sửa"],
        "cac_buoc": ["Đọc kỹ đề"],
    }

    cleaned = _drop_diagnosis_without_code(dict(data), has_code=False)

    assert cleaned["dang_o_dau"] == ""
    assert cleaned["can_sua"] == []
    # Các bước thì PHẢI giữ — đó là toàn bộ giá trị của lượt hỏi này.
    assert cleaned["cac_buoc"] == ["Đọc kỹ đề"]


def test_should_keep_the_diagnosis_when_the_student_did_send_code() -> None:
    data = {
        "dang_o_dau": "Em khai báo xong 2 biến, chưa tính tổng.",
        "can_sua": ["Dòng 3 chưa lưu kết quả"],
        "cac_buoc": ["Tạo biến giữ kết quả"],
    }

    cleaned = _drop_diagnosis_without_code(dict(data), has_code=True)

    assert cleaned == data


def test_an_image_of_code_is_accepted_as_input() -> None:
    # Học viên hay CHỤP MÀN HÌNH gửi Zalo — ảnh phải qua được tầng schema.
    png = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 32).decode()
    res = client.post(
        "/help-student",
        json={
            "spec_file_path": SPEC_PATH,
            "assignment_title": "Tính tổng",
            "files": [
                {"name": "anh.png", "mime_type": "image/png", "content_b64": png}
            ],
        },
        headers={"X-API-Key": "test-key"},
    )
    # Không phải 422/400: request hợp lệ, chỉ dừng ở bước tải đề từ Storage
    # (không có Supabase thật trong test).
    assert res.status_code not in (400, 401, 422)
