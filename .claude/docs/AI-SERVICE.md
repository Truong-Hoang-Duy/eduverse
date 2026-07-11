# AI-SERVICE.md — FastAPI + Gemini

> Nguồn sự thật về endpoint, JSON schema và prompt. Code ở `ai-service/`.

## Cấu hình chung

- Model: `gemini-2.5-flash` qua SDK `google-genai` (free tier 1.500 req/ngày).
- Auth: mọi endpoint yêu cầu header `X-API-Key` khớp env `AI_SERVICE_API_KEY`.
  Sai/thiếu → 401. Chỉ Next.js server-side biết key này.
- Quota Gemini hết (429) → trả 503 `{"detail": "AI đang bận, thử lại sau ít phút"}`.
- Prompt tập trung tại `app/prompts.py`; output có cấu trúc dùng
  `response_mime_type="application/json"` + `response_schema`.
- Env: `GEMINI_API_KEY`, `AI_SERVICE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
  (chỉ để tải file Storage khi chấm bài).

## Endpoints

### POST /generate-review — nhận xét học viên theo buổi
Input: `{student_name, session_title, session_content, strengths[], improvements[], advice_hint?, previous_comment?}`
Output: `{comment: string}` — đoạn nhận xét tiếng Việt 3–5 câu, giọng khích lệ,
nêu điểm mạnh trước, điểm cần cải thiện sau, chốt bằng lời khuyên cụ thể.

### POST /generate-zalo-summary — tin nhắn tóm tắt lớp theo mẫu
Input: `{class_code, session_title, session_content, reviews: [{student_name, strengths[], improvements[]}], template_text}`
Output: `{message: string}` — đánh giá chung tình hình lớp, ghép đúng vào
`template_text` (mẫu có placeholder như `{ten_lop}`, `{buoi}`, `{tom_tat}`,
`{loi_nhan}`). GV copy dán vào nhóm Zalo.

### POST /suggest-features — gợi ý tính năng cho sản phẩm học viên
Input: `{project_name, description, existing_features[], course_code}`
Output: `{suggestions: [{name, description, difficulty: easy|medium|hard}]}` —
3–5 tính năng phù hợp trình độ khóa học (JSB = cơ bản, JSI = nâng cao...).

### POST /grade-submission — chấm bài 1 học viên
Input: `{spec_file_path, code_file_paths[], course_name, assignment_title, instructions?, student_name}`
— path là đường dẫn trong Supabase Storage; service tự tải về, đề PDF/ảnh đưa
thẳng vào Gemini (multimodal).
Output:
```json
{
  "score": 85,
  "criteria_breakdown": [
    {"criterion": "Đúng yêu cầu đề", "score": 45, "max": 50},
    {"criterion": "Chất lượng code", "score": 25, "max": 30},
    {"criterion": "Sáng tạo", "score": 15, "max": 20}
  ],
  "comment": "nhận xét chi tiết tiếng Việt"
}
```
Tổng max các tiêu chí luôn = 100. Next.js lặp qua từng học viên (1 request/HV)
và hiển thị thanh tiến trình; KHÔNG chấm cả lớp trong 1 request (tránh timeout).

## Nguyên tắc prompt

- Luôn chỉ định: vai ("giáo viên dạy lập trình cho học sinh"), ngôn ngữ output
  (tiếng Việt), độ dài, và JSON schema.
- Chấm điểm: yêu cầu Gemini đọc đề trước, liệt kê yêu cầu, rồi đối chiếu code;
  điểm khắt khe nhưng nhận xét khích lệ, phù hợp học viên nhỏ tuổi.
- Không đưa dữ liệu cá nhân ngoài tên học viên vào prompt.
