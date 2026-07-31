# Hướng dẫn Deploy Eduverse (chi phí 0đ)

Kiến trúc production:

| Thành phần | Nền tảng | Chi phí |
|---|---|---|
| `web/` Next.js | Vercel (Hobby) | 0đ |
| `ai-service/` FastAPI | Render (Free) | 0đ |
| Database + Auth + Storage | Supabase (Free) — ĐÃ chạy | 0đ |

> Thứ tự bắt buộc: **GitHub → Render → Vercel** (Vercel cần URL của Render).

## Bước 0 — Đưa code lên GitHub

1. Tạo repo mới trên github.com (chọn **Private**), KHÔNG tick "Add README".
2. Tại thư mục dự án chạy:
   ```bash
   git remote add origin https://github.com/<username>/eduverse.git
   git push -u origin main develop
   ```

## Bước 1 — Deploy ai-service lên Render

1. Đăng ký https://render.com (login bằng GitHub).
2. **New +** → **Blueprint** → chọn repo `eduverse` → Render tự đọc `render.yaml`.
3. Nhập 4 biến môi trường khi được hỏi (các biến `sync: false`):
   - `GEMINI_API_KEY` — key Gemini của bạn (aistudio.google.com/apikey)
   - `AI_SERVICE_API_KEY` — chuỗi ngẫu nhiên dài, TỰ ĐẶT (sẽ dùng lại ở Vercel)
   - `SUPABASE_URL` — giống `NEXT_PUBLIC_SUPABASE_URL` trong web/.env.local
   - `SUPABASE_SERVICE_KEY` — service role key của Supabase
4. **Apply** → chờ build xong → lấy URL dạng `https://eduverse-ai.onrender.com`.
5. Kiểm tra: mở `https://<url-render>/health` → thấy
   `{"status":"ok","commit":"<7 ký tự>"}`.

**Sau MỖI lần deploy lại ai-service, đối chiếu `commit` với `git log --oneline -1 main`.**
Khớp = Render đang chạy đúng bản mới; lệch = Render chưa build xong (hoặc auto-deploy
tắt). Không cần vào dashboard. `commit` là `"local"` khi chạy ở máy dev.

Lưu ý free tier: service ngủ sau 15 phút không dùng; request AI đầu tiên sau đó
chờ 30–60s là bình thường.

## Bước 2 — Deploy web lên Vercel

1. Đăng ký https://vercel.com (login bằng GitHub).
2. **Add New** → **Project** → Import repo `eduverse`.
3. **Root Directory**: bấm Edit → chọn `web` (QUAN TRỌNG). Framework tự nhận Next.js.
4. Mục **Environment Variables**, thêm đủ 6 biến (giá trị lấy từ `web/.env.local`):

   | Tên | Giá trị |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | như .env.local |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | như .env.local |
   | `SUPABASE_SERVICE_ROLE_KEY` | như .env.local |
   | `AI_SERVICE_URL` | URL Render ở Bước 1 (không có `/` cuối) |
   | `AI_SERVICE_API_KEY` | ĐÚNG chuỗi đã nhập ở Render |
   | `TEACHER_INVITE_CODE` | mã mời giáo viên (nên đổi khác local) |

5. **Deploy** → nhận URL dạng `https://eduverse-xxx.vercel.app`.

## Bước 3 — Kiểm tra sau deploy

- [ ] Mở URL Vercel → tự chuyển đến `/login`, giao diện hiển thị đúng.
- [ ] Đăng nhập tài khoản giáo viên → thấy dashboard, tạo thử 1 lớp.
- [ ] Cửa sổ ẩn danh: đăng ký học viên (combo box hiện lớp vừa tạo).
- [ ] (Khi có tính năng AI trên UI) bấm nút AI — lần đầu chờ cold start.

## Cập nhật phiên bản sau này

Chỉ cần push lên GitHub: `git push origin main` → Vercel và Render tự build lại.
Migration DB mới: dán SQL vào Supabase SQL Editor (mạng local chặn cổng 5432).

## Sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| Nút AI báo "AI đang bận" ngay lập tức | Sai `AI_SERVICE_API_KEY` giữa Vercel và Render, hoặc `AI_SERVICE_URL` sai |
| AI chờ rất lâu lần đầu trong ngày | Cold start Render free — bình thường |
| Đăng nhập lỗi trên production | Kiểm tra 3 biến Supabase trên Vercel |
| Supabase ngừng hoạt động | Free tier pause sau 7 ngày không dùng → vào dashboard bấm Restore |
