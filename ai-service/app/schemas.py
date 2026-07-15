from typing import Literal

from pydantic import BaseModel, Field


class AiRequest(BaseModel):
    """Mọi request AI đều có thể kèm key riêng của người dùng.

    None → ai-service dùng key mặc định trong biến môi trường.
    """

    api_key: str | None = None


# ---------- /generate-review ----------
class GenerateReviewRequest(AiRequest):
    student_name: str
    session_title: str
    session_content: str = ""
    strengths: list[str] = []
    improvements: list[str] = []
    advice_hint: str | None = None
    previous_comment: str | None = None


class GenerateReviewResponse(BaseModel):
    comment: str


# ---------- /generate-zalo-summary ----------
class StudentReviewItem(BaseModel):
    student_name: str
    strengths: list[str] = []
    improvements: list[str] = []


class ZaloSummaryRequest(AiRequest):
    class_code: str
    session_title: str
    session_content: str = ""
    reviews: list[StudentReviewItem] = []
    template_text: str


class ZaloSummaryResponse(BaseModel):
    message: str


# ---------- /generate-student-summary ----------
class SessionReviewItem(BaseModel):
    session_number: int
    session_title: str = ""
    strengths: list[str] = []
    improvements: list[str] = []
    advice: str | None = None
    comment: str | None = None


class StudentSummaryRequest(AiRequest):
    student_name: str
    class_code: str = ""
    course_name: str = ""
    reviews: list[SessionReviewItem]


class StudentSummaryResponse(BaseModel):
    qua_trinh_hoc: str
    diem_manh: str
    diem_yeu: str
    dinh_huong: str
    kho_khan: str


# ---------- /suggest-features ----------
class SuggestFeaturesRequest(AiRequest):
    project_name: str
    description: str = ""
    existing_features: list[str] = []
    course_code: str = ""


class FeatureSuggestion(BaseModel):
    name: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]


class SuggestFeaturesResponse(BaseModel):
    suggestions: list[FeatureSuggestion]


# ---------- /grade-submission ----------
class InlineFile(BaseModel):
    """File bài làm gửi thẳng nội dung — KHÔNG lưu ở Storage."""

    name: str
    mime_type: str | None = None
    content_b64: str


class GradeSubmissionRequest(AiRequest):
    spec_file_path: str  # đề bài (bucket assignment-specs) — thứ duy nhất được lưu
    files: list[InlineFile] = Field(min_length=1)
    course_name: str
    assignment_title: str
    instructions: str | None = None


class GradeSubmissionResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    bullets: list[str] = Field(min_length=1)
