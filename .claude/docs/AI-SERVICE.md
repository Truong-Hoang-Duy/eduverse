# AI-SERVICE.md — FastAPI + Gemini

> Nguồn sự thật về endpoint, JSON schema và prompt. Code ở `ai-service/`.

## Cấu hình chung

- **API key theo từng người dùng**: mọi request kế thừa `AiRequest` → có field
  `api_key: str | None`. Có key → dùng key đó (client cache theo key bằng
  `lru_cache`); `None` → dùng `GEMINI_API_KEY` trong env. Phía web,
  `lib/actions/api-key.ts → getMyApiKey()` đọc key của user hiện tại từ bảng
  `user_secrets` và mọi action AI đều truyền vào. Key sai → 400 kèm hướng dẫn;
  hết quota → 503 (message khác nhau tùy dùng key riêng hay key hệ thống).
- Model: **`gemini-flash-latest`** (alias) qua SDK `google-genai` (free tier
  1.500 req/ngày). `gemini-2.5-flash` bị Google khóa với API key mới từ 2026.
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

### POST /generate-student-summary — nhận xét TỔNG HỢP 1 học viên
Input: `{student_name, class_code, course_name, reviews: [{session_number, session_title, strengths[], improvements[], advice?, comment?}]}`
— toàn bộ nhận xét các buổi đã học của em đó trong lớp.
Output: `{qua_trinh_hoc, diem_manh, diem_yeu, dinh_huong, kho_khan}` — 5 mục,
mỗi mục 2-4 câu; UI ghép thành văn bản copy gửi riêng phụ huynh.

### POST /suggest-features — gợi ý tính năng cho sản phẩm học viên
Input: `{project_name, description, existing_features[], course_code}`
Output: `{suggestions: [{name, description, difficulty: easy|medium|hard}]}` —
3–5 tính năng phù hợp trình độ khóa học (JSB = cơ bản, JSI = nâng cao...).

### POST /grade-submission — chấm bài 1 học sinh
Input:
```json
{
  "spec_file_path": "<path trong bucket assignment-specs>",
  "files": [{"name": "bai-lam.js", "mime_type": "text/javascript", "content_b64": "..."}],
  "course_name": "JavaScript Basic",
  "assignment_title": "Tính tổng hai số",
  "instructions": null
}
```
**Đề bài** tải từ Storage (thứ duy nhất được lưu). **Bài làm gửi INLINE base64**
— không qua Storage, không lưu ở đâu. Không có `student_name`.

Output:
```json
{ "score": 85, "bullets": ["ý ngắn 1", "ý ngắn 2", "..."] }
```
Điểm hiện ở ô riêng trên UI; `bullets` là 3-6 ý ngắn (mỗi ý 1-2 câu, không tự
thêm ký tự `-`/`•` — UI tự thêm) để giáo viên copy.

Lỗi: file đề không tồn tại → 404; thiếu `files` → 422; base64 hỏng → 400.

⚠️ **File bị DLP mã hóa**: máy công ty của user có phần mềm mã hóa file, trình
duyệt đọc ra bytes rác ("SECURE FILE : This file is encrypted") và upload lên.
Gemini trả 400 "Unable to process input image" rất khó hiểu. `storage.py` chặn
sớm bằng marker + magic bytes (PNG/JPEG/GIF/PDF) → 400 kèm hướng dẫn tiếng Việt;
`web/src/lib/file-check.ts` chặn thêm ở trình duyệt. Đừng gỡ 2 lớp này.

## Nguyên tắc prompt

- Luôn chỉ định: vai ("giáo viên dạy lập trình cho học sinh"), ngôn ngữ output
  (tiếng Việt), độ dài, và JSON schema.
- Xưng hô với học viên: "em" hoặc gọi tên — KHÔNG BAO GIỜ dùng "con" (đã ghi
  trong SYSTEM_ROLE).
- **Giọng điệu nhận xét đúng mực** (`TONE_RULE`, áp cho `/generate-review`,
  `/generate-zalo-summary`, `/generate-student-summary`): cấm từ đại ngôn
  ("tuyệt vời", "xuất sắc", "hoàn hảo", "đỉnh", "siêu", "thiên tài", "phi
  thường"); dùng thang vừa phải ("tốt", "khá", "ổn", "chưa tốt", "cần cố gắng
  thêm"). Khen phải kèm căn cứ cụ thể. KHÔNG áp cho `/grade-submission` và
  `/suggest-features` — không phải prompt nhận xét hành vi/thái độ học viên.
- Tin Zalo gửi phụ huynh: nhận xét CHUNG cả lớp, không nêu tên/định danh học
  viên nào (nhận xét cá nhân dùng /generate-student-summary gửi riêng).
- Chấm điểm: yêu cầu Gemini đọc đề trước, liệt kê yêu cầu, rồi đối chiếu code;
  điểm khắt khe (thang 100) nhưng nhận xét khích lệ, phù hợp học viên nhỏ tuổi.
  Nhận xét NGẮN GỌN dạng gạch đầu dòng, không lời chào, không nhắc tên.
- Không đưa dữ liệu cá nhân vào prompt.
