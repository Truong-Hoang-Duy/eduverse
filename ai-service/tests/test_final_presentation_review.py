from app.prompts import build_final_presentation_review_prompt
from app.schemas import (
    DemoScoreBreakdown,
    DnlCriterionEvaluation,
    FinalPresentationReviewRequest,
    FinalPresentationReviewResponse,
    SessionReviewItem,
)


def test_final_presentation_review_prompt_includes_all_rubric_criteria() -> None:
    prompt = build_final_presentation_review_prompt(
        student_name="Nguyễn Văn A",
        class_code="CSI01",
        course_name="Computer Science Intermediate",
        academic_level="Giỏi",
        project_name="Trò chơi phiêu lưu không gian",
        project_description="Game bắn tàu vũ trụ viết bằng Python Pygame",
        project_features=["Điều khiển tàu", "Bắn laser", "Boss cuối", "Âm thanh sống động"],
        presentation_notes="Thuyết trình rất tự tin, demo mượt, trả lời tốt câu hỏi phản biện.",
        prior_reviews_text="- Buổi 1: mạnh [Tư duy tốt]; cần cải thiện [Gõ phím chậm]",
        current_strengths=["Thuyết trình lưu loát", "Sản phẩm hoàn thiện cao"],
        current_improvements=["Cần nói chậm lại một chút"],
    )

    assert "Nguyễn Văn A" in prompt
    assert "CSI01" in prompt
    assert "Trò chơi phiêu lưu không gian" in prompt
    assert "demo_score" in prompt
    assert "computational_thinking" in prompt
    assert "creative_thinking" in prompt
    assert "communication" in prompt
    assert "problem_solving" in prompt
    assert "computer_skills" in prompt
    assert "dnl_evaluations" in prompt
    assert "kien_thuc_tu_hoc" in prompt
    assert "kien_thuc_tai_lop" in prompt
    assert "ky_nang_giao_tiep" in prompt
    assert "ky_nang_may_tinh" in prompt
    assert "ky_nang_giai_quyet_van_de" in prompt
    assert "tu_duy_sang_tao" in prompt
    assert "tu_duy_may_tinh" in prompt
    assert "thai_do_tai_lop" in prompt
    assert "thai_do_ve_nha" in prompt


def test_final_presentation_review_response_schema_validation() -> None:
    demo = DemoScoreBreakdown(
        knowledge_score=4.0,
        computational_thinking=1.8,
        creative_thinking=0.4,
        communication=0.9,
        problem_solving=0.9,
        computer_skills=0.5,
        demo_total=4.5,
        total=8.5,
    )
    dnl_item = DnlCriterionEvaluation(
        score=5,
        level="Giỏi",
        comment="Học viên tiếp thu kiến thức xuất sắc.",
    )
    dnl_evals = {
        "kien_thuc_tu_hoc": dnl_item,
        "kien_thuc_tai_lop": dnl_item,
        "ky_nang_giao_tiep": dnl_item,
        "ky_nang_may_tinh": dnl_item,
        "ky_nang_giai_quyet_van_de": dnl_item,
        "tu_duy_sang_tao": dnl_item,
        "tu_duy_may_tinh": dnl_item,
        "thai_do_tai_lop": dnl_item,
        "thai_do_ve_nha": dnl_item,
    }
    resp = FinalPresentationReviewResponse(
        comment="Em A đã hoàn thành xuất sắc khóa học.",
        demo_score=demo,
        dnl_evaluations=dnl_evals,
    )
    assert resp.demo_score.knowledge_score == 4.0
    assert resp.demo_score.demo_total == 4.5
    assert resp.demo_score.total == 8.5
    assert resp.demo_score.total >= 6.0
    assert len(resp.dnl_evaluations) == 9
    assert resp.dnl_evaluations["kien_thuc_tu_hoc"].score == 5


def test_final_exam_review_prompt_for_session_14() -> None:
    prompt = build_final_presentation_review_prompt(
        student_name="Trần Thị B",
        class_code="JSB01",
        course_name="Javascript Basic",
        academic_level="Khá",
        project_name=None,
        project_description=None,
        project_features=[],
        presentation_notes="Làm bài kiểm tra nghiêm túc, hoàn thành nhanh, tự kiểm tra lại bài trước khi nộp.",
        prior_reviews_text="- Buổi 1: mạnh [Tư duy tốt]; cần cải thiện [Hay quên cú pháp]",
        current_strengths=["Hoàn thành bài sớm", "Tư duy logic tốt"],
        current_improvements=["Cần chú ý lỗi chính tả"],
        is_exam=True,
    )

    assert "Trần Thị B" in prompt
    assert "BÀI KIỂM TRA CUỐI KHÓA" in prompt
    assert "buổi kiểm tra" in prompt
    assert "dnl_evaluations" in prompt
    assert "kien_thuc_tu_hoc" in prompt
    assert "demo_score" in prompt
    assert "CHUYÊN CẦN / ĐI HỌC" in prompt


def test_session_review_item_is_absent_field() -> None:
    item_present = SessionReviewItem(session_number=1, session_title="Buổi 1")
    assert item_present.is_absent is False

    item_absent = SessionReviewItem(session_number=2, session_title="Buổi 2", is_absent=True)
    assert item_absent.is_absent is True


def test_periodic_exam_review_prompt_for_session_5() -> None:
    prompt = build_final_presentation_review_prompt(
        student_name="Nguyễn Văn C",
        class_code="CSI01",
        course_name="Computer Science Intro",
        academic_level="Khá",
        project_name=None,
        project_description=None,
        project_features=[],
        presentation_notes="Tập trung làm bài, hoàn thành tốt các câu hỏi cơ bản.",
        prior_reviews_text="THỐNG KÊ CHUYÊN CẦN: Đi học đầy đủ 4/4 buổi (100%)\n- Buổi 1: mạnh [Hiểu bài]",
        current_strengths=[],
        current_improvements=[],
        is_exam=True,
        is_periodic_exam=True,
        session_number=5,
    )

    assert "Nguyễn Văn C" in prompt
    assert "BÀI KIỂM TRA ĐỊNH KỲ (Buổi 5)" in prompt
    assert "CHƯA PHẢI kết thúc khóa học" in prompt
    assert "nhận xét bài kiểm tra định kỳ gửi phụ huynh" in prompt
    assert "dnl_evaluations" in prompt


def test_detect_course_level() -> None:
    from app.prompts import detect_course_level

    assert detect_course_level("Scratch Basic") == "basic"
    assert detect_course_level("CSB01") == "basic"
    assert detect_course_level("Lập trình Game Maker cơ bản") == "basic"

    assert detect_course_level("Computer Scientist Advance") == "advance"
    assert detect_course_level("CSA05") == "advance"
    assert detect_course_level("Web Nâng cao") == "advance"

    assert detect_course_level("Computer Science Intensive") == "intensive"
    assert detect_course_level("CSI02") == "intensive"
    assert detect_course_level("Scratch Chuyên sâu") == "intensive"


def test_resolve_next_mindx_course_strictly_no_jumping() -> None:
    from app.prompts import resolve_next_mindx_course

    # 1. Scratch
    sc_basic = resolve_next_mindx_course("Scratch Basic")
    assert sc_basic["next_course"] == "Scratch Advance"
    assert sc_basic["is_final_level"] is False

    sc_adv = resolve_next_mindx_course("Scratch Advance")
    assert sc_adv["next_course"] == "Scratch Intensive"
    assert sc_adv["is_final_level"] is False

    sc_int = resolve_next_mindx_course("Scratch Intensive")
    assert "GameMaker" in str(sc_int["next_course"]) or "App" in str(sc_int["next_course"])
    assert sc_int["is_final_level"] is True

    # 2. Computer Science: CSB -> CSA -> CSI
    csb = resolve_next_mindx_course("Computer Science Basic (CSB)")
    assert csb["next_course"] == "Computer Science Advance (CSA)"
    assert csb["is_final_level"] is False

    csa = resolve_next_mindx_course("Computer Scientist Advance")
    assert csa["next_course"] == "Computer Science Intensive (CSI)"
    assert csa["is_final_level"] is False

    csi = resolve_next_mindx_course("CSI01")
    assert "Luyện thi" in str(csi["next_course"]) or "AI" in str(csi["next_course"])
    assert csi["is_final_level"] is True


def test_final_presentation_review_prompt_includes_mindx_letter() -> None:
    prompt = build_final_presentation_review_prompt(
        student_name="Đinh Duy Khôi",
        class_code="CSA05",
        course_name="Computer Scientist Advance",
        academic_level="Giỏi",
        project_name="Hệ thống Quản lý Thư viện Thông minh",
        project_description="Phần mềm quản lý sách viết bằng Python",
        project_features=["Quản lý đầu sách", "Mượn trả sách", "Thống kê"],
        presentation_notes="Thuyết trình rất tự tin, phong thái chững chạc.",
        prior_reviews_text="THỐNG KÊ CHUYÊN CẦN: Đi học đầy đủ 13/13 buổi (100%)",
        current_strengths=["Tư duy thuật toán tốt"],
        current_improvements=["Cần chú ý tối ưu code"],
    )

    assert "mindx_letter" in prompt
    assert "learned_from_mindx" in prompt
    assert "suggestions_from_mindx" in prompt
    assert "future_direction" in prompt
    assert "QUY TẮC CẤM NHẢY CÓC BỘ MÔN" in prompt
    assert "Computer Science Intensive (CSI)" in prompt


