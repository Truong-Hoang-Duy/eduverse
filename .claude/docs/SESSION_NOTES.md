# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-16, bởi: Claude — /handoff)

**Đang làm:** KHÔNG có task dở. **Đợt 4 + Đợt 5 đã merge và đẩy lên production**
(develop → main → push, Vercel + Render tự deploy). GĐ 1–5 + Đợt 1–5 đều đang chạy.
Không nhánh feature nào còn treo. Việc tiếp theo tùy user — xem "Ý tưởng còn để
ngỏ" cuối ROADMAP.md.

- Đợt 4 (`feature/teacher-gallery-spec-viewer`): GV xem/nhận xét sản phẩm, xem nội
  dung đề bài, xóa là xóa sạch (Storage). E2E 91/91.
- Đợt 5 (`feature/nav-loading-feedback`): phản hồi khi chuyển trang — khung xương
  + spinner trên link + cache() profile. Prefetch sống lại (215B→10KB).

**Bắt đầu phiên sau thế nào:** `git checkout develop && git checkout -b feature/<slug>`
**trước khi sửa bất kỳ dòng code nào**.

⚠️ **Bài học (2026-07-16)**: Claude đã lỡ commit thẳng 2 commit vào `main` (vi phạm
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
- [x] **E2E 91/91 PASS** trên DB thật (chạy trong `web/`, tự tạo & tự dọn dữ liệu):

| Script | Số test | Lệnh |
|---|---|---|
| `e2e-phase1.mjs` | 13 | `node --env-file=.env.local scripts/e2e-phase1.mjs` |
| `e2e-phase2.mjs` | 10 | như trên |
| `e2e-phase5.mjs` | 8 | như trên |
| `e2e-api-key.mjs` | 8 | như trên |
| `e2e-class-admin.mjs` | 15 | như trên |
| `e2e-gallery-storage.mjs` | 17 | như trên — GV xem/nhận xét SP + xóa sạch Storage |
| `e2e-phase3.mjs` | 10 | **cần ai-service chạy** — thêm `--env-file=../ai-service/.env` |
| `e2e-phase4.mjs` | 10 | như phase3 |

Công cụ chẩn đoán: `scripts/check-integrity.mjs` (toàn vẹn dữ liệu),
`scripts/check-user.mjs <username>` (tra 1 tài khoản),
`scripts/purge-test-users.mjs [--yes]` (dọn tài khoản rác của E2E, mặc định xem thử).

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
- **Chấm bài vẫn KHÔNG lưu gì** (user xác nhận lại 2026-07-16 khi làm Đợt 4):
  chỉ lưu ĐỀ BÀI + xem được nội dung đề trên giao diện; file bài làm và kết quả
  chấm không lưu. Đừng hồi sinh `submissions`/`grades`.
- **File chỉ lên Storage khi dòng DB chắc chắn được tạo** — upload sớm từ client
  là nguồn rác không ai dọn. Xóa dòng có file thì phải xóa file (Storage không
  cascade như FK).

## ⚠️ Vấn đề đang mở / cần chú ý

### Việc USER cần làm
- 🟡 **Nghiệm thu Đợt 4 + Đợt 5 bằng mắt trên production** (máy không có playwright):
  - Đợt 4: mở `/teacher/gallery` + nút 👁 "Xem đề" ở trang chấm bài.
  - Đợt 5: **DevTools → Network → Throttling "Slow 4G"** (bắt buộc, mạng nhanh che
    mất hiện tượng) → bấm nav: chữ mờ + spinner NGAY, rồi khung xương, rồi nội dung.
    Thử cả `/teacher/classes/[id]` (7 query, ca tệ nhất) và 3 tab của học viên.

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chỉ mô phỏng logic server action, không gọi thẳng vào nó.** Script
  `e2e-gallery-storage.mjs` tự upload/xóa file y hệt `deleteAssignment` để kiểm
  RLS + cascade + Storage trên DB thật, nhưng thân hàm action thì test không chạm
  tới (Server Action không gọi được từ Node). Đổi logic trong action mà quên đổi
  script là test vẫn xanh — cẩn thận.
- 🟡 Bảng `submissions`/`grades` + bucket `submissions` vẫn là **schema chết**
  (user chốt giữ lại). Đừng dùng cho tính năng mới.

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
- Trang `/student/guide`: **cả 4 video đã điền** (github/drive/deploy/apikey); sửa
  link trong biến `VIDEOS` ở đầu file.

## 🗂 Lịch sử phiên gần đây (mới nhất trên cùng)

### 2026-07-16 (Đợt 5) — Claude / Phản hồi khi chuyển trang — ĐÃ MERGE PRODUCTION
User báo "bấm chuyển trang không có hiện tượng gì". Không phải cảm giác: **toàn dự
án không có một `loading.tsx` hay `<Suspense>` nào** → React không có gì để hiện,
giữ nguyên trang cũ.

**Làm 3 lớp (cần cả 3, không bỏ lớp nào):**
- `loading.tsx` cho teacher/student/profile + `PageSkeleton` chung + `ui/skeleton.tsx`.
- `NavLinkLabel` dùng `useLinkStatus` → spinner ngay trên link vừa bấm (client-side).
- `cache()` cho profile lookup trong `get-profile.ts`.

**Vì sao cần cả khung xương lẫn spinner:** `loading.tsx` nằm BÊN TRONG layout nên
KHÔNG che được `await requireRole()` của chính layout → vào khu vực từ ngoài / F5
thì khung xương không kịp hiện; spinner chạy ở client mới phủ được ca đó.

**Đo được (không phải phỏng đoán):**
- Prefetch `/teacher/settings` trên production build: **215 bytes → 10.328 bytes**
  sau khi có `loading.tsx`. Route dynamic chỉ prefetch tới ranh giới loading gần
  nhất → trước đây prefetch **trả về rỗng**, tức `<Link>` prefetch vô dụng suốt.
- Tra profile mỗi request: `/teacher/settings` và `/profile` **2 lần → 1 lần**.
- Cách đo: dựng cookie phiên thật (`base64-` + base64url(JSON session), tên
  `sb-<ref>-auth-token`) rồi `fetch` kèm header `RSC: 1` + `Next-Router-Prefetch: 1`.
  Script đã xóa sau khi đo — chép lại từ đây nếu cần đo lần nữa.

**Bẫy đã dính:** chạy `pnpm build` trong khi `pnpm dev` đang chạy → `.next` bị giẫm
→ mọi request 500 `ENOENT _buildManifest.js.tmp`. Không phải lỗi code (notes cũ đã
cảnh báo). Tắt dev trước khi build, hoặc test bằng `pnpm start`.

**Cố ý không làm:** thanh chạy ngang đầu trang (cần dep), `error.tsx`, đổi matcher
middleware (footgun: soft-nav mãi không refresh token → văng ra `/login`).

### 2026-07-16 (Đợt 4) — Claude / GV xem sản phẩm + xem đề + xóa sạch — ĐÃ MERGE
E2E 91/91, pytest 4/4, lint/typecheck/build sạch, smoke test `/teacher/gallery`
→ 307 về `/login` (guard OK).

**1. GV xem + nhận xét sản phẩm** (`/teacher/gallery`): hóa ra **RLS đã cho phép sẵn**
(`projects_class_select`, `project_comments_*` đều có `is_teacher_of_class`) — chỉ
thiếu UI, KHÔNG cần migration. Tách `ProjectGrid`/`CommentSection` từ route học viên
sang `components/gallery/` dùng chung; thêm prop `canModerate` (GV xóa nhận xét bất kỳ).

**2. Xem đề bài**: nút 👁 ở thẻ đề + link "Xem đề" khi chấm → `getAssignmentSpec`.
Text đọc thẳng, ảnh/PDF qua link ký 10 phút (bucket private). Dùng `<img>` thường
+ eslint-disable, KHÔNG `next/image` (link ký đổi mỗi lần mở → tối ưu vô nghĩa,
lại phải khai remotePatterns).

**3. Xóa sạch** — sửa tận gốc chứ không vá:
- `deleteAssignment`/`deleteCourse` dọn file Storage (đọc path TRƯỚC khi xóa dòng).
- **Upload file đề chuyển từ client (lúc chọn file) vào `createAssignment` (lúc bấm
  tạo)** — gốc rễ của rác: đổi file/đóng popup/tạo hụt đều bỏ lại file. Tạo dòng
  hỏng thì tự `removeSpecFiles`.
- `deleteProject` xưa nay chỉ revalidate `/student/projects` → gallery còn cache
  sản phẩm đã xóa. Gom thành `revalidateGallery()` cho cả 3 trang.

**Lỗi âm thầm tìm ra:** chạy E2E xong đếm lại thấy auth tăng 11→12. Truy ra
**cleanup của 7 script E2E xóa tài khoản TRƯỚC khóa học**, mà
`student_reviews.created_by` không cascade → `deleteUser` fail, lại **nuốt lỗi**
(không kiểm `{ error }`) → mỗi lần chạy phase2/phase3 đẻ thêm 1 tài khoản rác.
Đã đảo thứ tự + log lỗi ở cả 7 script; chạy lại phase2 2 lần → vẫn 12, không tăng.

### 2026-07-16 (sau) — Claude / Dọn đề hỏng trong production — KHÔNG đổi code
Dòng `assignments` user đã xóa từ trước; thứ sót lại là **file mồ côi trong bucket**
(`...Screenshot_2026-07-15_081257.png`, 57 KB, 512 byte đầu = `SECURE FILE : This
file is encrypted`) — vì `deleteAssignment` không xóa file (Đợt 4 đã sửa). Sao lưu
rồi xóa; bucket + bảng đều rỗng. 2 việc 🟡 cũ: responsive user tự kiểm OK; video
API key thì note cũ ghi sai — `VIDEOS.apikey` có link từ `1362cf9`, chưa bao giờ trống.

**Mẹo:** script admin dùng `SUPABASE_SERVICE_ROLE_KEY` phải đặt TRONG `web/scripts/`
— Node phân giải package theo vị trí script, để ngoài là `ERR_MODULE_NOT_FOUND`.

### 2026-07-16 — Claude / Đợt 3 + merge Đợt 2 (`3e09924` → `fe5f4d5`)
Đợt 3 (`c73a998`): font Be Vietnam Pro; GV sửa khóa/mã lớp + chuyển lớp sang khóa
khác; thêm HV bằng tìm kiếm (RPC `search_students`, migration `20260717000000`);
hồ sơ full width; responsive. Merge Đợt 2 (`7399f06`). E2E 74/74, pytest 4/4.

**Lỗi âm thầm đáng nhớ:** `--font-sans` trong globals.css trỏ vào biến layout chưa
từng đặt (layout đặt `--font-geist-sans`) → **app chạy font mặc định trình duyệt từ
đầu dự án**, không báo lỗi gì. Và `ConfirmDialog` truyền `sm:gap-0` đè `gap-2` của
`DialogFooter` → 2 nút dính nhau.

### 2026-07-16 (trước) — Claude / API key riêng từng người (`1362cf9`)
API key Gemini riêng cho GV + HV (`user_secrets`, migration `20260716000000`) +
hướng dẫn lấy key ở `/profile` và tab Hướng dẫn. E2E 59/59.

### 2026-07-15 — Claude / Đợt 2 (chấm bài + giao diện) & hoàn tất GĐ 4-5
Chấm bài thành công cụ độc lập không lưu gì; dark mode, stat card, popup,
ConfirmDialog, khu HV chia tab, gallery ô từng người. Merge GĐ 4 (`b12d0f1`) +
GĐ 5 (`e959b2e`). Chẩn đoán đáng nhớ: lỗi "Lỗi khi gọi AI" **không phải do nhiều
file** mà do file đề bị DLP mã hóa; Vercel chặn deploy vì git author là email công ty.
