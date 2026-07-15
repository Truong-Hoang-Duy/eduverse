# CLAUDE.md — Project Context for Claude Code

> Behavioral contract giữa team và Claude. Mỗi dòng ở đây phải THAY ĐỔI cách Claude
> hành xử — nếu không, xóa đi. Giữ file dưới ~200 dòng; nội dung dài hơn tách vào
> `.claude/rules/` và `.claude/docs/`.

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

1. Đọc `.claude/docs/SESSION_NOTES.md` để nắm trạng thái công việc gần nhất
   (task đang dở, quyết định đã chốt, việc cần làm tiếp).
2. Đọc `.claude/docs/ROADMAP.md` để biết đang ở giai đoạn nào.
3. Nếu SESSION_NOTES.md nhắc đến branch/PR cụ thể, chạy `git status` và
   `git log --oneline -10` để đối chiếu.

Khi phiên làm việc sắp kết thúc hoặc user gõ `/handoff`, cập nhật
`.claude/docs/SESSION_NOTES.md` và tick tiến độ trong `ROADMAP.md`.

## 3. Docs Router — chỉ đọc file liên quan đến task (tiết kiệm context)

| Task liên quan đến | Đọc file |
|---|---|
| Trạng thái phiên trước / tiếp tục việc dở | `.claude/docs/SESSION_NOTES.md` |
| Giai đoạn, checklist tiến độ | `.claude/docs/ROADMAP.md` |
| Sơ đồ hệ thống, ranh giới service | `.claude/docs/ARCHITECTURE.md` |
| Schema DB, RLS, quan hệ course→class→session | `.claude/docs/DATABASE.md` |
| Endpoint FastAPI, prompt Gemini, JSON schema | `.claude/docs/AI-SERVICE.md` |
| Nghiệp vụ/UX từng tính năng theo vai trò | `.claude/docs/FEATURES.md` |
| Prompt mẫu để mở phiên chat mới | `.claude/docs/PROMPTS.md` |

KHÔNG đọc cả thư mục docs một lượt; chỉ nạp đúng file cần cho task hiện tại.

## 4. Commands (dùng CHÍNH XÁC các lệnh này)

```bash
# --- web/ (chạy trong thư mục web/) ---
pnpm install               # KHÔNG dùng npm/yarn
pnpm dev                   # dev server http://localhost:3000
pnpm lint                  # eslint
pnpm typecheck             # tsc --noEmit
pnpm build                 # production build
# --- ai-service/ (chạy trong thư mục ai-service/) ---
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
.venv/Scripts/python -m pytest
# --- database ---
supabase db push           # áp migrations lên Supabase project
```

Luôn chạy lint + typecheck + test liên quan trước khi coi task là hoàn thành.

## 5. Code Conventions (tóm tắt — chi tiết trong .claude/rules/coding-style.md)

- TypeScript strict mode, cấm `any`; React function components + hooks.
- File kebab-case, component PascalCase, named exports.
- Python: PEP8, type hints bắt buộc, Pydantic models cho request/response.
- UI text tiếng Việt; code + commit message tiếng Anh.

## 6. Architecture Rules (những điều KHÔNG được vi phạm)

- Mọi phân quyền teacher/student PHẢI có RLS ở tầng DB — check ở UI/route chỉ là lớp phụ.
- Next.js KHÔNG gọi Gemini trực tiếp; mọi việc AI đi qua `ai-service/` (header `X-API-Key`).
- Client component KHÔNG dùng Supabase service-role key; key đó chỉ tồn tại server-side.
- Đề bài (`assignments`) thuộc KHÓA HỌC (course), không thuộc lớp — mỗi buổi một đề.
- Chấm bài là công cụ ĐỘC LẬP: chỉ lưu đề bài; file bài làm + kết quả chấm KHÔNG
  lưu (bảng `submissions`/`grades` là schema chết — đừng dùng lại).
- Mọi hành động xóa dùng `ConfirmDialog`; không dùng `confirm()` của trình duyệt.
- Không thêm dependency mới khi chưa hỏi ý kiến user.

## 7. Git Workflow (chi tiết trong .claude/rules/git-workflow.md)

- Branch từ `develop`: `feature/<slug>`, `fix/<slug>`
- Conventional Commits tiếng Anh: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- KHÔNG commit trực tiếp vào `main`/`develop`; KHÔNG tự ý push/force-push khi chưa được yêu cầu.

## 8. Những điều Claude KHÔNG được làm

- Không sửa file trong `supabase/migrations/` đã push lên DB — tạo migration mới.
- Không xóa/sửa test để "cho pass" — sửa code hoặc báo lại user.
- Không hard-code secrets; dùng biến môi trường theo `web/.env.example` và `ai-service/.env.example`.
- Không refactor lớn ngoài phạm vi task trừ khi được yêu cầu.

## 9. Subagents có sẵn (trong .claude/agents/)

- `code-reviewer` — review code sau khi viết/sửa xong
- `test-runner` — chạy test và fix lỗi test
- `debugger` — điều tra lỗi runtime/CI
- `session-summarizer` — tổng hợp phiên làm việc vào SESSION_NOTES.md

Chủ động dùng subagent phù hợp thay vì làm mọi thứ trong context chính.
