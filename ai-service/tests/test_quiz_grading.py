"""Test chấm phần TRẮC NGHIỆM của buổi 5/9/14 — KHÔNG gọi Gemini thật.

Rủi ro lớn nhất của tính năng này không phải chấm hụt, mà là **chấm bịa**: model
tự nghĩ ra câu hỏi/đáp án rồi giáo viên gửi thẳng cho học viên. Vì thế phần lớn
test dưới đây canh việc KHÔNG có gì lọt ra ngoài chế độ giáo viên đã chọn.
"""

import pytest

from app import prompts
from app.config import get_settings
from app.routes.grading import GRADING_SCHEMA, _keep_requested_parts


@pytest.fixture(autouse=True)
def fake_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def full_answer() -> dict:
    return {
        "score": 80,
        "bullets": ["Làm đúng yêu cầu", "Tên biến chưa rõ nghĩa"],
        "quiz": {
            "tong_so": 3,
            "so_dung": 99,  # cố tình sai để xem route có tự tính lại không
            "cau_hoi": [
                {"cau": 1, "dung": True, "em_chon": "A", "dap_an_dung": "A", "giai_thich": ""},
                {"cau": 2, "dung": False, "em_chon": "B", "dap_an_dung": "C", "giai_thich": "Xem lại vòng lặp for"},
                {"cau": 3, "dung": True, "em_chon": "D", "dap_an_dung": "D", "giai_thich": ""},
            ],
        },
    }


# ---------- Chế độ do GIÁO VIÊN chọn, không phải model đoán ----------


def test_practice_only_must_not_leak_a_quiz() -> None:
    # Nguy hiểm nhất: GV chỉ chấm thực hành mà kết quả lòi ra bảng trắc nghiệm
    # model tự bịa — em sẽ tin đó là điểm thật.
    out = _keep_requested_parts(full_answer(), "practice")

    assert out["quiz"] is None
    assert out["score"] == 80
    assert len(out["bullets"]) == 2


def test_quiz_only_must_not_leak_a_practice_score() -> None:
    out = _keep_requested_parts(full_answer(), "quiz")

    assert out["score"] is None
    assert out["bullets"] == []
    assert out["quiz"]["tong_so"] == 3


def test_both_keeps_everything() -> None:
    out = _keep_requested_parts(full_answer(), "both")

    assert out["score"] == 80
    assert out["bullets"]
    assert out["quiz"]["cau_hoi"]


# ---------- Số liệu phải khớp danh sách câu ----------


def test_should_recount_correct_answers_from_the_list() -> None:
    # Model đếm `so_dung` không phải lúc nào cũng khớp — danh sách câu mới là thứ
    # GV và học viên đọc, nên nó là chuẩn.
    out = _keep_requested_parts(full_answer(), "both")

    assert out["quiz"]["so_dung"] == 2
    assert out["quiz"]["tong_so"] == 3


def test_should_keep_zero_when_no_answers_were_found() -> None:
    # Không tìm thấy bài làm trắc nghiệm → prompt bắt trả rỗng. Không được tự
    # nhân bản thành một câu nào.
    empty = {"score": 0, "bullets": [], "quiz": {"tong_so": 0, "so_dung": 0, "cau_hoi": []}}

    out = _keep_requested_parts(empty, "quiz")

    assert out["quiz"]["tong_so"] == 0
    assert out["quiz"]["cau_hoi"] == []


# ---------- Schema + prompt ----------


def test_schema_requires_every_key_of_a_question() -> None:
    question = GRADING_SCHEMA["properties"]["quiz"]["properties"]["cau_hoi"]["items"]

    assert set(question["required"]) == {
        "cau",
        "dung",
        "em_chon",
        "dap_an_dung",
        "giai_thich",
    }


def test_quiz_prompt_points_at_the_answer_key_inside_the_spec() -> None:
    # Đáp án in sẵn trong đề. Không nói rõ thì model tự suy ra đáp án theo hiểu
    # biết của nó — và đề của giáo viên mới là chuẩn.
    prompt = prompts.build_grading_prompt(
        course_name="JavaScript Basic",
        assignment_title="Buổi 5",
        instructions=None,
        mode="quiz",
    )

    assert "ĐÁP ÁN ĐÚNG ĐÃ IN SẴN TRONG ĐỀ BÀI" in prompt
    assert "KHÔNG tự suy ra đáp án" in prompt
    assert "KHÔNG bịa" in prompt
    # Bài làm trắc nghiệm có thể nằm lẫn trong thư mục code của phần thực hành.
    assert "ẢNH CHỤP" in prompt
    assert "lẫn trong thư mục code" in prompt


def test_quiz_only_prompt_does_not_ask_for_a_practice_score() -> None:
    prompt = prompts.build_grading_prompt(
        course_name="", assignment_title="Buổi 5", instructions=None, mode="quiz"
    )

    assert "PHẦN THỰC HÀNH" not in prompt
    assert 'trả "score": 0 và "bullets": []' in prompt


def test_practice_only_prompt_never_asks_for_quiz_grading() -> None:
    prompt = prompts.build_grading_prompt(
        course_name="", assignment_title="Buổi 3", instructions=None, mode="practice"
    )

    # Không có khối HƯỚNG DẪN chấm trắc nghiệm nào...
    assert "PHẦN TRẮC NGHIỆM" not in prompt
    assert "ĐÁP ÁN ĐÚNG ĐÃ IN SẴN" not in prompt
    assert "PHẦN THỰC HÀNH" in prompt
    # ...và nói thẳng là trả bảng rỗng, để model khỏi tự điền cho "đủ" schema.
    assert '"quiz": {"tong_so": 0, "so_dung": 0, "cau_hoi": []}' in prompt


def test_both_mode_keeps_the_two_scores_apart() -> None:
    prompt = prompts.build_grading_prompt(
        course_name="", assignment_title="Buổi 9", instructions=None, mode="both"
    )

    assert "KHÔNG cộng/trừ theo số câu" in prompt


def test_default_mode_is_practice_so_old_calls_keep_working() -> None:
    old = prompts.build_grading_prompt(
        course_name="X", assignment_title="Y", instructions=None
    )
    explicit = prompts.build_grading_prompt(
        course_name="X", assignment_title="Y", instructions=None, mode="practice"
    )

    assert old == explicit
