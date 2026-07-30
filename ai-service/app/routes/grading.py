import base64
import binascii

from fastapi import APIRouter, HTTPException

from google.genai import types

from app import prompts
from app.gemini import generate_json
from app.schemas import (
    GradeSubmissionRequest,
    GradeSubmissionResponse,
    ReviewProjectRequest,
    ReviewProjectResponse,
)
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

_STRING_LIST = {"type": "array", "items": {"type": "string"}}

# CỐ Ý không có "score" — sản phẩm cuối khóa chỉ nhận xét, không cho điểm.
PROJECT_REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "diem_manh": _STRING_LIST,
        "can_cai_thien": _STRING_LIST,
        "goi_y": _STRING_LIST,
    },
    "required": ["diem_manh", "can_cai_thien", "goi_y"],
}

# File vào đầu tiên cho AI đọc trước — hiểu luồng chương trình rồi mới xét chi tiết.
_ENTRY_NAMES = (
    "index.html", "index.js", "main.py", "app.py", "main.js", "app.js",
    "readme.md", "readme.txt",
)


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


def _entry_first(path: str) -> tuple[int, int, str]:
    """Xếp file vào (index.html, main.py...) lên trước, rồi tới file ở gốc."""
    name = path.rsplit("/", 1)[-1].lower()
    rank = _ENTRY_NAMES.index(name) if name in _ENTRY_NAMES else len(_ENTRY_NAMES)
    return (rank, path.count("/"), path)


@router.post("/review-project", response_model=ReviewProjectResponse)
def review_project(body: ReviewProjectRequest) -> ReviewProjectResponse:
    """Nhận xét sản phẩm cuối khóa: KHÔNG đề bài, KHÔNG điểm, không lưu gì."""
    files = sorted(body.files, key=lambda f: _entry_first(f.path))

    file_parts = [
        types.Part.from_text(text=f"--- File: {f.path} ---\n{f.content}")
        for f in files
    ]

    prompt = prompts.build_project_review_prompt(
        course_name=body.course_name,
        notes=body.notes,
        file_paths=[f.path for f in files],
    )
    data = generate_json(
        prompt,
        response_schema=PROJECT_REVIEW_SCHEMA,
        file_parts=file_parts,
        api_key=body.api_key,
    )
    return ReviewProjectResponse(**data)
