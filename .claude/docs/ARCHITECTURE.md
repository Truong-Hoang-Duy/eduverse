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
│                        # grade-submission, review-project (sản phẩm cuối khóa)
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
- **AI nhận xét:** GV tick điểm mạnh/cải thiện → Server Action gửi ngữ cảnh buổi học
  → ai-service `/generate-review` → GV sửa → lưu `student_reviews`.
- **Hồ sơ HV xuyên khóa:** bấm tên HV trong lớp → timeline nhận xét gốc từng buổi
  (`student_reviews` + `sessions`) + AI tổng hợp toàn khóa. Chỉ GV của lớp (RLS).
- **Chấm bài AI (công cụ độc lập, KHÔNG theo lớp) — 2 tab chung nav "Chấm bài":**
  - *Bài tập hàng ngày* (`/teacher/assignments`): đề thuộc course + session_number,
    file đề lưu Storage — **thứ duy nhất toàn hệ thống được lưu**. GV chọn đề →
    nạp file bài làm 1 học sinh → **inline base64** → `/grade-submission` → trả
    `{score, bullets}` để copy.
  - *Sản phẩm cuối khóa* (`/teacher/assignments/project`): **KHÔNG đề bài, KHÔNG
    điểm** → `/review-project` trả `{diem_manh, can_cai_thien, goi_y}`. File gửi
    dạng CHỮ (không base64) vì đã lọc bỏ nhị phân.
  - **Đầu vào cả 2 tab:** file lẻ / kéo thả / **cả thư mục** (`webkitGetAsEntry` +
    `webkitdirectory`) / **.zip giải nén ở SERVER** (`lib/zip.ts` bằng `node:zlib`,
    không thêm dependency). Luật lọc rác + ngân sách: `lib/submission-files.ts`
    (nguồn DUY NHẤT); phần giải nén dùng chung `lib/zip-submission.ts`.
  - **Không ghi DB, KHÔNG lưu file bài làm** — đã kiểm chứng: cả web chỉ có 1 lệnh
    `.upload()` (file đề), ai-service không có lệnh ghi nào; `e2e-phase3` canh số
    object trong bucket không đổi khi chấm.

## Điểm dễ nhầm (gotchas)

- `courses` (JSB) ≠ `classes` (JSB01): đề bài gắn course, học viên gắn class.
- Render free ngủ sau 15 phút → request AI đầu tiên có thể chờ 30–60s (cold start).
- `GET /health` của ai-service trả `{"status","commit"}` — `commit` là 7 ký tự của
  `RENDER_GIT_COMMIT`, so với `git log --oneline -1 main` để biết Render đã deploy
  bản mới chưa (không cần dashboard). `"local"` khi chạy máy dev.
- Gemini free tier hiện chỉ **20 lượt/ngày** cho `gemini-3.6-flash` → E2E gọi AI
  không chạy được tùy ý. Đừng hardcode con số hạn mức vào thông báo.
- Supabase free pause project sau 7 ngày không hoạt động.
- Storage KHÔNG cascade như FK — xóa dòng có file phải xóa file tay (`spec-storage.ts`).
