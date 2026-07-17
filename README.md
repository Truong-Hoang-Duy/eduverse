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
# Tự tạo file .env.local rồi điền 6 biến ở mục dưới.
# (web/.env.example KHÔNG có trong repo — bị web/.gitignore chặn.)

# 2. AI service
cd ../ai-service
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt
cp .env.example .env           # rồi mở .env điền giá trị thật
```

> Nếu `pnpm` báo "command not found" (không có trên PATH), dùng `corepack pnpm ...`
> — Node đã kèm sẵn corepack.

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

**Test end-to-end trên database thật** — 98 kiểm tra, tự tạo và tự xóa dữ liệu test:
```bash
cd web
node --env-file=.env.local scripts/e2e-phase1.mjs         # auth, khóa/lớp, RLS        (13)
node --env-file=.env.local scripts/e2e-phase2.mjs         # buổi học, nhận xét, hồ sơ HV (13)
node --env-file=.env.local scripts/e2e-phase5.mjs         # random nhóm                 (8)
node --env-file=.env.local scripts/e2e-api-key.mjs        # API key riêng + RLS         (8)
node --env-file=.env.local scripts/e2e-class-admin.mjs    # sửa khóa/lớp, thêm HV      (15)
node --env-file=.env.local scripts/e2e-gallery-storage.mjs # GV xem/nhận xét SP, xóa sạch Storage (17)

# 2 bộ này gọi Gemini thật → cần ai-service đang chạy
node --env-file=.env.local --env-file=../ai-service/.env scripts/e2e-phase3.mjs  # chấm bài  (10)
node --env-file=.env.local --env-file=../ai-service/.env scripts/e2e-phase4.mjs  # sản phẩm  (14)
```

> ⚠️ Trước khi chạy phase3/phase4: đảm bảo **chỉ có MỘT** ai-service ở cổng 8000
> (`netstat -ano | findstr :8000`). Hai instance chồng nhau thì instance mới không
> bind được, test gọi vào instance cũ và báo **502 giả** — không phải lỗi code.

Công cụ chẩn đoán:
```bash
cd web
node --env-file=.env.local scripts/check-integrity.mjs       # kiểm tra toàn vẹn dữ liệu
node --env-file=.env.local scripts/check-user.mjs <username>  # tra cứu 1 tài khoản
node --env-file=.env.local scripts/purge-test-users.mjs       # dọn tài khoản rác của E2E (thêm --yes để xóa thật)
```

---

## Đổi schema database

Mạng hiện tại **chặn cổng 5432/6543** nên `supabase db push` KHÔNG dùng được.
Cách làm:

1. Tạo file SQL mới trong `supabase/migrations/` (không sửa file đã áp).
2. Copy toàn bộ nội dung → Supabase Dashboard → **SQL Editor** → **Run**.
   SQL Editor chạy trong **một transaction**: lỗi giữa chừng là rollback HẾT
   (không áp gì cả) — sửa rồi chạy lại.
3. Sinh lại types (**tùy chọn** — chỉ để `database.types.ts` khớp schema mới):
   ```bash
   cd web
   corepack pnpm dlx supabase login          # 1 lần
   corepack pnpm dlx supabase link --project-ref <project-ref>   # 1 lần
   corepack pnpm dlx supabase gen types typescript --linked > src/lib/database.types.ts
   ```

> 🚨 **Bẫy đã dính thật**: supabase CLI **KHÔNG** cài trong `node_modules` — lệnh
> `./node_modules/.bin/supabase ...` sẽ báo không tìm thấy, **nhưng dấu `>` đã cắt
> trắng `database.types.ts` thành 0 byte TRƯỚC khi lệnh chạy** → vỡ build. Nếu lỡ:
> `git checkout -- web/src/lib/database.types.ts` để khôi phục.

> ⚠️ **SQL không xóa được Storage**: Supabase chặn `DELETE` thẳng vào
> `storage.objects` / `storage.buckets` (lỗi `42501 protect_delete`). Xóa bucket
> phải qua Storage API — xem `web/scripts/drop-submissions-bucket.mjs` làm mẫu.

---

## Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| `Jest worker...`, `ENOENT build-manifest` | 2 tiến trình cùng ghi `.next` — hoặc 2 dev server chồng nhau, hoặc chạy `pnpm build` **trong khi** `pnpm dev` đang chạy. Tắt hết tiến trình cổng 3000/3001, xóa `web/.next`, chạy lại |
| E2E phase3/phase4 báo `HTTP 502` hàng loạt | Thường là **2 ai-service chồng cổng 8000** (cái mới không bind được, test gọi vào cái cũ). Kill hết python, chạy lại đúng 1 instance. Nếu log ai-service ghi `503 UNAVAILABLE ... high demand` thì là Gemini quá tải phía Google — chờ rồi thử lại |
| Nút AI báo "AI đang bận" ngay | `ai-service` chưa chạy, hoặc `AI_SERVICE_API_KEY` hai bên không khớp |
| Nút AI chờ rất lâu lần đầu | Bình thường trên production (Render free ngủ sau 15 phút); ở local thì không bị |
| Đăng nhập lỗi trên app | Kiểm tra 3 biến Supabase trong `web/.env.local` |
| App báo lỗi kết nối database | Supabase free tự pause sau 7 ngày không dùng → vào dashboard bấm **Restore** |

---

## Tài liệu khác

- [DEPLOY.md](DEPLOY.md) — deploy lên Vercel + Render (chi phí 0đ)
- [.claude/docs/](.claude/docs/) — kiến trúc, schema, AI service, nghiệp vụ, roadmap
