import base64
import binascii

from fastapi import APIRouter, HTTPException

from google.genai import types

from app import prompts
from app.gemini import generate_json
from app.schemas import (
    GradeSubmissionRequest,
    GradeSubmissionResponse,
    HelpStudentRequest,
    HelpStudentResponse,
    InlineFile,
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
        # Phần trắc nghiệm của buổi 5/9/14. Luôn khai trong schema (model hay bỏ
        # trống khóa không dùng rồi làm hỏng JSON); khóa thừa bị xóa theo `mode`.
        "quiz": {
            "type": "object",
            "properties": {
                "tong_so": {"type": "integer", "minimum": 0},
                "so_dung": {"type": "integer", "minimum": 0},
                "cau_hoi": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "cau": {"type": "integer"},
                            "dung": {"type": "boolean"},
                            "em_chon": {"type": "string"},
                            "dap_an_dung": {"type": "string"},
                            "giai_thich": {"type": "string"},
                        },
                        "required": ["cau", "dung", "em_chon", "dap_an_dung", "giai_thich"],
                    },
                },
            },
            "required": ["tong_so", "so_dung", "cau_hoi"],
        },
    },
    "required": ["score", "bullets", "quiz"],
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

# CỐ Ý không có "score": em đang HỎI BÀI, không nộp bài. `dang_o_dau`/`can_sua`
# rỗng khi em chưa gửi code — vẫn khai `required` để Gemini luôn trả đủ khóa.
STUDENT_HELP_SCHEMA = {
    "type": "object",
    "properties": {
        "dang_o_dau": {"type": "string"},
        "can_sua": _STRING_LIST,
        "cac_buoc": _STRING_LIST,
    },
    "required": ["dang_o_dau", "can_sua", "cac_buoc"],
}

# File vào đầu tiên cho AI đọc trước — hiểu luồng chương trình rồi mới xét chi tiết.
_ENTRY_NAMES = (
    "index.html", "index.js", "main.py", "app.py", "main.js", "app.js",
    "readme.md", "readme.txt",
)


def _inline_parts(files: list[InlineFile]) -> list[types.Part]:
    """Giải base64 rồi bọc thành Part. Ảnh/PDF đi đường nhị phân, code đi đường chữ.

    Gọi TRƯỚC `download_as_part`: đây là kiểm tra rẻ tiền và hoàn toàn cục bộ,
    chạy trước thì file hỏng ra lỗi 400 đúng nghĩa thay vì bị 404 "không tìm thấy
    đề" che mất, và không tốn một lượt gọi Storage vô ích.
    """
    parts = []
    for f in files:
        try:
            data = base64.b64decode(f.content_b64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise HTTPException(
                status_code=400, detail=f"File không hợp lệ: {f.name}"
            ) from exc
        parts.append(bytes_to_part(f.name, data, f.mime_type))
    return parts


def _keep_requested_parts(data: dict, mode: str) -> dict:
    """Giữ đúng những khối GV yêu cầu, bỏ phần thừa model vẫn trả về.

    Cùng lý do với `_drop_diagnosis_without_code`: schema buộc model trả đủ 3
    khóa (bỏ trống khóa hay làm hỏng JSON), nhưng CHẾ ĐỘ là do giáo viên chọn
    chứ không phải do model đoán. Chấm "chỉ thực hành" mà lòi ra bảng trắc
    nghiệm bịa là sai nghiêm trọng — em sẽ tin đó là điểm thật.
    """
    if mode not in ("quiz", "both"):
        data["quiz"] = None
    if mode not in ("practice", "both"):
        data["score"] = None
        data["bullets"] = []

    quiz = data.get("quiz")
    if quiz:
        # Model đếm `so_dung` không phải lúc nào cũng khớp danh sách câu — lấy
        # danh sách làm chuẩn, đó mới là thứ GV và học viên đọc.
        cau_hoi = quiz.get("cau_hoi") or []
        quiz["so_dung"] = sum(1 for c in cau_hoi if c.get("dung"))
        if cau_hoi:
            quiz["tong_so"] = len(cau_hoi)
    return data


@router.post("/grade-submission", response_model=GradeSubmissionResponse)
def grade_submission(body: GradeSubmissionRequest) -> GradeSubmissionResponse:
    # Đề bài lấy từ Storage (được lưu); bài làm gửi inline, không lưu ở đâu cả.
    submission_parts = _inline_parts(body.files)
    file_parts = [download_as_part(SPEC_BUCKET, body.spec_file_path), *submission_parts]

    prompt = prompts.build_grading_prompt(
        course_name=body.course_name,
        assignment_title=body.assignment_title,
        instructions=body.instructions,
        mode=body.mode,
    )
    data = generate_json(
        prompt,
        response_schema=GRADING_SCHEMA,
        file_parts=file_parts,
        api_key=body.api_key,
    )
    return GradeSubmissionResponse(**_keep_requested_parts(data, body.mode))


def _drop_diagnosis_without_code(data: dict, has_code: bool) -> dict:
    """Em chưa gửi code thì XÓA phần chẩn đoán, dù Gemini có trả về hay không.

    Prompt đã dặn trả `dang_o_dau: ""` và `can_sua: []`, nhưng model vẫn viết
    những câu kiểu "Em đang ở bước chuẩn bị và chưa biết bắt đầu" (đo được
    2026-07-31). Câu đó vô nghĩa với em, và tệ hơn: phía web dựa vào `dang_o_dau`
    RỖNG để biết đây là bài mới mà đặt tiêu đề "CÁC BƯỚC LÀM BÀI" thay vì "LÀM GÌ
    TIẾP". Chế độ đã biết chắc từ ĐẦU VÀO (có file hay không), nên ép ở đây chứ
    đừng tin model làm đúng.
    """
    if not has_code:
        data["dang_o_dau"] = ""
        data["can_sua"] = []
    return data


@router.post("/help-student", response_model=HelpStudentResponse)
def help_student(body: HelpStudentRequest) -> HelpStudentResponse:
    """Gợi ý cho học viên đang bí — KHÔNG điểm, không lưu gì.

    `files` rỗng là hợp lệ: đó là ca "em chưa biết bắt đầu từ đâu", chỉ cần đề
    bài. Đây là điểm khác duy nhất về đầu vào so với `/grade-submission`.
    """
    student_parts = _inline_parts(body.files)
    file_parts = [download_as_part(SPEC_BUCKET, body.spec_file_path), *student_parts]

    prompt = prompts.build_student_help_prompt(
        course_name=body.course_name,
        assignment_title=body.assignment_title,
        instructions=body.instructions,
        question=body.question,
        has_code=len(body.files) > 0,
        file_names=[f.name for f in body.files],
    )
    data = generate_json(
        prompt,
        response_schema=STUDENT_HELP_SCHEMA,
        file_parts=file_parts,
        api_key=body.api_key,
    )
    return HelpStudentResponse(**_drop_diagnosis_without_code(data, bool(body.files)))


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
