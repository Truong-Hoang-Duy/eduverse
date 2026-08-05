# ARCHITECTURE.md — Bản đồ kiến trúc Eduverse

> Chỉ là bản đồ, giữ <60 dòng. Schema chi tiết → DATABASE.md; AI → AI-SERVICE.md.

## Sơ đồ tổng quan

```
┌─────────────────────┐      ┌──────────────────────┐
│  web/  Next.js 15   │──────│  Supabase            │
│  (Vercel, free)     │      │  - PostgreSQL + RLS  │
│  - UI + Server      │      │  - Auth (username)   │
│    Actions          │      │  - Storage (đề bài)  │
└────────┬────────────┘      └──────────────────────┘
         │ HTTP, header
         │ X-API-Key
┌────────▼────────────┐      ┌──────────────────────┐
│  ai-service/        │──────│  Google Gemini API   │
│  Python FastAPI     │      │  gemini-flash-latest │
│  (Render, free)     │      │  (free tier)         │
└─────────────────────┘      └──────────────────────┘
```

## Cấu trúc thư mục chính

```
web/src/
├── app/(auth)/          # login, signup (student + teacher-invite)
├── app/(teacher)/       # GV: courses+classes (+ hồ sơ HV), sessions, assignments
│                        #     (chấm bài), gallery (sản phẩm HV), settings,
│                        #     admin (vận hành — chỉ ADMIN_USERNAMES)
├── app/(student)/       # HV: /student = danh sách lớp; 3 tab nằm TRONG từng lớp:
│                        #     classes/[classId]/{projects,gallery,guide}
├── components/          # dùng chung: app-shell/nav/footer, page-header, stat-card,
│                        # confirm-dialog, theme-toggle, drive-link-chip, project-card,
│                        # page-skeleton, nav-link-label, gallery/
├── components/ui/       # shadcn/ui
├── lib/supabase/        # client (browser/server), admin (service key), database.types.ts
├── lib/get-profile.ts   # requireProfile/requireRole (bọc cache() — 1 lượt/request)
├── lib/file-check.ts    # chặn file bị DLP mã hóa trước khi upload
├── lib/spec-storage.ts  # dọn file đề trong Storage khi xóa (Storage KHÔNG cascade)
├── lib/zip.ts           # đọc ZIP bằng node:zlib (docx + bài làm .zip), server-only
├── lib/submission-files.ts # nguồn DUY NHẤT: lọc rác + ngân sách file bài làm
├── lib/drive-url.ts     # validate + rút gọn CÁCH HIỂN THỊ link Drive của HV
├── lib/admin-access.ts  # ai vào được /teacher/admin (ADMIN_USERNAMES, fail closed)
├── lib/admin-report.ts  # số liệu + dò dữ liệu hỏng cho trang vận hành
└── lib/ai-client.ts     # gọi ai-service, duy nhất nơi biết AI_SERVICE_API_KEY
ai-service/app/
├── main.py              # FastAPI app + auth middleware
├── routes/              # review, student-summary, zalo-summary, suggest-features,
│                        # grade-submission (có mode quiz/practice/both),
│                        # review-project, help-student (gợi ý cho HV đang bí)
├── prompts.py           # toàn bộ prompt Gemini
└── schemas.py           # Pydantic models
supabase/migrations/     # SQL schema + RLS (dán tay vào SQL Editor — mạng chặn 5432)
```

## Ranh giới & quy tắc phụ thuộc

- Phân quyền thật nằm ở RLS (Postgres); UI check chỉ để trải nghiệm.
- ⚠️ **RLS giới hạn DÒNG, không giới hạn CỘT.** Cột nào người dùng không được sửa
  thì phải dùng `grant update (cột)` — `profiles.role`/`username` đã bị lợi dụng
  để tự nâng quyền (mig `20260731030000`). Xem DECISIONS.md.
- ⚠️ **Ràng buộc dữ liệu (độ dài, scheme URL) phải có CHECK ở DB**, không chỉ trong
  Server Action: RLS cho người dùng ghi thẳng dòng của mình qua REST API, bỏ qua
  action (mig `20260731010000`, `20260731020000`).
- ⚠️ **`teacher_id = auth.uid()` KHÔNG có nghĩa là "giáo viên"** — policy của bảng
  GV phải kèm `public.is_teacher()`.
- **Ngoại lệ duy nhất: khu `/teacher/admin`** chạy bằng service-role nên KHÔNG có
  RLS đỡ — mọi action ở đó phải tự kiểm quyền ngay dòng đầu (`denyIfNotAdmin`).
- Chỉ server-side của Next.js gọi ai-service; browser không bao giờ có X-API-Key.
- ai-service stateless, không giữ DB connection — đọc file đề qua Supabase Storage
  bằng service key; không ghi gì (chấm bài trả kết quả inline).

## Luồng quan trọng

- **Đăng ký học viên:** signup + nhập `class_code` (VD JSB01) → tạo profile role=student
  → tạo enrollment vào lớp có mã đó. ⚠️ Trigger `handle_new_user` ĐÒI `class_code`
  cho role=student; thiếu thì admin API trả 500 với message rỗng, không nói thiếu gì.
- **Khu học viên chia THEO LỚP:** `/student` = danh sách lớp →
  `/student/classes/[classId]/{projects,gallery,guide}`. Route phẳng cũ redirect về
  `/student`. Sản phẩm/gallery query theo đúng `class_id` (HV học nhiều lớp không
  thấy trộn lẫn).
- **Link Drive nộp bài của học viên:** bảng `student_drive_links`, MỘT link/HV dùng
  mọi lớp. RLS: chính chủ toàn quyền; GV của lớp em học + **bạn cùng lớp** chỉ
  SELECT; ngoài lớp không thấy gì. Đặt bảng riêng vì `profiles` bị bạn cùng lớp đọc
  được — cùng lý do đã tách `user_secrets`.
- **Đánh vắng:** tick là LƯU LUÔN (không đợi nút Lưu). `isHandled = đã nhận xét
  HOẶC vắng` → em rời bộ lọc "Chưa hoàn thành" và bị loại khỏi tin Zalo. Lưu vắng
  XÓA SẠCH nhận xét cũ của buổi đó.
- **AI nhận xét:** GV tick điểm mạnh/cải thiện → Server Action gửi ngữ cảnh buổi học
  → ai-service `/generate-review` → GV sửa → lưu `student_reviews`.
- **Hồ sơ HV xuyên khóa:** bấm tên HV trong lớp → timeline nhận xét gốc từng buổi
  (`student_reviews` + `sessions`) + AI tổng hợp toàn khóa. Chỉ GV của lớp (RLS).
- **Chấm bài AI (công cụ độc lập, KHÔNG theo lớp) — 3 tab chung nav "Chấm bài":**
  - *Bài tập hàng ngày* (`/teacher/assignments`): đề thuộc course + session_number,
    file đề lưu Storage — **thứ duy nhất toàn hệ thống được lưu**. GV chọn đề →
    nạp file bài làm 1 học sinh → **inline base64** → `/grade-submission` → trả
    `{score, bullets, quiz}` để copy. Buổi 5/9/14 có **trắc nghiệm**: GV tick
    "Chọn phần" → `mode` quiz/practice/both; đáp án lấy từ CHÍNH file đề, hai
    điểm hiển thị TÁCH BẠCH.
  - *Sản phẩm cuối khóa* (`/teacher/assignments/project`): **KHÔNG đề bài, KHÔNG
    điểm** → `/review-project` trả `{diem_manh, can_cai_thien, goi_y}`. File gửi
    dạng CHỮ (không base64) vì đã lọc bỏ nhị phân.
  - *Hỏi bài* (`/teacher/assignments/help`): đề bài (+ code/ảnh của em nếu có) →
    `/help-student` trả `{dang_o_dau, can_sua, cac_buoc}`. **KHÔNG điểm.** Chỗ
    DUY NHẤT văn bản AI sinh ra được HỌC VIÊN đọc → có `STUDENT_HELP_RULE` riêng.
  - **Đầu vào cả 3 tab:** file lẻ / kéo thả / **cả thư mục** (`webkitGetAsEntry` +
    `webkitdirectory`) / **.zip giải nén ở SERVER** (`lib/zip.ts` bằng `node:zlib`,
    không thêm dependency). Luật lọc rác + ngân sách: `lib/submission-files.ts`
    (nguồn DUY NHẤT); phần giải nén dùng chung `lib/zip-submission.ts`. Toàn bộ
    state + UI nhận file dùng chung `lib/use-submission-picker.ts` +
    `components/submission/` — 4 khác biệt nghiệp vụ (lọc, ngân sách, kiểu item,
    hàm giải nén) là THAM SỐ, xem DECISIONS.md trước khi gộp thêm.
  - **Không ghi DB, KHÔNG lưu file bài làm** — đã kiểm chứng: cả web chỉ có 1 lệnh
    `.upload()` (file đề), ai-service không có lệnh ghi nào; `grading.e2e.ts` canh
    số object trong bucket không đổi khi chấm.

- **Hai loại E2E, đừng trộn** (từ Đợt 41): `web/e2e/*.e2e.ts` (`pnpm test:e2e`)
  **gọi THẲNG thân Server Action** — stub `next/headers` bằng `CookieJar` giữ
  session THẬT nên RLS còn hiệu lực, không mock Supabase. Còn `scripts/e2e-*.mjs`
  gọi REST trần để **giả lập kẻ tấn công**, CỐ Ý bỏ qua code app — đừng chuyển
  chúng sang gọi action.
  🔴 Cả hai loại đều **không phủ lớp React bọc quanh action**. Đợt 47 dính đúng
  khe đó: thiếu `startTransition` khi gọi thẳng hàm của `useActionState` làm lỗi
  đỏ hiện ngay khi bấm, trong khi 10/10 ca E2E vẫn xanh. **E2E xanh ≠ UI chạy
  được** — thay đổi có đụng UI thì vẫn phải bấm thử.

## Điểm dễ nhầm (gotchas)

- `courses` (JSB) ≠ `classes` (JSB01): đề bài gắn course, học viên gắn class.
- Render free ngủ sau 15 phút → request AI đầu tiên có thể chờ 30–60s (cold start).
- `GET /health` của ai-service trả `{"status","commit"}` — `commit` là 7 ký tự của
  `RENDER_GIT_COMMIT`, so với `git log --oneline -1 main` để biết Render đã deploy
  bản mới chưa (không cần dashboard). `"local"` khi chạy máy dev.
- Gemini free tier hiện chỉ **20 lượt/ngày** cho `gemini-3.6-flash` → E2E gọi AI
  không chạy được tùy ý. Đừng hardcode con số hạn mức vào thông báo.
  Hạn mức tính theo **Google Cloud PROJECT, không theo key** — key mới trong cùng
  project vẫn chung hạn mức đã cạn.
- **Model không phải lúc nào cũng tuân prompt.** Thứ đã biết chắc từ ĐẦU VÀO thì
  ép ở server, đừng tin model giữ đúng (`_drop_diagnosis_without_code`,
  `_keep_requested_parts` trong `routes/grading.py` là 2 ví dụ đang chạy).
- Supabase free pause project sau 7 ngày không hoạt động.
- Storage KHÔNG cascade như FK — xóa dòng có file phải xóa file tay (`spec-storage.ts`).
