# ARCHITECTURE.md — Bản đồ kiến trúc Eduverse

> Chỉ là bản đồ, giữ <60 dòng. Schema chi tiết → DATABASE.md; AI → AI-SERVICE.md.

## Sơ đồ tổng quan

```
┌─────────────────────┐      ┌──────────────────────┐
│  web/  Next.js 15   │──────│  Supabase            │
│  (Vercel, free)     │      │  - PostgreSQL + RLS  │
│  - UI + Server      │      │  - Auth (email/pass) │
│    Actions          │      │  - Storage (đề bài,  │
└────────┬────────────┘      │    bài nộp)          │
         │ HTTP, header      └──────────────────────┘
         │ X-API-Key
┌────────▼────────────┐      ┌──────────────────────┐
│  ai-service/        │──────│  Google Gemini API   │
│  Python FastAPI     │      │  gemini-2.5-flash    │
│  (Render, free)     │      │  (free tier)         │
└─────────────────────┘      └──────────────────────┘
```

## Cấu trúc thư mục chính

```
web/src/
├── app/(auth)/          # login, signup (student + teacher-invite)
├── app/(teacher)/       # dashboard GV: courses, classes, sessions, grading, zalo
├── app/(student)/       # dashboard HV: projects, gallery
├── components/ui/       # shadcn/ui
├── lib/supabase/        # client (browser/server), database.types.ts
└── lib/ai-client.ts     # gọi ai-service, duy nhất nơi biết AI_SERVICE_API_KEY
ai-service/app/
├── main.py              # FastAPI app + auth middleware
├── routes/              # generate_review, zalo_summary, suggest_features, grade
├── prompts.py           # toàn bộ prompt Gemini
└── schemas.py           # Pydantic models
supabase/migrations/     # SQL schema + RLS
```

## Ranh giới & quy tắc phụ thuộc

- Phân quyền thật nằm ở RLS (Postgres); UI check chỉ để trải nghiệm.
- Chỉ server-side của Next.js gọi ai-service; browser không bao giờ có X-API-Key.
- ai-service stateless, không giữ DB connection — đọc file qua Supabase Storage
  bằng service key, ghi kết quả do Next.js đảm nhận.

## Luồng quan trọng

- **Đăng ký học viên:** signup + nhập `class_code` (VD JSB01) → tạo profile role=student
  → tạo enrollment vào lớp có mã đó.
- **AI nhận xét:** GV tick radio/checkbox → Server Action gửi ngữ cảnh buổi học
  → ai-service `/generate-review` → GV sửa → lưu `student_reviews`.
- **Tạo nội dung buổi học:** GV điền nội dung từng buổi của lớp (bảng `sessions`,
  tự sinh N buổi theo `total_sessions` khi tạo lớp).
- **Chấm bài AI:** đề thuộc course + session_number → GV upload bài từng học viên
  (Storage) → lặp từng HV gọi `/grade-submission` → lưu `grades` → bảng tổng kết /100.

## Điểm dễ nhầm (gotchas)

- `courses` (JSB) ≠ `classes` (JSB01): đề bài gắn course, học viên gắn class.
- Render free ngủ sau 15 phút → request AI đầu tiên có thể chờ 30–60s (cold start).
- Supabase free pause project sau 7 ngày không hoạt động.
