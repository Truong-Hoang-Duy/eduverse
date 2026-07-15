# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-16, bởi: Claude — /handoff)

**Đang làm:** KHÔNG có task dở, không có blocker về code. **5 giai đoạn + 3 đợt
cải tiến đều đã merge và chạy production**; `main` = `develop` = `origin` =
`fe5f4d5`; working tree sạch; không còn nhánh feature. Việc tiếp theo tùy yêu cầu
user — xem "Ý tưởng còn để ngỏ" ở cuối ROADMAP.md.

**Bắt đầu phiên sau thế nào:** đọc mục "Vấn đề đang mở" bên dưới TRƯỚC (có 1 việc
🔴 của user đang treo), rồi `git checkout develop && git checkout -b feature/<slug>`
**trước khi sửa bất kỳ dòng code nào**.

⚠️ **Bài học phiên này**: tôi đã lỡ commit thẳng 2 commit vào `main` (vi phạm
`.claude/rules/git-workflow.md`), phải `git branch feature/x <sha>` +
`git reset --hard origin/main` rồi merge lại đúng luồng. May là chưa push.

**Tiến độ (chi tiết ở ROADMAP.md):**
- [x] GĐ 1–5: auth username, khóa/lớp, buổi học + nhận xét AI, tin Zalo, chấm bài
      AI, sản phẩm cuối khóa + gallery, random nhóm thuyết trình
- [x] Đợt 1: đổi auth sang username, UI indigo, AI xưng "em", nhận xét tổng hợp/HV
- [x] Đợt 2: chấm bài viết lại (độc lập, không lưu), dark mode + stat card + popup
      + ConfirmDialog, khu HV chia tab, chặn file DLP, API key riêng từng người
- [x] Đợt 3: font Be Vietnam Pro, sửa khóa/mã lớp + chuyển lớp sang khóa khác,
      thêm HV bằng tìm kiếm, hồ sơ full width, responsive cho điện thoại
- [x] Deploy: Vercel + Render + Supabase — 0đ/tháng
- [x] **E2E 74/74 PASS** trên DB thật (chạy trong `web/`, tự tạo & tự dọn dữ liệu):

| Script | Số test | Lệnh |
|---|---|---|
| `e2e-phase1.mjs` | 13 | `node --env-file=.env.local scripts/e2e-phase1.mjs` |
| `e2e-phase2.mjs` | 10 | như trên |
| `e2e-phase5.mjs` | 8 | như trên |
| `e2e-api-key.mjs` | 8 | như trên |
| `e2e-class-admin.mjs` | 15 | như trên |
| `e2e-phase3.mjs` | 10 | **cần ai-service chạy** — thêm `--env-file=../ai-service/.env` |
| `e2e-phase4.mjs` | 10 | như phase3 |

Công cụ chẩn đoán: `scripts/check-integrity.mjs` (toàn vẹn dữ liệu),
`scripts/check-user.mjs <username>` (tra 1 tài khoản).

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
- **API key Gemini để ở bảng `user_secrets` riêng, KHÔNG phải cột trong `profiles`**
  — RLS Postgres theo DÒNG không theo CỘT, mà GV đọc được profile của HV và HV
  cùng lớp đọc được của nhau → để trong `profiles` là lộ key.
- **Font Be Vietnam Pro**, biến CSS phải tên `--font-sans` để khớp `@theme` trong
  globals.css. Đặt tên khác → font không áp mà KHÔNG báo lỗi gì (đã dính 1 lần:
  app chạy font mặc định trình duyệt suốt từ đầu dự án đến 2026-07-16).
- **Chuyển lớp sang khóa khác được**, nhưng `total_sessions` KHÔNG cho sửa —
  sessions sinh 1 lần bằng trigger lúc tạo lớp, đổi số sẽ lệch dữ liệu.

## ⚠️ Vấn đề đang mở / cần chú ý

### Việc USER cần làm (đang treo)
- 🔴 **Đề bài trong DB đang HỎNG, chấm bài sẽ báo lỗi**: file đề
  `Screenshot_...png` bị DLP công ty mã hóa (nội dung thật là "SECURE FILE : This
  file is encrypted"). User phải **xóa đề đó và tạo lại bằng file `.txt`/`.md`**
  (gõ đề vào Notepad rồi lưu). Hệ thống giờ chặn sớm + báo lỗi rõ, nhưng file cũ
  đã nằm trong DB từ trước khi có kiểm tra.
- 🟡 **Chưa ai test responsive bằng trình duyệt thật** — máy không có
  playwright/puppeteer, tôi chỉ rà tĩnh + sửa các chỗ chắc chắn tràn. User cần mở
  trên điện thoại (hoặc DevTools Ctrl+Shift+M) kiểm lại.
- 🟡 Tùy chọn: quay video cho mục "Lấy API key" ở tab Hướng dẫn (`VIDEOS.apikey`
  đang để trống nên hiện ô chờ).

### Ràng buộc môi trường (không sửa được, phải sống chung)
- **Migration phải dán tay vào Supabase SQL Editor** — mạng của user CHẶN cổng
  5432/6543, `supabase db push` không dùng được (chỉ cổng 443 mở). Gen types thì
  chạy được: `./node_modules/.bin/supabase gen types typescript --linked`.
- **DLP công ty mã hóa file** trên máy user → trình duyệt đọc ra bytes rác khi
  upload. Đã chặn ở `web/src/lib/file-check.ts` + `ai-service/app/storage.py`.
  Nếu sau này DLP mã hóa cả file code → cần thêm ô dán code dạng text.
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

### 2026-07-16 — Claude / Đợt 3 + merge Đợt 2 (`3e09924` → `fe5f4d5`)
**Xong & đã lên production:**
- Merge Đợt 2 (`feature/grading-rework-ui`, 8 commit → `7399f06`).
- Đợt 3 (`feature/class-admin-ui` → `c73a998`): font **Be Vietnam Pro**; GV sửa
  khóa học (mã/tên/mô tả) + mã lớp + **chuyển lớp sang khóa khác**; **thêm HV vào
  lớp bằng tìm kiếm tên/username** (RPC `search_students`, migration
  `20260717000000` — đã áp); hồ sơ full width 2 cột; rà responsive; nới khoảng
  cách nút/icon.
- File chính mới: `edit-course-dialog.tsx`, `classes/[id]/edit-class-dialog.tsx`,
  `classes/[id]/add-student-dialog.tsx`, `scripts/e2e-class-admin.mjs`.

**3 lỗi âm thầm tìm ra (đáng nhớ):**
1. `--font-sans` trong globals.css trỏ vào biến layout chưa từng đặt (layout đặt
   `--font-geist-sans`) → **app chạy font mặc định trình duyệt từ đầu dự án**,
   không hề báo lỗi. Sửa: đặt tên biến font là `--font-sans`.
2. 2 nút trong popup dính nhau do `ConfirmDialog` truyền `sm:gap-0` đè `gap-2`
   mặc định của `DialogFooter`.
3. Tôi commit thẳng vào `main` → phải tách nhánh + reset rồi merge lại.

**Kiểm chứng:** E2E **74/74** (`e2e-class-admin.mjs` 15/15 mới), pytest 4/4,
build sạch — chạy lại SAU merge chứ không chỉ trước.

**Còn treo:** xem mục "Vấn đề đang mở" — 🔴 đề bài trong DB bị DLP mã hóa (user
phải tạo lại bằng `.txt`/`.md`), 🟡 chưa test responsive trên trình duyệt thật.

### 2026-07-16 (trước) — Claude / API key riêng từng người
- Làm gì: thêm API key Gemini riêng cho GV + HV (`user_secrets`, migration
  `20260716000000`) + hướng dẫn lấy key ở `/profile` và tab Hướng dẫn.
- Kết quả: E2E 59/59, pytest 4/4, build sạch. Production đã có bản mới.
- Việc để lại: **user phải tạo lại đề bài** (file cũ bị DLP mã hóa nên không chấm
  được); có thể quay video cho mục "Lấy API key" trong tab Hướng dẫn (`VIDEOS.apikey`).

### 2026-07-15 — Claude / Đợt 2 (chấm bài + giao diện) & hoàn tất GĐ 4-5
- Đợt 2 (chi tiết ở ROADMAP): chấm bài thành công cụ độc lập không lưu gì, dark
  mode, stat card, popup, ConfirmDialog, khu HV chia tab, gallery ô từng người.
- Merge GĐ 4 (`b12d0f1`) + GĐ 5 (`e959b2e`) → hoàn tất toàn bộ tính năng theo plan.
- Chẩn đoán quan trọng: lỗi "Lỗi khi gọi AI" **không phải do nhiều file** — file
  đề bị DLP mã hóa (xem "Vấn đề đang mở"). Fix Vercel chặn deploy do git author
  là email công ty (xem "Ràng buộc môi trường"). Fix `/student/guide` nhận link
  YouTube đầy đủ chứ không chỉ ID.
