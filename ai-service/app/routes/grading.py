import base64
import binascii

from fastapi import APIRouter, HTTPException

from app import prompts
from app.gemini import generate_json
from app.schemas import GradeSubmissionRequest, GradeSubmissionResponse
from app.storage import bytes_to_part, download_as_part

router = APIRouter()

SPEC_BUCKET = "assignment-specs"

GRADING_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {"type": "integer", "minimum": 0, "maximum": 100},
        "bullets": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["score", "bullets"],
}


@router.post("/grade-submission", response_model=GradeSubmissionResponse)
def grade_submission(body: GradeSubmissionRequest) -> GradeSubmissionResponse:
    # Đề bài lấy từ Storage (được lưu); bài làm gửi inline, không lưu ở đâu cả.
    file_parts = [download_as_part(SPEC_BUCKET, body.spec_file_path)]
    for f in body.files:
        try:
            data = base64.b64decode(f.content_b64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise HTTPException(
                status_code=400, detail=f"File không hợp lệ: {f.name}"
            ) from exc
        file_parts.append(bytes_to_part(f.name, data, f.mime_type))

    prompt = prompts.build_grading_prompt(
        course_name=body.course_name,
        assignment_title=body.assignment_title,
        instructions=body.instructions,
    )
    data = generate_json(
        prompt,
        response_schema=GRADING_SCHEMA,
        file_parts=file_parts,
        api_key=body.api_key,
    )
    return GradeSubmissionResponse(**data)
