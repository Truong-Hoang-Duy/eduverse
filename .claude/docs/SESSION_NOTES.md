# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-16, bởi: Claude)

**Đang làm:** Không có task dở. **Toàn bộ 5 giai đoạn + 2 đợt cải tiến đã merge và
chạy trên production** (`main` = `develop` = `origin/main` = `7399f06`). Không còn
nhánh feature nào. Việc tiếp theo tùy yêu cầu mới của user — xem "Ý tưởng còn để
ngỏ" trong ROADMAP.md.

**Tiến độ (chi tiết ở ROADMAP.md):**
- [x] GĐ 1–5: auth username, khóa/lớp, buổi học + nhận xét AI, tin Zalo, chấm bài
      AI, sản phẩm cuối khóa + gallery, random nhóm thuyết trình
- [x] Đợt 1: đổi auth sang username, UI indigo, AI xưng "em", nhận xét tổng hợp/HV
- [x] Đợt 2: chấm bài viết lại (độc lập, không lưu), dark mode + stat card + popup
      + ConfirmDialog, khu HV chia tab, chặn file DLP, API key riêng từng người
- [x] Deploy: Vercel + Render + Supabase — 0đ/tháng
- [x] **E2E 59/59 PASS** trên DB thật: `e2e-phase{1..5}.mjs` + `e2e-api-key.mjs`
      (phase3/4 cần ai-service chạy vì gọi Gemini thật)

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
- Chấm bài (đã viết lại 2026-07-15): **công cụ độc lập, không theo lớp/học viên**.
  Chỉ lưu ĐỀ BÀI; file bài làm + kết quả KHÔNG lưu (gửi inline, copy xong là hết).
  AI trả `{score, bullets}` — điểm ô riêng, nhận xét gạch đầu dòng ngắn.
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

### 2026-07-16 (sau) — Claude / Đợt 3: font, sửa khóa/lớp, thêm HV
- Làm gì: font Be Vietnam Pro; GV sửa được khóa học + mã lớp; thêm HV vào lớp
  bằng tìm kiếm tên/username (RPC `search_students`, migration `20260717000000`);
  nới khoảng cách nút/icon.
- Phát hiện: `--font-sans` trong globals.css trỏ vào biến layout không hề đặt
  (layout đặt `--font-geist-sans`) → **app xưa nay chạy font mặc định trình
  duyệt, Geist chưa từng được áp**. Đã sửa bằng cách đặt tên biến `--font-sans`.
  Cũng tìm ra 2 nút trong popup dính nhau do `sm:gap-0` đè `gap-2` của DialogFooter.
- E2E: `e2e-class-admin.mjs` 15/15 (gồm: HV gọi RPC tìm kiếm → rỗng; chuyển lớp
  sang khóa khác không mất HV/buổi học).
- Bổ sung: chuyển lớp sang khóa học khác (trong popup Sửa lớp); hồ sơ full width;
  rà responsive toàn app (mọi grid nhiều cột có breakpoint).
- ⚠️ **Chưa test responsive bằng trình duyệt thật** — máy không có
  playwright/puppeteer và không tự thêm dependency. Mới rà tĩnh + sửa các chỗ
  chắc chắn tràn. Nếu user báo lỗi hiển thị trên điện thoại thì kiểm chỗ đó trước.

### 2026-07-16 — Claude / Merge Đợt 2 lên production
- Làm gì: merge `feature/grading-rework-ui` (8 commit) → develop → main → push
  (`7399f06`), xóa nhánh. Trước đó thêm API key riêng từng người + hướng dẫn lấy key.
- Kết quả: E2E 59/59, pytest 4/4, build sạch. Production đã có bản mới.
- Việc để lại: **user phải tạo lại đề bài** (file cũ bị DLP mã hóa nên không chấm
  được); có thể quay video cho mục "Lấy API key" trong tab Hướng dẫn (`VIDEOS.apikey`).

### 2026-07-15 (chiều) — Claude / Viết lại chấm bài + làm mới giao diện
- Làm gì: xem ROADMAP mục "Đợt 2" — chấm bài thành công cụ độc lập, dark mode,
  stat card, popup tạo/xóa, khu học viên chia tab, gallery dạng ô từng người.
- Phát hiện đáng nhớ: lỗi "Lỗi khi gọi AI" khi chấm KHÔNG do nhiều file — file đề
  (screenshot .png) bị **DLP công ty mã hóa**, nội dung thật là "SECURE FILE :
  This file is encrypted" → Gemini trả 400 "Unable to process input image".
  Đã chặn sớm + báo lỗi rõ. **User cần tạo lại đề bằng file .txt/.md hoặc file
  lưu ở thư mục không bị mã hóa.**
- Việc để lại: user duyệt → merge `feature/grading-rework-ui` → push.

### 2026-07-15 (sáng) — Claude / Hoàn tất GĐ 4-5 + fix video hướng dẫn
- Làm gì: merge GĐ 3+UI (`c12ef37`) → GĐ 4 sản phẩm cuối khóa (`b12d0f1`) → GĐ 5
  random nhóm (`e959b2e`), tất cả đã push production. Fix Vercel chặn deploy do
  git author là email công ty (viết lại toàn bộ lịch sử sang identity cá nhân,
  user tự force-push). Fix `/student/guide` nhận link YouTube đầy đủ.
- Kết quả: **dự án hoàn tất toàn bộ tính năng theo plan**, E2E 43/43.
- Việc để lại: không có task bắt buộc. Ý tưởng mở rộng: hiện nhóm thuyết trình cho
  HV xem (RLS đã cho phép SELECT, chỉ thiếu UI), đánh bóng UI, tính năng mới theo
  yêu cầu user.
