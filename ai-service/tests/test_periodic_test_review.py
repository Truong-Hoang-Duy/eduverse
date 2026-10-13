"""Nhận xét buổi có kiểm tra định kỳ — tách 2 phần thay vì 1 đoạn văn.

GV tự đánh dấu buổi (KHÔNG cứng theo số buổi 5/9/14 — buổi 14 tùy lớp có thể
là thuyết trình sản phẩm thay vì kiểm tra). KHÔNG gọi Gemini thật.
"""

from app import prompts


def build(**over):
    kwargs = {
        "student_name": "An",
        "session_title": "Buổi 5",
        "session_content": "Ôn tập vòng lặp, kiểm tra 15 phút",
        "strengths": ["Tư duy tốt"],
        "improvements": ["Cần cẩn thận hơn"],
        "session_context": None,
        "previous_comment": None,
        "is_periodic_test": False,
        "test_process_notes": None,
        "is_project_period": False,
        "project_progress_notes": None,
    }
    kwargs.update(over)
    return prompts.build_review_prompt(**kwargs)


def test_normal_session_keeps_the_single_paragraph_instruction() -> None:
    prompt = build(is_periodic_test=False)

    assert "3-5 câu" in prompt
    assert "HAI PHẦN TÁCH BIỆT" not in prompt


def test_periodic_test_asks_for_two_separate_bulleted_sections() -> None:
    prompt = build(is_periodic_test=True)

    assert "HAI PHẦN TÁCH BIỆT" in prompt
    assert "Quá trình học tập" in prompt
    assert "Kết quả kiểm tra định kỳ" in prompt
    # Câu 3-5 câu (chế độ buổi thường) không được lẫn vào.
    assert "3-5 câu" not in prompt


def test_periodic_test_includes_teacher_notes_about_the_test() -> None:
    prompt = build(
        is_periodic_test=True,
        test_process_notes=["Làm bài nghiêm túc", "Nộp bài sớm"],
    )

    assert "Làm bài nghiêm túc, Nộp bài sớm" in prompt


def test_periodic_test_without_notes_forbids_inventing_scores() -> None:
    # Chấm bài KHÔNG lưu kết quả (xem CLAUDE.md) nên nếu GV không ghi quan sát
    # nào, model không có điểm số thật để dùng — phải cấm bịa.
    prompt = build(is_periodic_test=True, test_process_notes=None)

    assert "đừng bịa thêm chi tiết cụ thể" in prompt


def test_normal_session_ignores_test_process_notes() -> None:
    # An toàn dữ liệu: nếu web lỡ gửi notes mà không bật is_periodic_test thì
    # vẫn không được lọt vào prompt buổi thường.
    prompt = build(is_periodic_test=False, test_process_notes=["Làm bài tốt"])

    assert "Làm bài tốt" not in prompt


def test_project_period_includes_teacher_notes_about_spck() -> None:
    prompt = build(
        is_project_period=True,
        project_progress_notes=["Tập trung làm bài", "Chưa có ý tưởng"],
    )

    assert "Tập trung làm bài, Chưa có ý tưởng" in prompt
    assert "SPCK" in prompt


def test_project_period_without_notes_omits_the_block() -> None:
    prompt = build(is_project_period=True, project_progress_notes=None)

    assert "SPCK" not in prompt


def test_project_period_does_not_split_into_two_sections() -> None:
    # KHÁC is_periodic_test: SPCK chỉ hòa vào đoạn nhận xét chung, không tách
    # phần riêng — đây là chủ ý (xem prompts.py).
    prompt = build(
        is_periodic_test=False,
        is_project_period=True,
        project_progress_notes=["Tập trung làm bài"],
    )

    assert "HAI PHẦN TÁCH BIỆT" not in prompt
    assert "KHÔNG tách thành mục riêng" in prompt


def test_normal_session_ignores_project_progress_notes_when_flag_is_off() -> None:
    prompt = build(is_project_period=False, project_progress_notes=["Tập trung làm bài"])

    assert "Tập trung làm bài" not in prompt


def test_review_prompt_uses_purpose_instead_of_session_title() -> None:
    # User chốt 2026-10-13: không cần tiêu đề buổi học, chỉ cần biết nội dung và mục đích buổi học.
    prompt_std = build(session_title="Buổi 3: Lập trình game")
    assert "Mục đích buổi học: Buổi học kiến thức và thực hành lập trình" in prompt_std
    assert "Buổi học: Buổi 3: Lập trình game" not in prompt_std

    prompt_project = build(is_project_period=True)
    assert "Mục đích buổi học: Giai đoạn làm dự án / sản phẩm cuối khóa của học viên" in prompt_project

    prompt_test = build(is_periodic_test=True)
    assert "Mục đích buổi học: Buổi kiểm tra định kỳ / đánh giá năng lực học tập" in prompt_test

