# Eduverse — Chạy dự án tại máy local

Dashboard quản lý học viên cho giáo viên dạy lập trình. Dự án gồm 2 service chạy
song song:

| Thư mục | Là gì | Cổng |
|---|---|---|
| `web/` | Next.js — giao diện + logic chính | http://localhost:3000 |
| `ai-service/` | FastAPI + Gemini — mọi tính năng AI | http://localhost:8000 |

> Database (Supabase) chạy trên cloud, không cần cài gì ở máy.

---

## Chạy hằng ngày (máy đã cài sẵn)

Mở **2 cửa sổ terminal**, mỗi cửa sổ chạy một service:

**Terminal 1 — AI service:**
```bash
cd ai-service
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Web:**
```bash
cd web
pnpm dev
```

Mở trình duyệt: **http://localhost:3000**

Dừng: bấm `Ctrl + C` ở mỗi cửa sổ.

> Chỉ chạy `web` cũng vào được app, nhưng các nút AI (✨) sẽ báo lỗi kết nối.

---

## Cài từ đầu (máy mới)

Cần có sẵn: **Node.js 22+**, **pnpm** (`npm i -g pnpm`), **Python 3.12+**, **Git**.

```bash
git clone https://github.com/Truong-Hoang-Duy/eduverse.git
cd eduverse

# 1. Web
cd web
pnpm install
cp .env.example .env.local     # rồi mở .env.local điền giá trị thật

# 2. AI service
cd ../ai-service
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt
cp .env.example .env           # rồi mở .env điền giá trị thật
```

**Điền biến môi trường** (lấy từ Supabase Dashboard → Project Settings → API,
và https://aistudio.google.com/apikey):

- `web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `AI_SERVICE_URL=http://localhost:8000`,
  `AI_SERVICE_API_KEY`, `TEACHER_INVITE_CODE`
- `ai-service/.env`: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-flash-latest`,
  `AI_SERVICE_API_KEY` (**phải trùng** với bên web), `SUPABASE_URL`,
  `SUPABASE_SERVICE_KEY`

Tạo chuỗi ngẫu nhiên cho `AI_SERVICE_API_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

---

## Tài khoản đăng nhập

- **Giáo viên**: đăng ký tại http://localhost:3000/signup/teacher — cần nhập đúng
  `TEACHER_INVITE_CODE` trong `web/.env.local`.
- **Học viên**: đăng ký tại http://localhost:3000/signup — chọn lớp từ combo box
  (giáo viên phải tạo khóa học + mở lớp trước).

Đăng nhập bằng **tên tài khoản** (username), không dùng email.

---

## Kiểm tra khi sửa code

```bash
cd web
pnpm typecheck && pnpm lint && pnpm build   # bắt buộc trước khi commit

cd ../ai-service
.venv/Scripts/python -m pytest
```

**Test end-to-end trên database thật** — 74 kiểm tra, tự tạo và tự xóa dữ liệu test:
```bash
cd web
node --env-file=.env.local scripts/e2e-phase1.mjs      # auth, khóa/lớp, RLS       (13)
node --env-file=.env.local scripts/e2e-phase2.mjs      # buổi học, nhận xét        (10)
node --env-file=.env.local scripts/e2e-phase5.mjs      # random nhóm                (8)
node --env-file=.env.local scripts/e2e-api-key.mjs     # API key riêng + RLS        (8)
node --env-file=.env.local scripts/e2e-class-admin.mjs # sửa khóa/lớp, thêm HV     (15)

# 2 bộ này gọi Gemini thật → cần ai-service đang chạy
node --env-file=.env.local --env-file=../ai-service/.env scripts/e2e-phase3.mjs  # chấm bài  (10)
node --env-file=.env.local --env-file=../ai-service/.env scripts/e2e-phase4.mjs  # sản phẩm  (10)
```

Công cụ chẩn đoán:
```bash
cd web
node --env-file=.env.local scripts/check-integrity.mjs      # kiểm tra toàn vẹn dữ liệu
node --env-file=.env.local scripts/check-user.mjs <username> # tra cứu 1 tài khoản
```

---

## Đổi schema database

Mạng hiện tại **chặn cổng 5432/6543** nên `supabase db push` KHÔNG dùng được.
Cách làm:

1. Tạo file SQL mới trong `supabase/migrations/` (không sửa file đã áp).
2. Copy toàn bộ nội dung → Supabase Dashboard → **SQL Editor** → **Run**.
3. Sinh lại types:
   ```bash
   ./node_modules/.bin/supabase gen types typescript --linked > web/src/lib/database.types.ts
   ```

---

## Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| `Jest worker...`, `ENOENT build-manifest` | Có 2 dev server chạy chồng. Tắt hết tiến trình cổng 3000/3001, xóa thư mục `web/.next`, chạy lại `pnpm dev` |
| Nút AI báo "AI đang bận" ngay | `ai-service` chưa chạy, hoặc `AI_SERVICE_API_KEY` hai bên không khớp |
| Nút AI chờ rất lâu lần đầu | Bình thường trên production (Render free ngủ sau 15 phút); ở local thì không bị |
| Đăng nhập lỗi trên app | Kiểm tra 3 biến Supabase trong `web/.env.local` |
| App báo lỗi kết nối database | Supabase free tự pause sau 7 ngày không dùng → vào dashboard bấm **Restore** |

---

## Tài liệu khác

- [DEPLOY.md](DEPLOY.md) — deploy lên Vercel + Render (chi phí 0đ)
- [.claude/docs/](.claude/docs/) — kiến trúc, schema, AI service, nghiệp vụ, roadmap
