# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-15, bởi: Claude)

**Đang làm:** Không có task dở. **Toàn bộ 5 giai đoạn theo plan đã xong và chạy
trên production.** Nhánh `main` = `develop` = `origin/main`; các nhánh feature đã
merge và xóa. Giai đoạn tiếp theo là hoàn thiện/mở rộng theo yêu cầu mới của user.

**Tiến độ (xem chi tiết ROADMAP.md):**
- [x] GĐ 1 — Auth bằng username (không dùng email) + CRUD khóa học/lớp, chuyển lớp
- [x] GĐ 2 — Buổi học, nhận xét AI theo buổi, tin Zalo (copy tay), nhận xét tổng hợp/HV
- [x] GĐ 3 — Chấm bài AI theo đề của khóa (upload đề + bài làm, bảng điểm /100, CSV)
- [x] GĐ 4 — Sản phẩm cuối khóa, gallery + bình luận, AI gợi ý tính năng, trang hướng dẫn
- [x] GĐ 5 — Random nhóm thuyết trình (chia đều, lưu kết quả cuối)
- [x] Deploy: Vercel (web) + Render (ai-service) + Supabase — chi phí 0đ/tháng
- [x] E2E tổng 43/43 PASS trên DB thật (`web/scripts/e2e-phase{1..5}.mjs`)

**Đang dừng ở:** branch `feature/grading-rework-ui` — CHỜ USER DUYỆT rồi merge.
1. **Chấm bài viết lại hoàn toàn** (user yêu cầu): độc lập, KHÔNG theo lớp. Chọn
   khóa → chọn đề (vẫn lưu theo khóa+buổi) → upload file 1 học sinh → điểm ở ô
   riêng + nhận xét gạch đầu dòng + Copy. KHÔNG lưu kết quả/file (gửi base64
   inline sang ai-service). `submissions`/`grades` thành schema chết.
2. **Giao diện mới**: dark mode (nút trên nav, script chống FOUC trong layout),
   thẻ số liệu (dashboard GV/HV + chi tiết lớp), ô tìm lớp, footer, `AppShell` +
   `PageHeader` dùng chung. Giữ thương hiệu Eduverse.
E2E: phase1 13/13, phase2 10/10, phase3 10/10 (mới), phase5 8/8.

## 📌 Quyết định đã chốt (không hỏi lại)

- Stack: Next.js 15 + TS + Tailwind + shadcn/ui (Vercel) / Supabase (DB + Auth +
  Storage + RLS) / Python FastAPI + Gemini (Render free). Mục tiêu 0đ/tháng.
- **Auth bằng USERNAME**, không dùng email. Email ảo `<username>@eduverse.local`
  tạo qua admin API (signUp thường chặn domain ảo); đăng nhập qua RPC
  `get_email_by_username`; đăng ký HV chọn lớp bằng combo box (RPC
  `list_available_classes`). KHÔNG thu thập email/tuổi/trường/sở thích.
- Model Gemini: **`gemini-flash-latest`** (alias) — `gemini-2.5-flash` bị Google
  khóa với API key mới từ 2026. Client cache bằng `lru_cache` (tránh bug GC).
- Zalo: KHÔNG dùng API (OA cần xác thực + ZNS mất phí). AI soạn tin theo mẫu →
  GV bấm Copy dán vào nhóm. Tin Zalo nhận xét CHUNG cả lớp, không nêu tên ai.
- Xưng hô với học viên trong mọi output AI: **"em"**, tuyệt đối không dùng "con".
- Mô hình dữ liệu: courses (JSB/CSB...) → classes (JSB01, JSB02...). Đề bài thuộc
  KHÓA + số buổi (mỗi buổi một đề), dùng chung mọi lớp cùng khóa.
- Chấm bài: GV upload bài làm TỪNG học viên (HV không tự nộp), AI chấm thang 100,
  GV sửa tay được, xuất CSV.
- Quy mô nhỏ: 1 giáo viên + học viên của mình (<200) → free tier dư.

## ⚠️ Vấn đề đang mở / cần chú ý

- **Migration phải dán tay vào Supabase SQL Editor** — mạng của user CHẶN cổng
  5432/6543, `supabase db push` không dùng được (chỉ cổng 443 mở). Gen types thì
  chạy được: `./node_modules/.bin/supabase gen types typescript --linked`.
- **`git push --force` bị `.claude/settings.json` chặn** — nếu cần force-push
  (VD viết lại lịch sử), phải đưa lệnh cho user tự chạy.
- **Git identity**: repo này đặt `user.email = truonghoangduy2612@gmail.com`
  (config LOCAL của repo, không phải global — máy này mặc định dùng email công ty
  taekwang.com). Vercel chặn deploy nếu commit author không phải chủ team →
  KHÔNG đổi lại email trong repo này.
- Render free: cold start 30–60s cho request AI đầu tiên trong ngày (bình thường).
- Supabase free: tự pause project sau 7 ngày không hoạt động → vào dashboard Restore.
- Dev server hay bị tiến trình mồ côi giữa các phiên → nếu gặp lỗi lạ ("Jest
  worker...", ENOENT build-manifest): kill port 3000/3001, xóa `web/.next`, chạy lại.
- Trang `/student/guide`: 3 video đã điền; sửa link trong biến `VIDEOS` ở đầu file.

## 🗂 Lịch sử phiên gần đây (mới nhất trên cùng)

### 2026-07-15 — Claude / Hoàn tất GĐ 4-5 + fix video hướng dẫn
- Làm gì: merge GĐ 3+UI (`c12ef37`) → GĐ 4 sản phẩm cuối khóa (`b12d0f1`) → GĐ 5
  random nhóm (`e959b2e`), tất cả đã push production. Fix Vercel chặn deploy do
  git author là email công ty (viết lại toàn bộ lịch sử sang identity cá nhân,
  user tự force-push). Fix `/student/guide` nhận link YouTube đầy đủ.
- Kết quả: **dự án hoàn tất toàn bộ tính năng theo plan**, E2E 43/43.
- Việc để lại: không có task bắt buộc. Ý tưởng mở rộng: hiện nhóm thuyết trình cho
  HV xem (RLS đã cho phép SELECT, chỉ thiếu UI), đánh bóng UI, tính năng mới theo
  yêu cầu user.
