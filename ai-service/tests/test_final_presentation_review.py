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

