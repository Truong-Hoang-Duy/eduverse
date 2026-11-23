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


def test_review_prompt_forbids_robotic_starters_and_transitions() -> None:
    prompt = prompts.build_review_prompt(
        student_name="Huy",
        session_title="Buổi 3",
        session_content="Thiết kế giao diện máy tính bỏ túi",
        strengths=["Tiếp thu nhanh"],
        improvements=["Cần cẩn thận"],
        session_context=None,
        previous_comment=None,
    )

    assert "CẤM MỞ ĐẦU VĂN MẪU SÁO RỖNG" in prompt
    assert "TUYỆT ĐỐI CẤM mở đầu bằng các từ sáo rỗng, máy móc như 'Đáng khen là...'" in prompt
    assert "'Đáng khen là...', 'Riêng ở phần...'" not in prompt


def test_review_prompt_includes_homework_pedagogy_and_exam_abstraction_rules() -> None:
    prompt = prompts.build_review_prompt(
        student_name="An",
        session_title="Buổi 5",
        session_content="Kiểm tra định kỳ Checkpoint 1",
        strengths=["Nắm vững lý thuyết"],
        improvements=["Chưa làm bài tập về nhà (0/5) bài"],
        session_context="Buổi kiểm tra định kỳ 45 phút",
        previous_comment=None,
        course_name="Computer Science Advance (CSA)",
        session_number=5,
        is_periodic_test=True,
        test_process_notes=["TRẮC NGHIỆM: Đúng 1..10", "THỰC HÀNH: Đã làm sạch cột Price, Câu 1 xe BMW $22,000"],
    )

    assert "HOMEWORK PEDAGOGY RULE" in prompt
    assert "EXAM ABSTRACTION RULE" in prompt
    assert "TUYỆT ĐỐI CẤM TƯỜNG THUẬT VỤN VẶT" in prompt
    assert "KHÔNG dùng từ ngữ mang tính chỉ trích, phán xét nhân cách tiêu cực" in prompt
    assert "khái quát hóa năng lực lý thuyết và kỹ năng thực hành theo chuyên đề bài học" in prompt


def test_review_prompts_strictly_use_thay_and_forbid_co() -> None:
    for is_periodic in (False, True):
        prompt = prompts.build_review_prompt(
            student_name="An",
            session_title="Buổi 5",
            session_content="Kiểm tra định kỳ Checkpoint 1",
            strengths=["Nắm vững lý thuyết"],
            improvements=["Chưa làm bài tập về nhà (0/5) bài"],
            session_context=None,
            previous_comment=None,
            is_periodic_test=is_periodic,
        )
        assert "CHỈ dùng từ 'thầy'" in prompt
        assert "TUYỆT ĐỐI KHÔNG dùng từ 'cô', 'thầy cô' hay 'thầy/cô'" in prompt
        assert "trao đổi với thầy cô" not in prompt
        assert "hỏi thầy cô" not in prompt

    summary_prompt = prompts.build_student_summary_prompt(
        student_name="An",
        class_code="CSA05",
        course_name="Computer Science Advance",
        reviews_text="- Buổi 1: Tiếp thu tốt",
    )
    assert "CHỈ dùng từ 'thầy'" in summary_prompt
    assert "TUYỆT ĐỐI KHÔNG dùng từ 'cô', 'thầy cô' hay 'thầy/cô'" in summary_prompt

    zalo_prompt = prompts.build_zalo_summary_prompt(
        class_code="CSA05",
        session_title="Buổi 1",
        session_content="Làm quen Python",
        reviews_text="- An: tốt",
    )
    assert "CHỈ dùng từ 'thầy'" in zalo_prompt
    assert "TUYỆT ĐỐI KHÔNG dùng từ 'cô', 'thầy cô' hay 'thầy/cô'" in zalo_prompt




def test_zalo_summary_adapts_to_session_formats():
    for fmt, keyword in [
        ("standard", "BUỔI HỌC TIÊU CHUẨN"),
        ("project_period", "LÀM ĐỒ ÁN / SẢN PHẨM CUỐI KHÓA (SPCK)"),
        ("periodic_test", "BÀI KIỂM TRA ĐỊNH KỲ / CHECKPOINT"),
        ("final_presentation", "THUYẾT TRÌNH BÁO CÁO SẢN PHẨM CUỐI KHÓA (DEMO DAY)"),
    ]:
        p = prompts.build_zalo_summary_prompt(
            class_code="CSB01",
            session_title="Buổi kiểm tra",
            session_content="Nội dung",
            reviews_text="- An: tốt",
            session_format=fmt,
        )
        assert keyword in p
        assert "CHỈ dùng từ 'thầy'" in p


def test_review_prompt_includes_individual_student_note():
    prompt = prompts.build_review_prompt(
        student_name="An",
        session_title="Buổi 3",
        session_content="Lập trình hàm và thuật toán sắp xếp",
        strengths=["Tư duy thuật toán tốt"],
        improvements=["Cần chú ý thụt lề code"],
        session_context=None,
        previous_comment=None,
        student_note="Em tự lập trình thêm thuật toán QuickSort mở rộng, rất đam mê",
    )
    assert "Ghi chú riêng của giáo viên về học viên này trong buổi học" in prompt
    assert "Em tự lập trình thêm thuật toán QuickSort mở rộng, rất đam mê" in prompt
    assert "HƯỚNG DẪN XỬ LÝ GHI CHÚ RIÊNG" in prompt


def test_natural_vietnamese_style_rule_injected_in_all_review_prompts() -> None:
    review_prompt = prompts.build_review_prompt(
        student_name="An",
        session_title="Buổi 5",
        session_content="Phân tích dữ liệu bằng biểu đồ",
        strengths=["Chủ động tìm hiểu"],
        improvements=["Cần kiểm tra lại kết quả"],
        session_context=None,
        previous_comment=None,
    )
    summary_prompt = prompts.build_student_summary_prompt(
        student_name="An",
        class_code="CSA05",
        course_name="Computer Science Advance",
        reviews_text="- Buổi 1: Tiếp thu tốt",
    )
    zalo_prompt = prompts.build_zalo_summary_prompt(
        class_code="CSA05",
        session_title="Buổi 5",
        session_content="Phân tích dữ liệu",
        reviews_text="- An: tốt",
    )

    for p in (review_prompt, summary_prompt, zalo_prompt):
        assert "NATURAL VIETNAMESE WRITING" in p
        assert "Bài làm cho thấy em..." in p
        assert "TUYỆT ĐỐI KHÔNG viết 'Bài làm thể hiện em...'" in p

    assert "QUY TẮC RÕ RANH GIỚI & ĐA DẠNG CÂU GIỮA 5 MỤC" in summary_prompt
    assert "như thầy nhắn tin trực tiếp cho nhóm phụ huynh cuối buổi" in zalo_prompt

    # Đảm bảo ví dụ mớm cũ không còn trong build_review_prompt
    assert "Em thể hiện tư duy logic mạch lạc" not in review_prompt


def test_polish_review_phrasing_fixes_awkward_the_hien_and_preserves_valid_vietnamese() -> None:
    from app.routes.reviews import polish_review_phrasing

    assert (
        polish_review_phrasing(
            "Bài làm thể hiện em biết kết hợp nhiều bước phân tích dữ liệu."
        )
        == "Bài làm cho thấy em biết kết hợp nhiều bước phân tích dữ liệu."
    )
    assert (
        polish_review_phrasing(
            "Sản phẩm của em thể hiện rằng em đã nắm chắc kiến thức."
        )
        == "Sản phẩm của em cho thấy em đã nắm chắc kiến thức."
    )
    assert (
        polish_review_phrasing(
            "Bài kiểm tra đã thể hiện rõ em hiểu bản chất thuật toán."
        )
        == "Bài kiểm tra đã cho thấy rõ em hiểu bản chất thuật toán."
    )
    assert (
        polish_review_phrasing(
            "Kết quả thể hiện các em nắm vững nội dung buổi học."
        )
        == "Kết quả cho thấy các em nắm vững nội dung buổi học."
    )
    assert (
        polish_review_phrasing("Qua đó, điều này thể hiện em khá chủ động.")
        == "Qua đó, điều này cho thấy em khá chủ động."
    )

    # Cách dùng tiếng Việt tự nhiên / hợp lệ phải được giữ nguyên
    valid_1 = "Em thể hiện sự tự tin khi thuyết trình trước lớp."
    valid_2 = "Bài làm thể hiện sự cẩn thận và chỉn chu."
    valid_3 = "Em cần kiểm tra email thông báo lịch học."
    assert polish_review_phrasing(valid_1) == valid_1
    assert polish_review_phrasing(valid_2) == valid_2
    assert polish_review_phrasing(valid_3) == valid_3


def test_polish_review_phrasing_fixes_mid_sentence_capitalization_and_preserves_sentence_starts() -> None:
    from app.routes.reviews import polish_review_phrasing

    assert (
        polish_review_phrasing("Em đã vắng 1 buổi ở Buổi 2, vì vậy mạch kiến thức bị gián đoạn.")
        == "Em đã vắng 1 buổi ở buổi 2, vì vậy mạch kiến thức bị gián đoạn."
    )
    assert (
        polish_review_phrasing("Từ Buổi 1 đến Buổi 13, em hoàn thành tốt Sản phẩm cuối khóa.")
        == "Từ buổi 1 đến buổi 13, em hoàn thành tốt sản phẩm cuối khóa."
    )
    assert (
        polish_review_phrasing("Em vắng 1 buổi (Buổi 2) và chưa nộp Bài tập về nhà.")
        == "Em vắng 1 buổi (buổi 2) và chưa nộp bài tập về nhà."
    )
    assert (
        polish_review_phrasing("Ở Buổi 5, em làm tốt trong Bài kiểm tra định kỳ.")
        == "Ở buổi 5, em làm tốt trong bài kiểm tra định kỳ."
    )

    # Đầu câu, đầu dòng, sau dấu chấm, sau gạch đầu dòng và danh từ riêng phải giữ nguyên viết hoa
    keep_1 = "Buổi 2 em nghỉ học. Buổi 3 em đã theo kịp lớp với Python và MindX."
    keep_2 = "Kết quả bài kiểm tra:\n- Bài làm cho thấy em nắm chắc bài.\n- Buổi 5 em rất tập trung."
    assert polish_review_phrasing(keep_1) == keep_1
    assert polish_review_phrasing(keep_2) == keep_2



