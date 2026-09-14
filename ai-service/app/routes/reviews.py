from fastapi import APIRouter

from app import prompts
from app.llm import generate_json
from app.schemas import (
    FinalPresentationReviewRequest,
    FinalPresentationReviewResponse,
    GenerateGreetingRequest,
    GenerateGreetingResponse,
    GenerateReviewRequest,
    GenerateReviewResponse,
    StudentSummaryRequest,
    StudentSummaryResponse,
    SuggestSessionContentRequest,
    SuggestSessionContentResponse,
    ZaloSummaryRequest,
    ZaloSummaryResponse,
)

router = APIRouter()


@router.post("/generate-greeting", response_model=GenerateGreetingResponse)
def generate_greeting(body: GenerateGreetingRequest) -> GenerateGreetingResponse:
    prompt = prompts.build_greeting_prompt(
        course_name=body.course_name,
        class_code=body.class_code,
        teacher_name=body.teacher_name,
    )
    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {"greeting": {"type": "string"}},
            "required": ["greeting"],
        },
        api_key=body.api_key,
        provider=body.provider,
    )
    return GenerateGreetingResponse(**data)


@router.post("/generate-review", response_model=GenerateReviewResponse)
def generate_review(body: GenerateReviewRequest) -> GenerateReviewResponse:
    prompt = prompts.build_review_prompt(
        student_name=body.student_name,
        session_title=body.session_title,
        session_content=body.session_content,
        strengths=body.strengths,
        improvements=body.improvements,
        session_context=body.session_context,
        is_periodic_test=body.is_periodic_test,
        test_process_notes=body.test_process_notes,
        is_project_period=body.is_project_period,
        project_progress_notes=body.project_progress_notes,
        previous_comment=body.previous_comment,
        prior_comments=body.prior_comments,
        academic_level=body.academic_level,
    )
    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {"comment": {"type": "string"}},
            "required": ["comment"],
        },
        api_key=body.api_key,
        provider=body.provider,
    )
    return GenerateReviewResponse(**data)


@router.post("/generate-student-summary", response_model=StudentSummaryResponse)
def generate_student_summary(body: StudentSummaryRequest) -> StudentSummaryResponse:
    reviews_text = "\n".join(
        f"- Buổi {r.session_number} ({r.session_title or 'chưa có tiêu đề'}): "
        f"mạnh [{', '.join(r.strengths) or 'chưa ghi'}]; "
        f"cần cải thiện [{', '.join(r.improvements) or 'chưa ghi'}]"
        + (f"; nhận xét: {r.comment}" if r.comment else "")
        for r in body.reviews
    ) or "(chưa có nhận xét buổi nào)"

    prompt = prompts.build_student_summary_prompt(
        student_name=body.student_name,
        class_code=body.class_code,
        course_name=body.course_name,
        reviews_text=reviews_text,
    )
    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {
                "qua_trinh_hoc": {"type": "string"},
                "diem_manh": {"type": "string"},
                "diem_yeu": {"type": "string"},
                "dinh_huong": {"type": "string"},
                "kho_khan": {"type": "string"},
            },
            "required": [
                "qua_trinh_hoc",
                "diem_manh",
                "diem_yeu",
                "dinh_huong",
                "kho_khan",
            ],
        },
        api_key=body.api_key,
        provider=body.provider,
    )
    return StudentSummaryResponse(**data)


@router.post(
    "/generate-final-presentation-review",
    response_model=FinalPresentationReviewResponse,
)
def generate_final_presentation_review(
    body: FinalPresentationReviewRequest,
) -> FinalPresentationReviewResponse:
    absent_sessions = [r.session_number for r in body.prior_reviews if r.is_absent]
    total_prior = len(body.prior_reviews)
    if total_prior > 0:
        if absent_sessions:
            attendance_summary = (
                f"Có vắng {len(absent_sessions)}/{total_prior} buổi học trước "
                f"(vắng ở Buổi: {', '.join(str(s) for s in absent_sessions)}). "
                f"Việc vắng học này có thể làm gián đoạn kiến thức và ảnh hưởng đến kết quả của em."
            )
        else:
            attendance_summary = (
                f"Đi học đầy đủ {total_prior}/{total_prior} buổi học trước "
                f"(100% chuyên cần, không nghỉ buổi nào). "
                f"Việc đi học chuyên cần, đúng giờ giúp em tiếp thu bài học liền mạch và đạt kết quả tốt."
            )
    else:
        attendance_summary = "Chưa có dữ liệu điểm danh các buổi trước."

    reviews_lines = [
        f"- Buổi {r.session_number} ({r.session_title or 'chưa có tiêu đề'}): "
        + ("[VẮNG HỌC]; " if r.is_absent else "")
        + f"mạnh [{', '.join(r.strengths) or 'chưa ghi'}]; "
        f"cần cải thiện [{', '.join(r.improvements) or 'chưa ghi'}]"
        + (f"; nhận xét: {r.comment}" if r.comment else "")
        for r in body.prior_reviews
    ]

    prior_reviews_text = (
        f"THỐNG KÊ CHUYÊN CẦN: {attendance_summary}\n\n"
        + "CHI TIẾT LỊCH SỬ TỪNG BUỔI:\n"
        + "\n".join(reviews_lines)
    )

    prompt = prompts.build_final_presentation_review_prompt(
        student_name=body.student_name,
        class_code=body.class_code,
        course_name=body.course_name,
        academic_level=body.academic_level,
        project_name=body.project_name,
        project_description=body.project_description,
        project_features=body.project_features,
        presentation_notes=body.presentation_notes,
        prior_reviews_text=prior_reviews_text,
        current_strengths=body.current_strengths,
        current_improvements=body.current_improvements,
        is_exam=body.is_exam,
    )

    criterion_schema = {
        "type": "object",
        "properties": {
            "score": {"type": "integer"},
            "level": {"type": "string", "enum": ["TB", "Khá", "Giỏi"]},
            "comment": {"type": "string"},
        },
        "required": ["score", "level", "comment"],
    }

    demo_score_schema = {
        "type": "object",
        "properties": {
            "knowledge_score": {"type": "number"},
            "computational_thinking": {"type": "number"},
            "creative_thinking": {"type": "number"},
            "communication": {"type": "number"},
            "problem_solving": {"type": "number"},
            "computer_skills": {"type": "number"},
            "demo_total": {"type": "number"},
            "total": {"type": "number"},
        },
        "required": [
            "knowledge_score",
            "computational_thinking",
            "creative_thinking",
            "communication",
            "problem_solving",
            "computer_skills",
            "demo_total",
            "total",
        ],
    }

    dnl_evaluations_schema = {
        "type": "object",
        "properties": {
            "kien_thuc_tu_hoc": criterion_schema,
            "kien_thuc_tai_lop": criterion_schema,
            "ky_nang_giao_tiep": criterion_schema,
            "ky_nang_may_tinh": criterion_schema,
            "ky_nang_giai_quyet_van_de": criterion_schema,
            "tu_duy_sang_tao": criterion_schema,
            "tu_duy_may_tinh": criterion_schema,
            "thai_do_tai_lop": criterion_schema,
            "thai_do_ve_nha": criterion_schema,
        },
        "required": [
            "kien_thuc_tu_hoc",
            "kien_thuc_tai_lop",
            "ky_nang_giao_tiep",
            "ky_nang_may_tinh",
            "ky_nang_giai_quyet_van_de",
            "tu_duy_sang_tao",
            "tu_duy_may_tinh",
            "thai_do_tai_lop",
            "thai_do_ve_nha",
        ],
    }

    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {
                "comment": {"type": "string"},
                "demo_score": demo_score_schema,
                "dnl_evaluations": dnl_evaluations_schema,
            },
            "required": ["comment", "demo_score", "dnl_evaluations"],
        },
        api_key=body.api_key,
        provider=body.provider,
    )

    # Bảo đảm tổng cả điểm kiến thức + demo sản phẩm tự động chia đều không dưới 6.0
    if isinstance(data, dict) and "demo_score" in data:
        ds = data["demo_score"]
        k = float(ds.get("knowledge_score", 3.5))
        d_sub = (
            float(ds.get("computational_thinking", 0))
            + float(ds.get("creative_thinking", 0))
            + float(ds.get("communication", 0))
            + float(ds.get("problem_solving", 0))
            + float(ds.get("computer_skills", 0))
        )
        demo_total = round(d_sub, 1)
        total = round(k + demo_total, 1)

        if total < 6.0:
            # Tự động nâng lên tối thiểu 6.0 và chia đều
            total = 6.0
            k = 3.0
            demo_total = 3.0
            ds["computational_thinking"] = 1.2
            ds["creative_thinking"] = 0.3
            ds["communication"] = 0.6
            ds["problem_solving"] = 0.6
            ds["computer_skills"] = 0.3

        ds["knowledge_score"] = k
        ds["demo_total"] = demo_total
        ds["total"] = total

    return FinalPresentationReviewResponse(**data)


@router.post("/suggest-session-content", response_model=SuggestSessionContentResponse)
def suggest_session_content(
    body: SuggestSessionContentRequest,
) -> SuggestSessionContentResponse:
    prompt = prompts.build_session_content_prompt(
        course_name=body.course_name,
        class_code=body.class_code,
        session_number=body.session_number,
        draft_text=body.draft_text,
        prior_sessions=[(p.session_number, p.content) for p in body.prior_sessions],
    )
    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {
                "bullets": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["bullets"],
        },
        api_key=body.api_key,
        provider=body.provider,
    )
    # Model thỉnh thoảng vẫn tự thêm "-"/"•" dù prompt cấm; cắt ở đây để phía web
    # khỏi ra "- - Ôn vòng lặp".
    data["bullets"] = [
        line.lstrip("-•* \t").strip()
        for line in data.get("bullets", [])
        if line.strip()
    ]
    return SuggestSessionContentResponse(**data)


@router.post("/generate-zalo-summary", response_model=ZaloSummaryResponse)
def generate_zalo_summary(body: ZaloSummaryRequest) -> ZaloSummaryResponse:
    reviews_text = "\n".join(
        f"- {r.student_name}: mạnh [{', '.join(r.strengths) or 'chưa ghi'}], "
        f"cần cải thiện [{', '.join(r.improvements) or 'chưa ghi'}]"
        for r in body.reviews
    ) or "(chưa có nhận xét chi tiết)"

    prompt = prompts.build_zalo_summary_prompt(
        class_code=body.class_code,
        session_title=body.session_title,
        session_content=body.session_content,
        reviews_text=reviews_text,
        is_one_on_one=body.is_one_on_one,
    )
    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {
                "tom_tat": {"type": "string"},
                "loi_nhan": {"type": "string"},
            },
            "required": ["tom_tat", "loi_nhan"],
        },
        api_key=body.api_key,
        provider=body.provider,
    )
    return ZaloSummaryResponse(**data)
