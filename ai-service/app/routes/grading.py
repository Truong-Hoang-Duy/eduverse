from fastapi import APIRouter

from app import prompts
from app.gemini import generate_json
from app.schemas import GradeSubmissionRequest, GradeSubmissionResponse
from app.storage import download_as_part

router = APIRouter()

SPEC_BUCKET = "assignment-specs"
SUBMISSION_BUCKET = "submissions"

GRADING_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {"type": "integer", "minimum": 0, "maximum": 100},
        "criteria_breakdown": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "criterion": {"type": "string"},
                    "score": {"type": "integer"},
                    "max": {"type": "integer"},
                },
                "required": ["criterion", "score", "max"],
            },
        },
        "comment": {"type": "string"},
    },
    "required": ["score", "criteria_breakdown", "comment"],
}


@router.post("/grade-submission", response_model=GradeSubmissionResponse)
def grade_submission(body: GradeSubmissionRequest) -> GradeSubmissionResponse:
    # File đầu tiên là đề bài, các file sau là bài làm (thứ tự khớp với prompt).
    file_parts = [download_as_part(SPEC_BUCKET, body.spec_file_path)]
    file_parts += [
        download_as_part(SUBMISSION_BUCKET, path) for path in body.code_file_paths
    ]

    prompt = prompts.build_grading_prompt(
        course_name=body.course_name,
        assignment_title=body.assignment_title,
        instructions=body.instructions,
        student_name=body.student_name,
    )
    data = generate_json(prompt, response_schema=GRADING_SCHEMA, file_parts=file_parts)
    return GradeSubmissionResponse(**data)
