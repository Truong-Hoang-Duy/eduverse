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
│                        #     (chấm bài), gallery (sản phẩm HV), settings
├── app/(student)/       # HV: nav "Lớp học" (/student) + 3 tab: projects, gallery, guide
├── components/          # dùng chung: app-shell/nav/footer, page-header, stat-card,
│                        # confirm-dialog, theme-toggle, student-tabs, project-card,
│                        # page-skeleton, nav-link-label, gallery/
├── components/ui/       # shadcn/ui
├── lib/supabase/        # client (browser/server), admin (service key), database.types.ts
├── lib/get-profile.ts   # requireProfile/requireRole (bọc cache() — 1 lượt/request)
├── lib/file-check.ts    # chặn file bị DLP mã hóa trước khi upload
├── lib/spec-storage.ts  # dọn file đề trong Storage khi xóa (Storage KHÔNG cascade)
└── lib/ai-client.ts     # gọi ai-service, duy nhất nơi biết AI_SERVICE_API_KEY
ai-service/app/
├── main.py              # FastAPI app + auth middleware
├── routes/              # review, student-summary, zalo-summary, suggest-features, grade
├── prompts.py           # toàn bộ prompt Gemini
└── schemas.py           # Pydantic models
supabase/migrations/     # SQL schema + RLS (dán tay vào SQL Editor — mạng chặn 5432)
```

## Ranh giới & quy tắc phụ thuộc

- Phân quyền thật nằm ở RLS (Postgres); UI check chỉ để trải nghiệm.
- Chỉ server-side của Next.js gọi ai-service; browser không bao giờ có X-API-Key.
- ai-service stateless, không giữ DB connection — đọc file đề qua Supabase Storage
  bằng service key; không ghi gì (chấm bài trả kết quả inline).

## Luồng quan trọng

- **Đăng ký học viên:** signup + nhập `class_code` (VD JSB01) → tạo profile role=student
  → tạo enrollment vào lớp có mã đó.
- **AI nhận xét:** GV tick điểm mạnh/cải thiện → Server Action gửi ngữ cảnh buổi học
  → ai-service `/generate-review` → GV sửa → lưu `student_reviews`.
- **Hồ sơ HV xuyên khóa:** bấm tên HV trong lớp → timeline nhận xét gốc từng buổi
  (`student_reviews` + `sessions`) + AI tổng hợp toàn khóa. Chỉ GV của lớp (RLS).
- **Chấm bài AI (công cụ độc lập, KHÔNG theo lớp):** đề thuộc course + session_number,
  file đề lưu Storage — **thứ duy nhất được lưu**. GV chọn đề → upload file bài làm 1
  học sinh → gửi **inline base64** → `/grade-submission` → trả `{score, bullets}` để
  copy. **Không ghi DB, không lưu file bài làm.**

## Điểm dễ nhầm (gotchas)

- `courses` (JSB) ≠ `classes` (JSB01): đề bài gắn course, học viên gắn class.
- Render free ngủ sau 15 phút → request AI đầu tiên có thể chờ 30–60s (cold start).
- Supabase free pause project sau 7 ngày không hoạt động.
- Storage KHÔNG cascade như FK — xóa dòng có file phải xóa file tay (`spec-storage.ts`).
