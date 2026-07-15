from fastapi import APIRouter

from app import prompts
from app.gemini import generate_json
from app.schemas import (
    GenerateReviewRequest,
    GenerateReviewResponse,
    StudentSummaryRequest,
    StudentSummaryResponse,
    ZaloSummaryRequest,
    ZaloSummaryResponse,
)

router = APIRouter()


@router.post("/generate-review", response_model=GenerateReviewResponse)
def generate_review(body: GenerateReviewRequest) -> GenerateReviewResponse:
    prompt = prompts.build_review_prompt(
        student_name=body.student_name,
        session_title=body.session_title,
        session_content=body.session_content,
        strengths=body.strengths,
        improvements=body.improvements,
        advice_hint=body.advice_hint,
        previous_comment=body.previous_comment,
    )
    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {"comment": {"type": "string"}},
            "required": ["comment"],
        },
        api_key=body.api_key,
    )
    return GenerateReviewResponse(**data)


@router.post("/generate-student-summary", response_model=StudentSummaryResponse)
def generate_student_summary(body: StudentSummaryRequest) -> StudentSummaryResponse:
    reviews_text = "\n".join(
        f"- Buổi {r.session_number} ({r.session_title or 'chưa có tiêu đề'}): "
        f"mạnh [{', '.join(r.strengths) or 'chưa ghi'}]; "
        f"cần cải thiện [{', '.join(r.improvements) or 'chưa ghi'}]"
        + (f"; lời khuyên: {r.advice}" if r.advice else "")
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
    )
    return StudentSummaryResponse(**data)


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
        template_text=body.template_text,
    )
    data = generate_json(
        prompt,
        response_schema={
            "type": "object",
            "properties": {"message": {"type": "string"}},
            "required": ["message"],
        },
        api_key=body.api_key,
    )
    return ZaloSummaryResponse(**data)
