"""Test nhận xét theo chuẩn sư phạm, phân loại 5 môn học (Scratch, Game Maker, App, Web, CS) và chống trùng lặp."""

from app import prompts


def test_detect_course_domain() -> None:
    # 1. Scratch
    assert prompts.detect_course_domain("Khóa học Lập trình Scratch K12") == "scratch"
    # 2. Game Maker
    assert prompts.detect_course_domain("Thiết kế Game Maker 2D") == "gamemaker"
    # 3. App (Python & Qt Designer)
    assert prompts.detect_course_domain("Lập trình App Python Qt Designer") == "app"
    assert prompts.detect_course_domain("Khóa học App") == "app"
    assert prompts.detect_course_domain("Thiết kế ứng dụng PyQt GUI") == "app"
    assert prompts.detect_course_domain("Lập trình Python QtDesign") == "app"
    # 4. Web
    assert prompts.detect_course_domain("Web Frontend HTML CSS JS") == "web"
    # 5. Computer Science
    assert prompts.detect_course_domain("Khoa học máy tính Python cơ bản") == "computer_science"
    assert prompts.detect_course_domain("Toán tư duy") == "general"
    assert prompts.detect_course_domain(None) == "general"


def test_app_course_injects_app_guidelines() -> None:
    prompt = prompts.build_review_prompt(
        student_name="Huy",
        session_title="Buổi 3",
        session_content="Thiết kế giao diện máy tính bỏ túi trên Qt Designer và kết nối nút bấm bằng signal slot",
        strengths=["Thiết kế giao diện cẩn thận"],
        improvements=["Cần lưu ý đặt tên widget rõ ràng"],
        session_context=None,
        previous_comment=None,
        course_name="Lập trình App Python Qt Designer",
        session_number=3,
    )

    assert "PYTHON & QT DESIGNER" in prompt
    assert "Qt Designer" in prompt
    assert "Widget" in prompt
    assert "Signals & Slots" in prompt
    assert "BILINGUAL CLARITY FOR PARENTS" in prompt


def test_scratch_course_injects_scratch_guidelines_and_forbids_typing_code() -> None:
    prompt = prompts.build_review_prompt(
        student_name="Bảo",
        session_title="Buổi 2",
        session_content="Lập trình nhân vật mèo nhảy qua chướng ngại vật",
        strengths=["Tiếp thu nhanh"],
        improvements=["Cần cẩn thận hơn"],
        session_context=None,
        previous_comment=None,
        course_name="Lập trình Scratch",
        session_number=2,
    )

    assert "SCRATCH" in prompt
    assert "khối lệnh" in prompt
    assert "Không dùng các từ 'gõ code'" in prompt
    assert "BILINGUAL CLARITY FOR PARENTS" in prompt
    assert "CONTENT-ANCHORING" in prompt


def test_web_course_injects_web_guidelines() -> None:
    prompt = prompts.build_review_prompt(
        student_name="Linh",
        session_title="Buổi 4",
        session_content="Tạo bố cục trang web cá nhân với Flexbox",
        strengths=["Thẩm mỹ tốt"],
        improvements=["Chưa chú ý căn lề"],
        session_context=None,
        previous_comment=None,
        course_name="Thiết kế Web Frontend",
        session_number=4,
    )

    assert "LẬP TRÌNH WEB" in prompt
    assert "thẻ HTML" in prompt
    assert "CSS" in prompt
    assert "Responsive" in prompt


def test_gamemaker_course_injects_gamemaker_guidelines() -> None:
    prompt = prompts.build_review_prompt(
        student_name="Quân",
        session_title="Buổi 6",
        session_content="Xử lý va chạm nhân vật và thu thập vật phẩm",
        strengths=["Logic game tốt"],
        improvements=["Chưa chỉnh physics mượt"],
        session_context=None,
        previous_comment=None,
        course_name="Lập trình Game Maker",
        session_number=6,
    )

    assert "GAME MAKER" in prompt
    assert "Room" in prompt
    assert "Collision" in prompt


def test_cs_course_injects_computer_science_guidelines() -> None:
    prompt = prompts.build_review_prompt(
        student_name="Đức",
        session_title="Buổi 5",
        session_content="Hàm kiểm tra số nguyên tố",
        strengths=["Tư duy thuật toán tốt"],
        improvements=["Hay quên cú pháp"],
        session_context=None,
        previous_comment=None,
        course_name="Computer Science Python",
        session_number=5,
    )

    assert "KHOA HỌC MÁY TÍNH" in prompt
    assert "thuật toán" in prompt
    assert "variable" in prompt
    assert "debug" in prompt


def test_prompt_forbids_cliche_transitions_and_handles_prior_progression() -> None:
    prompt = prompts.build_review_prompt(
        student_name="An",
        session_title="Buổi 6",
        session_content="Luyện tập hàm",
        strengths=["Chăm chỉ"],
        improvements=["Hay gõ vội"],
        session_context=None,
        previous_comment=None,
        prior_comments=["Buổi 5: Em nắm bài tốt nhưng còn gõ vội."],
        course_name="Python CS",
        session_number=6,
    )

    assert "CẤM CÁC TỪ NỐI RẬP KHUÔN" in prompt
    assert "TIẾN TRÌNH THỜI GIAN VÀ CHỐNG TRÙNG LẶP" in prompt
    assert "giai đoạn giữa khóa (buổi 4-8)" in prompt


def test_project_period_injects_project_name_and_features() -> None:
    prompt = prompts.build_review_prompt(
        student_name="Bảo",
        session_title="Buổi 10",
        session_content="Thực hành làm sản phẩm cuối khóa",
        strengths=[],
        improvements=[],
        session_context=None,
        previous_comment=None,
        course_name="Thiết kế Game Maker 2D",
        session_number=10,
        is_project_period=True,
        project_progress_notes=["Tự vẽ nhân vật chính", "Tư duy logic va chạm tốt"],
        project_name="Mèo Vượt Chướng Ngại Vật",
        project_description="Game vượt chướng ngại vật tính điểm",
        project_features=["Nhảy tránh bẫy", "Nhặt cá vàng tăng điểm"],
    )

    assert "Mèo Vượt Chướng Ngại Vật" in prompt
    assert "Nhặt cá vàng tăng điểm" in prompt
    assert "Tự vẽ nhân vật chính" in prompt
    assert "IN-PROGRESS" in prompt


def test_session_13_positive_completion_guideline() -> None:
    prompt = prompts.build_review_prompt(
        student_name="Bảo",
        session_title="Buổi 13",
        session_content="Hoàn thiện sản phẩm cuối khóa",
        strengths=[],
        improvements=[],
        session_context=None,
        previous_comment=None,
        course_name="Thiết kế Game Maker 2D",
        session_number=13,
        is_project_period=True,
        project_progress_notes=["Đã đóng gói game hoàn chỉnh", "Chạy thử không có lỗi"],
        project_name="Mèo Vượt Chướng Ngại Vật",
        project_description="Game vượt chướng ngại vật",
        project_features=["Nhảy tránh bẫy", "Tính điểm"],
    )

    assert "BUỔI HOÀN THÀNH SẢN PHẨM CUỐI KHÓA" in prompt
    assert "TÍCH CỰC, KHÍCH LỆ VÀ GHI NHẬN THÀNH QUẢ" in prompt
    assert "thuyết trình trước lớp ở buổi 14 Demo Day" in prompt

