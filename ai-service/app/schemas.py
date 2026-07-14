from typing import Literal

from pydantic import BaseModel, Field


# ---------- /generate-review ----------
class GenerateReviewRequest(BaseModel):
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


class ZaloSummaryRequest(BaseModel):
    class_code: str
    session_title: str
    session_content: str = ""
    reviews: list[StudentReviewItem] = []
    template_text: str


class ZaloSummaryResponse(BaseModel):
    message: str


# ---------- /suggest-features ----------
class SuggestFeaturesRequest(BaseModel):
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
class GradeSubmissionRequest(BaseModel):
    spec_file_path: str
    code_file_paths: list[str]
    course_name: str
    assignment_title: str
    instructions: str | None = None
    student_name: str


class CriterionScore(BaseModel):
    criterion: str
    score: int = Field(ge=0)
    max: int = Field(gt=0)


class GradeSubmissionResponse(BaseModel):
    score: int = Field(ge=0, le=100)
    criteria_breakdown: list[CriterionScore]
    comment: str
