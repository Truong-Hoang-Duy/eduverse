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
Input: `{student_name, session_title, session_content, strengths[], improvements[], advice_hint?, previous_comment?, prior_comments[], academic_level?}`
Output: `{comment: string}` — đoạn nhận xét tiếng Việt 3–5 câu, giọng khích lệ,
nêu điểm mạnh trước, điểm cần cải thiện sau, chốt bằng lời khuyên cụ thể.
`academic_level` là NHÃN tiếng Việt (Giỏi/Khá/Trung bình/Cần cố gắng) — CHỈ để
AI chỉnh độ sâu/giọng cho vừa trình độ, prompt cấm nêu thẳng xếp loại cho phụ
huynh (user chốt 2026-07-27). Web gửi nhãn qua `academicLevelLabel()`, không gửi
mã.

### POST /generate-zalo-summary — tin nhắn tóm tắt lớp theo mẫu
Input: `{class_code, session_title, session_content, reviews: [{student_name, strengths[], improvements[]}], template_text}`
Output: `{message: string}` — ghép đúng vào `template_text` (mẫu có placeholder
như `{ten_lop}`, `{buoi}`, `{tom_tat}`, `{loi_nhan}`). GV copy dán vào nhóm
Zalo. `{tom_tat}` có cấu trúc 2 phần cố định — xem AI-SERVICE.md phần "Nguyên
tắc prompt" bên dưới.

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

### POST /help-student — gợi ý cho học viên đang bí (KHÔNG chấm điểm)
Input: giống `/grade-submission` cộng `question`, nhưng **`files` được phép RỖNG**:
```json
{
  "spec_file_path": "<path trong bucket assignment-specs>",
  "files": [],
  "course_name": "JavaScript Basic",
  "assignment_title": "Tính tổng hai số",
  "instructions": null,
  "question": "Em chạy không ra kết quả ạ"
}
```
Output:
```json
{ "dang_o_dau": "", "can_sua": [], "cac_buoc": ["bước 1", "bước 2"] }
```

**Hai chế độ, quyết định bởi ĐẦU VÀO chứ không bởi model:**
- `files` rỗng = em chưa biết bắt đầu → chỉ trả `cac_buoc` (các bước làm bài).
- `files` có = em gửi bài dở → thêm `dang_o_dau` + `can_sua`.

⚠️ `_drop_diagnosis_without_code()` XÓA `dang_o_dau`/`can_sua` khi không có file,
**dù Gemini có trả về hay không**. Đo được 2026-07-31: prompt dặn trả rỗng nhưng
model vẫn viết "Em đang ở bước chuẩn bị và chưa biết bắt đầu". Câu đó vô nghĩa với
em, và web dựa vào `dang_o_dau` rỗng để đặt tiêu đề "CÁC BƯỚC LÀM BÀI" thay vì
"LÀM GÌ TIẾP". Đừng gỡ hàm này để "tin prompt hơn".

**Ảnh chụp màn hình chạy được**: dùng `InlineFile` (base64) như chấm bài, nên
`bytes_to_part` gửi ảnh code / ảnh giao diện dạng nhị phân cho Gemini. Đây là lý
do KHÔNG dùng đường chữ của `/review-project`.

Lỗi: giống `/grade-submission`, trừ việc thiếu `files` KHÔNG phải lỗi.

## Nguyên tắc prompt

- Luôn chỉ định: vai ("giáo viên dạy lập trình cho học sinh"), ngôn ngữ output
  (tiếng Việt), độ dài, và JSON schema.
- **`STUDENT_HELP_RULE` — luật cho prompt DUY NHẤT mà HỌC VIÊN đọc**
  (`/help-student`). Mọi prompt khác viết cho giáo viên hoặc phụ huynh đọc. Luật
  này ghì ĐỘ KHÓ của kiến thức xuống (từ ngữ đơn giản, cấm kỹ thuật nâng cao,
  thuật ngữ bắt buộc thì giải thích ngay), cấm giải hộ cả bài, và chỉ cho phép
  đoạn code minh họa **tối đa 2-3 dòng** để chỉ cú pháp — user chốt 2026-07-31.
  KHÔNG áp `TONE_RULE` ở đây và ngược lại: hai luật giải quyết hai vấn đề khác
  nhau (độ khó vs độ khoa trương), trộn vào nhau là hiểu sai cả hai.
- Xưng hô với học viên: "em" hoặc gọi tên — KHÔNG BAO GIỜ dùng "con" (đã ghi
  trong SYSTEM_ROLE).
- **Giọng điệu nhận xét đúng mực** (`TONE_RULE`, áp cho `/generate-review`,
  `/generate-zalo-summary`, `/generate-student-summary`): cấm từ đại ngôn
  ("tuyệt vời", "xuất sắc", "hoàn hảo", "đỉnh", "siêu", "thiên tài", "phi
  thường"); dùng thang vừa phải ("tốt", "khá", "ổn", "chưa tốt", "cần cố gắng
  thêm"). Khen phải kèm căn cứ cụ thể. KHÔNG áp cho `/grade-submission` và
  `/suggest-features` — không phải prompt nhận xét hành vi/thái độ học viên.
- **`/generate-zalo-summary` — `{tom_tat}` CHỈ chứa danh sách kiến thức**
  (chốt lại LẦN 3 cùng ngày 2026-07-18 — xem lịch sử ở dưới, đừng lặp lại 2
  lần sai trước):
  1. `{tom_tat}`: liệt kê kiến thức, **MỖI Ý XUỐNG DÒNG RIÊNG**, KHÔNG ký tự
     đầu dòng nào ('-', '•', số thứ tự), KHÔNG tự thêm tiêu đề ("Kiến thức đã
     học" hay tương tự — GV tự đặt trong `template_text`), và **KHÔNG kèm bất
     kỳ câu nhận xét/đánh giá nào** — chỉ thuần danh sách.
  2. Đoạn nhận xét chung (văn xuôi liền mạch, không xuống dòng, không bullet)
     về tình hình học tập/thái độ **KHÔNG ép vào `{tom_tat}`** — prompt chỉ
     dặn Gemini tự đọc `template_text`, tìm placeholder có câu dẫn kiểu "đánh
     giá/nhận xét/tình hình học tập" đứng trước, rồi điền đúng chỗ đó. KHÔNG
     hardcode tên biến cụ thể (VD `{loi_nhan}`) trong prompt — mẫu tin của mỗi
     GV có thể đặt tên khác nhau, chỉ ngữ cảnh câu chữ mới đáng tin.
  ⚠️ **Lịch sử 3 lần sửa cùng ngày — đừng lặp lại 2 lần đầu**:
  (1) Đợt 14 thử "toàn văn xuôi, không liệt kê gì" → user không thích, muốn
  phần kiến thức tách bạch dạng liệt kê.
  (2) Đợt 15 sửa thành 2-phần-trong-`{tom_tat}` (liệt kê + văn xuôi cùng chỗ)
  → user báo tiêu đề lặp với mẫu tin họ tự soạn; lúc sửa phát hiện thêm bản
  production còn THIẾU HẲN phần văn xuôi so với commit gốc dù `git log` không
  ghi nhận commit nào xóa nó (nghi 1 lần merge phức tạp, không xác định được
  chính xác — bài học: khi file KHÔNG khớp SESSION_NOTES mô tả, tin vào ĐANG
  ĐỌC THẤY TRÊN ĐĨA, đối chiếu `git show <commit> -- <file>`, đừng cho là đọc
  nhầm rồi bỏ qua) → khôi phục lại 2-phần-trong-`{tom_tat}`.
  (3) NGAY SAU ĐÓ user chỉ ra: mẫu tin thật của họ có mục "Đánh giá chung quá
  trình học tập" RIÊNG, gắn với placeholder KHÁC (`{loi_nhan}`) — 2-phần-trong-
  `{tom_tat}` khiến văn xuôi bị lặp lần nữa với mục đó. → tách hẳn: `{tom_tat}`
  chỉ liệt kê, văn xuôi đi vào placeholder khác theo ngữ cảnh (bản hiện hành).
  (4) User tự tay xóa thêm câu ví dụ few-shot cho đoạn NHẬN XÉT CHUNG ("Ví dụ:
  'Nhìn chung cả lớp học tập khá tốt...'") — câu đó KHÔNG có ghi chú "chỉ minh
  họa, không phải thật" (khác ví dụ liệt kê kiến thức phía trên), nên có rủi
  ro Gemini bắt chước gần giống câu mẫu thay vì tự tổng hợp (2 lần test trước
  đều ra câu khá giống mẫu). Instruction mô tả định dạng vẫn đủ rõ mà không
  cần ví dụ — nếu thêm lại ví dụ few-shot cho đoạn văn xuôi này, NHỚ kèm dòng
  "chỉ minh họa, không phải nội dung thật" như ví dụ liệt kê.
  ⚠️ Khác với `/grade-submission` (nơi UI CHỦ ĐỘNG muốn bullet, chỉ cấm Gemini
  tự thêm ký tự đầu dòng vì UI đã tự thêm) — các chỗ "cấm ký tự đầu dòng" trong
  file này có mục đích khác nhau (bullet UI tự vẽ / liệt kê không dấu), đọc kỹ
  context trước khi sửa.
- Tin Zalo gửi phụ huynh: nhận xét CHUNG cả lớp, không nêu tên/định danh học
  viên nào (nhận xét cá nhân dùng /generate-student-summary gửi riêng).
- Chấm điểm: yêu cầu Gemini đọc đề trước, liệt kê yêu cầu, rồi đối chiếu code;
  điểm khắt khe (thang 100) nhưng nhận xét khích lệ, phù hợp học viên nhỏ tuổi.
  Nhận xét NGẮN GỌN dạng gạch đầu dòng, không lời chào, không nhắc tên.
- Không đưa dữ liệu cá nhân vào prompt.
