"""Test gợi ý nội dung buổi học — KHÔNG gọi Gemini thật.

Rủi ro riêng của endpoint này: `sessions.content` được dùng làm NGỮ CẢNH để viết
nhận xét học viên và tin Zalo gửi PHỤ HUYNH. AI tự thêm kiến thức "cho phong phú"
vào đây là báo cho phụ huynh về thứ chưa hề dạy.
"""

import pytest

from app import prompts
from app.config import get_settings


@pytest.fixture(autouse=True)
def fake_env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    monkeypatch.setenv("AI_SERVICE_API_KEY", "test-key")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def build(draft: str = "on vong lap for, day mang 1 chieu, bai tap tinh tong", **over):
    kwargs = {
        "course_name": "JavaScript Basic",
        "class_code": "JSB01",
        "session_number": 5,
        "draft_text": draft,
        "prior_sessions": [],
    }
    kwargs.update(over)
    return prompts.build_session_content_prompt(**kwargs)


def test_should_ask_for_bullets_not_a_paragraph() -> None:
    # User chốt 2026-08-03: gạch đầu dòng, ngắn gọn đúng trọng tâm.
    prompt = build()

    assert "DANH SÁCH GẠCH ĐẦU DÒNG" in prompt
    assert '{"bullets": [' in prompt
    # Câu cũ đòi "1 đoạn ngắn gọn (2-4 câu)" phải biến mất hẳn.
    assert "1 đoạn ngắn gọn" not in prompt


def test_should_forbid_inventing_topics_the_teacher_did_not_mention() -> None:
    # User ban đầu muốn AI "mở rộng thêm chủ đề liên quan", nhưng đã BỎ sau khi
    # biết nội dung này chảy vào nhận xét gửi phụ huynh (2026-08-03).
    prompt = build()

    assert "KHÔNG tự thêm kiến thức" in prompt
    assert "PHỤ HUYNH" in prompt


def test_should_not_let_the_model_add_its_own_bullet_characters() -> None:
    prompt = build()

    assert "hệ thống tự thêm" in prompt


def test_should_pass_the_teacher_notes_through_untouched() -> None:
    prompt = build(draft="day vong lap while, bai tap in bang cuu chuong")

    assert "day vong lap while, bai tap in bang cuu chuong" in prompt


def test_should_include_prior_sessions_so_the_lesson_follows_on() -> None:
    prompt = build(prior_sessions=[(3, "Học biến và kiểu dữ liệu"), (4, "Học if/else")])

    assert "Buổi 3: Học biến và kiểu dữ liệu" in prompt
    assert "Buổi 4: Học if/else" in prompt
    assert "không lặp lại kiến thức đã dạy" in prompt


def test_should_work_without_prior_sessions() -> None:
    prompt = build(prior_sessions=[])

    assert "Nội dung các buổi TRƯỚC" not in prompt


def test_should_not_apply_the_review_tone_rule() -> None:
    # Đây là mô tả giáo án cho GV, không phải nhận xét gửi phụ huynh.
    assert prompts.TONE_RULE not in build()


def test_empty_draft_with_prior_sessions_asks_the_model_to_propose_content() -> None:
    # User chốt 2026-08-28: để trống ghi chú vẫn tạo được, MIỄN LÀ có buổi
    # trước để AI nối tiếp — nhánh NGƯỢC hẳn với "cấm bịa" khi có ghi chú.
    prompt = build(
        draft="",
        prior_sessions=[(1, "Học biến và kiểu dữ liệu"), (2, "Học vòng lặp for")],
    )

    assert "CHƯA ghi ý muốn dạy" in prompt
    assert "Dựa HOÀN TOÀN vào tiến trình các buổi TRƯỚC" in prompt
    assert "Ghi chú thô của giáo viên cho buổi này:" not in prompt


def test_draft_given_still_forbids_inventing_new_topics() -> None:
    # Nhánh có ghi chú giữ nguyên luật cấm cũ — đừng để nới lỏng ở nhánh rỗng
    # lan sang nhánh có ghi chú.
    prompt = build(draft="day vong lap for")

    assert "TUYỆT ĐỐI KHÔNG tự thêm kiến thức/chủ đề mới" in prompt


def test_should_encourage_concise_bullet_headings_not_long_descriptions() -> None:
    prompt = build()

    assert "CHỈ LIỆT KÊ CÁC ĐẦU MỤC SẼ HỌC" in prompt
    assert "ĐẦU MỤC ngắn gọn, súc tích" in prompt
    assert "TUYỆT ĐỐI KHÔNG viết thành câu văn hay đoạn mô tả dài dòng" in prompt


def test_should_forbid_student_pronoun_em_in_session_content() -> None:
    prompt = build()

    assert "TUYỆT ĐỐI KHÔNG dùng các từ 'em'" in prompt
    # Không áp SYSTEM_ROLE xưng 'em' của phần nhận xét
    assert prompts.SYSTEM_ROLE not in prompt

