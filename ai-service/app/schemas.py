from typing import Literal

from pydantic import BaseModel, Field


class AiRequest(BaseModel):
    """Mọi request AI đều có thể kèm provider + key riêng của người dùng.

    provider mặc định "gemini". api_key None → ai-service dùng key mặc định
    trong biến môi trường — CHỈ áp dụng cho Gemini. OpenAI KHÔNG có key hệ
    thống trong bất kỳ trường hợp nào (xem app/openai_client.py); web đã chặn
    gọi sang đây khi provider="openai" mà chưa có key, route vẫn tự chặn lại
    (app/openai_client.py) phòng khi web có bug.
    """

    api_key: str | None = None
    provider: Literal["gemini", "openai"] = "gemini"


# ---------- /generate-greeting ----------
class GenerateGreetingRequest(AiRequest):
    course_name: str
    class_code: str
    teacher_name: str


class GenerateGreetingResponse(BaseModel):
    greeting: str


# ---------- /generate-review ----------
class GenerateReviewRequest(AiRequest):
    student_name: str
    session_title: str
    session_content: str = ""
    strengths: list[str] = []
    improvements: list[str] = []
    # Bối cảnh buổi học GV gõ 1 lần cho cả buổi (VD: hôm nay kiểm tra) — CHỈ để
    # AI tham khảo, không phải nội dung nhận xét.
    session_context: str | None = None
    # Buổi có kiểm tra định kỳ — tách nhận xét thành 2 phần (học tập / kiểm
    # tra) thay vì một đoạn văn. Xem prompts.py.
    is_periodic_test: bool = False
    # Quan sát của GV về quá trình làm bài kiểm tra — CHỈ dùng khi
    # is_periodic_test, KHÔNG lưu ở DB (chọn lại mỗi lần tạo nhận xét).
    test_process_notes: list[str] = []
    # Buổi có làm sản phẩm cuối khóa (SPCK, thường buổi 9-13) — GV tự đánh dấu,
    # giống is_periodic_test. Xem prompts.py.
    is_project_period: bool = False
    # Quan sát của GV về quá trình làm SPCK — CHỈ dùng khi is_project_period,
    # KHÔNG lưu ở DB (giống test_process_notes).
    project_progress_notes: list[str] = []
    previous_comment: str | None = None
    prior_comments: list[str] = []
    # Nhãn tiếng Việt của mức xếp loại học lực (Giỏi/Khá/...) — CHỈ để điều
    # chỉnh độ sâu/giọng nhận xét, KHÔNG nêu thẳng cho phụ huynh. Xem prompts.py.
    academic_level: str | None = None


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
    # Lớp chỉ có 1 học viên (dạy kèm 1-1) — đổi cách nhận xét, xem prompts.py.
    is_one_on_one: bool = False


class ZaloSummaryResponse(BaseModel):
    # CHỈ 2 mảnh nội dung ĐỘNG — KHÔNG trả cả tin nhắn hoàn chỉnh. Việc ghép
    # vào mẫu (`{ten_lop}` `{buoi}` `{tom_tat}` `{loi_nhan}`) làm bằng string
    # replace thuần ở web (`lib/actions/zalo.ts`), không qua AI, để mẫu GV đã
    # chọn được giữ NGUYÊN VĂN — không còn rủi ro AI diễn đạt lại cấu trúc/
    # khoảng trắng của mẫu (đổi 2026-09-04, xem DECISIONS.md).
    tom_tat: str
    loi_nhan: str


# ---------- /generate-student-summary ----------
class SessionReviewItem(BaseModel):
    session_number: int
    session_title: str = ""
    strengths: list[str] = []
    improvements: list[str] = []
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


# ---------- /generate-final-presentation-review ----------
class DnlCriterionEvaluation(BaseModel):
    score: int  # 1..5
    level: str  # "TB" | "Khá" | "Giỏi"
    comment: str


class DemoScoreBreakdown(BaseModel):
    computational_thinking: float
    creative_thinking: float
    communication: float
    problem_solving: float
    computer_skills: float
    total: float


class FinalPresentationReviewRequest(AiRequest):
    student_name: str
    class_code: str = ""
    course_name: str = ""
    academic_level: str | None = None
    project_name: str | None = None
    project_description: str | None = None
    project_features: list[str] = []
    presentation_notes: str | None = None
    prior_reviews: list[SessionReviewItem] = []
    current_strengths: list[str] = []
    current_improvements: list[str] = []


class FinalPresentationReviewResponse(BaseModel):
    comment: str
    demo_score: DemoScoreBreakdown
    dnl_evaluations: dict[str, DnlCriterionEvaluation]


# ---------- /suggest-session-content ----------
class PriorSessionItem(BaseModel):
    session_number: int
    content: str


class SuggestSessionContentRequest(AiRequest):
    course_name: str = ""
    class_code: str = ""
    session_number: int
    draft_text: str
    prior_sessions: list[PriorSessionItem] = []


class SuggestSessionContentResponse(BaseModel):
    """Gạch đầu dòng thay vì một đoạn văn (user chốt 2026-08-03).

    Trả MẢNG chứ không phải chuỗi đã ghép sẵn: phía web tự thêm ký tự đầu dòng
    nên định dạng thống nhất với các endpoint khác, và model không thể trả về
    một đoạn văn dài chỉ *trông giống* gạch đầu dòng.
    """

    bullets: list[str] = Field(min_length=1)


# ---------- /suggest-features ----------
class SuggestFeaturesRequest(AiRequest):
    project_name: str
    description: str = ""
    existing_features: list[str] = []
    course_code: str = ""
    desired_difficulty: Literal["easy", "medium", "hard"] | None = None


class FeatureSuggestion(BaseModel):
    name: str
    description: str
    difficulty: Literal["easy", "medium", "hard"]


class SuggestFeaturesResponse(BaseModel):
    suggestions: list[FeatureSuggestion]


# ---------- /health ----------
class HealthResponse(BaseModel):
    """Render dùng để health-check; người vận hành dùng để biết bản đang chạy."""

    status: str
    # 7 ký tự đầu của commit đang chạy, hoặc "local" khi chạy ở máy dev.
    commit: str


# ---------- /grade-submission ----------
class InlineFile(BaseModel):
    """File bài làm gửi thẳng nội dung — KHÔNG lưu ở Storage."""

    name: str
    mime_type: str | None = None
    content_b64: str


GradingMode = Literal["quiz", "practice", "both"]


class GradeSubmissionRequest(AiRequest):
    spec_file_path: str  # đề bài (bucket assignment-specs) — thứ duy nhất được lưu
    files: list[InlineFile] = Field(min_length=1)
    course_name: str
    assignment_title: str
    instructions: str | None = None
    # Buổi 5/9/14 có cả lý thuyết lẫn thực hành. Mặc định "practice" để mọi lời
    # gọi cũ giữ nguyên hành vi.
    mode: GradingMode = "practice"


class QuizAnswer(BaseModel):
    """Một câu trắc nghiệm đã đối chiếu với đáp án in trong ĐỀ BÀI."""

    cau: int
    dung: bool
    # Rỗng khi em bỏ trống câu đó.
    em_chon: str = ""
    dap_an_dung: str = ""
    # Một câu ngắn vì sao sai — chỉ điền cho câu sai.
    giai_thich: str = ""


class QuizResult(BaseModel):
    tong_so: int
    so_dung: int
    cau_hoi: list[QuizAnswer] = Field(default_factory=list)


class GradeSubmissionResponse(BaseModel):
    """Ba khối, khối nào có mặt là do `mode` quyết định (không phải do model).

    `score`/`bullets` cho phần THỰC HÀNH, `quiz` cho phần TRẮC NGHIỆM. Chấm
    trắc nghiệm KHÔNG quy ra thang 100 — user chốt 2026-07-31 là để hai phần
    tách bạch, vì đúng hết trắc nghiệm mà code sai thì điểm gộp sẽ che mất.
    """

    score: int | None = Field(default=None, ge=0, le=100)
    bullets: list[str] = Field(default_factory=list)
    quiz: QuizResult | None = None


# ---------- /review-project ----------
class ProjectFile(BaseModel):
    """Một file trong sản phẩm cuối khóa — gửi thẳng CHỮ, không base64.

    Sản phẩm cuối khóa chỉ nhận file văn bản/code (ảnh và nhị phân đã bị lọc từ
    phía web) nên không cần đường nhị phân như `InlineFile` của chấm bài tập.
    """

    path: str  # đường dẫn tương đối trong project: "js/app.js"
    content: str


class ReviewProjectRequest(AiRequest):
    files: list[ProjectFile] = Field(min_length=1)
    course_name: str = ""
    # Ghi chú của GV thay chỗ "đề bài" — sản phẩm cuối khóa KHÔNG có đề.
    notes: str | None = None


class ReviewProjectResponse(BaseModel):
    """CỐ Ý không có điểm số — sản phẩm cuối khóa chỉ nhận xét (chốt 2026-07-30)."""

    diem_manh: list[str] = Field(min_length=1)
    can_cai_thien: list[str] = Field(min_length=1)
    goi_y: list[str] = Field(default_factory=list)


# ---------- /help-student ----------
class HelpStudentRequest(AiRequest):
    """Gợi ý cho học viên đang bí, KHÔNG chấm điểm.

    Dùng `InlineFile` (base64) chứ không `ProjectFile` (chữ) như sản phẩm cuối
    khóa: học viên hay chụp MÀN HÌNH code hoặc giao diện gửi qua Zalo, mà ảnh thì
    phải đi đường nhị phân.

    `files` được phép RỖNG — đó là ca "em chưa biết bắt đầu từ đâu", chỉ có đề
    bài. Khác `GradeSubmissionRequest` (đòi `min_length=1`) ở đúng chỗ này.
    """

    spec_file_path: str
    files: list[InlineFile] = Field(default_factory=list)
    course_name: str = ""
    assignment_title: str
    instructions: str | None = None
    # Câu hỏi của em, do GV chép lại từ tin nhắn — thường cụ thể hơn nhiều so với
    # những gì đoán được từ code.
    question: str | None = None


class HelpStudentResponse(BaseModel):
    """Ba khối để GV dán thẳng cho học viên.

    `dang_o_dau` và `can_sua` RỖNG khi em chưa gửi code — lúc đó chỉ có
    `cac_buoc` (các bước bắt đầu làm bài). Không tách thành hai response riêng vì
    cùng một câu hỏi của GV, chỉ khác chỗ em đang đứng.
    """

    dang_o_dau: str = ""
    can_sua: list[str] = Field(default_factory=list)
    cac_buoc: list[str] = Field(min_length=1)
