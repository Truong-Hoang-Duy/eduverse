# Coding Style Rules

> File này được nạp cùng CLAUDE.md. Chỉ ghi rule THAY ĐỔI hành vi của Claude.

## TypeScript / Next.js (web/)
- TypeScript strict mode. Cấm `any`; nếu bất khả kháng dùng `unknown` + type guard.
- React function components + hooks; không dùng class components.
- Server Components mặc định; chỉ thêm `"use client"` khi thật sự cần state/effect/event.
- Mutation (create/update/delete) dùng Server Actions; không tạo API route riêng trừ
  khi gọi từ bên ngoài Next.js.
- Dùng shadcn/ui component có sẵn trong `web/src/components/ui/` trước khi tự viết.
- Types của DB sinh từ Supabase (`web/src/lib/database.types.ts`) — không tự khai lại.

## Python / FastAPI (ai-service/)
- PEP8, type hints bắt buộc cho mọi hàm public.
- Pydantic models cho mọi request/response body; không trả dict thô.
- Prompt Gemini đặt trong `app/prompts.py`, không rải trong endpoint.
- Gọi Gemini luôn có try/except quota (429) → trả HTTP 503 với message tiếng Việt.

## Đặt tên
- File: kebab-case.ts / snake_case.py | Component: PascalCase | Hàm/biến: camelCase (TS),
  snake_case (Python) | Hằng: UPPER_SNAKE.
- Route App Router theo nhóm vai trò: `app/(teacher)/...`, `app/(student)/...`, `app/(auth)/...`.

## Import/Export
- Named exports, không default export (trừ page.tsx/layout.tsx do Next.js yêu cầu).
- Thứ tự import: builtin → external → alias `@/` → relative.

## Error handling
- Không nuốt lỗi bằng catch rỗng. Server Action trả `{ error: string }` cho UI hiển thị;
  không throw thẳng ra client.
- Không dùng `console.log` trong code commit; dùng `console.error` cho lỗi thật sự.

## Ngôn ngữ
- UI text, thông báo lỗi hiển thị cho người dùng: tiếng Việt.
- Tên biến/hàm/comment kỹ thuật, commit message: tiếng Anh.

## Test
- web/: đặt cạnh file nguồn `foo.ts` → `foo.test.ts` (Vitest).
- ai-service/: `tests/test_*.py` (pytest), mock Gemini — test không được gọi API thật.
- Tên test mô tả hành vi: "should reject student accessing teacher page", không đặt "test 1".
