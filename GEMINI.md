# GEMINI.md — Project Context for Gemini Code

> Behavioral contract giữa team và Gemini. Dự án này được phát triển song song bởi cả Claude và Gemini.
> Mỗi dòng ở đây phải THAY ĐỔI cách Gemini hành xử — nếu không, xóa đi. Giữ file dưới ~200 dòng.
> Để không bị phân mảnh dữ liệu, Gemini **SẼ DÙNG CHUNG** thư mục `.claude/docs/` làm nguồn tri thức và sổ tay bàn giao.

## 1. Project Overview

- **Name:** Eduverse
- **Purpose:** Dashboard quản lý học viên cho giáo viên dạy lập trình — quản lý
  khóa học/lớp, nhận xét học viên bằng AI, chấm bài tập bằng AI, sản phẩm cuối khóa,
  random nhóm thuyết trình. Hai vai trò: teacher / student.
- **Tech stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui,
  Supabase (PostgreSQL + Auth + Storage + RLS), Python 3.12 FastAPI + Gemini 2.5 Flash.
- **Structure:** monorepo — `web/` (Next.js, pnpm), `ai-service/` (FastAPI, venv + pip),
  `supabase/` (migrations).

## 2. Session Startup Protocol (QUAN TRỌNG)

Khi bắt đầu MỌI phiên làm việc mới, TRƯỚC KHI làm bất cứ việc gì:

1. Đọc `.claude/docs/SESSION_NOTES.md` để nắm trạng thái công việc gần nhất (task đang dở, việc cần làm tiếp). Quyết định đã chốt nằm ở `.claude/docs/DECISIONS.md` — đọc khi định làm ngược một lựa chọn cũ.
2. Đọc `.claude/docs/ROADMAP.md` để biết đang ở giai đoạn nào.
3. Nếu SESSION_NOTES.md nhắc đến branch/PR cụ thể, chạy `git status` và `git log --oneline -10` để đối chiếu.

**YÊU CẦU ĐẶC BIỆT KHI KẾT THÚC TASK/PHIÊN:**
Khi phiên làm việc sắp kết thúc, bạn PHẢI cập nhật tài liệu để Claude có thể tiếp quản và ngược lại:
1. Cập nhật tiến độ vào `.claude/docs/SESSION_NOTES.md` và `.claude/docs/ROADMAP.md`.
2. Ghi rõ "Cập nhật bởi: Gemini" trong phần log của `SESSION_NOTES.md` để theo dõi nguồn sửa đổi.
*(Tuyệt đối không tạo ra file tracking mới như `.agents/docs/SESSION_NOTES.md` để tránh lệch dữ liệu).*

## 3. Docs Router — chỉ đọc file liên quan đến task (tiết kiệm context)

| Task liên quan đến | Đọc file |
|---|---|
| Trạng thái phiên trước / tiếp tục việc dở | `.claude/docs/SESSION_NOTES.md` |
| **Quyết định đã chốt** | `.claude/docs/DECISIONS.md` |
| Giai đoạn, checklist tiến độ | `.claude/docs/ROADMAP.md` |
| Sơ đồ hệ thống, ranh giới service | `.claude/docs/ARCHITECTURE.md` |
| Schema DB, RLS, quan hệ course→class→session | `.claude/docs/DATABASE.md` |
| Endpoint FastAPI, prompt Gemini, JSON schema | `.claude/docs/AI-SERVICE.md` |
| Nghiệp vụ/UX từng tính năng theo vai trò | `.claude/docs/FEATURES.md` |
| **Deploy / git workflow** | `.claude/docs/GIT-WORKFLOW-RULES.md` |

KHÔNG đọc cả thư mục docs một lượt; chỉ nạp đúng file cần cho task hiện tại.

## 4. Commands (dùng CHÍNH XÁC các lệnh này)

```bash
# --- web/ (chạy trong thư mục web/) ---
pnpm install               # KHÔNG dùng npm/yarn
pnpm dev                   # dev server http://localhost:3000
pnpm lint                  # eslint
pnpm typecheck             # tsc --noEmit
pnpm test                  # vitest run (unit test logic thuần, offline)
pnpm test:e2e              # E2E gọi thẳng thân Server Action trên Supabase THẬT
pnpm build                 # production build
# --- ai-service/ (chạy trong thư mục ai-service/) ---
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
.venv/Scripts/python -m pytest
# --- database ---
supabase db push           # áp migrations lên Supabase project
```

Luôn chạy lint + typecheck + test liên quan trước khi coi task là hoàn thành.

## 5. Code Conventions

- TypeScript strict mode, cấm `any`; React function components + hooks.
- File kebab-case, component PascalCase, named exports.
- Python: PEP8, type hints bắt buộc, Pydantic models cho request/response.
- UI text tiếng Việt; code + commit message tiếng Anh.

## 6. Architecture Rules (những điều KHÔNG được vi phạm)

- Mọi phân quyền teacher/student PHẢI có RLS ở tầng DB — check ở UI/route chỉ là lớp phụ.
- Next.js KHÔNG gọi AI trực tiếp; mọi việc AI đi qua `ai-service/` (header `X-API-Key`).
- Client component KHÔNG dùng Supabase service-role key; key đó chỉ tồn tại server-side.
- Chấm bài là công cụ ĐỘC LẬP: chỉ lưu đề bài; file bài làm + kết quả chấm KHÔNG lưu.
- Mọi hành động xóa dùng `ConfirmDialog`; không dùng `confirm()` của trình duyệt.
- Xóa là XÓA SẠCH: DB cascade sẵn nhưng **Storage không cascade** — xóa dòng có file phải tự dọn Storage.
- Không thêm dependency mới khi chưa hỏi ý kiến user.

## 7. Git Workflow

- Branch từ `develop`: `feature/<slug>`, `fix/<slug>`
- Conventional Commits tiếng Anh: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- KHÔNG commit trực tiếp vào `main`/`develop`; KHÔNG tự ý push/force-push khi chưa được yêu cầu.

## 8. Những điều Gemini KHÔNG được làm

- Không sửa file trong `supabase/migrations/` đã push lên DB — tạo migration mới.
- Không xóa/sửa test để "cho pass" — sửa code hoặc báo lại user.
- Không hard-code secrets; dùng biến môi trường theo `.env.example`.
- Không refactor lớn ngoài phạm vi task trừ khi được yêu cầu.
