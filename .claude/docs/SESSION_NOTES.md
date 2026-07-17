# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-16, bởi: Claude — /handoff)

**Đang làm:** KHÔNG có task dở. GĐ 1–5 + Đợt 1–7 + dọn dẹp đều đã production.
Không nhánh feature nào treo. **E2E 98/98**, pytest 4/4. Việc tiếp tùy user.

- Đợt 4 (`feature/teacher-gallery-spec-viewer`): GV xem/nhận xét sản phẩm, xem nội
  dung đề bài, xóa là xóa sạch (Storage). **Đã production.**
- Đợt 5 (`feature/nav-loading-feedback`): phản hồi khi chuyển trang — khung xương
  + spinner + cache() profile. Prefetch sống lại (215B→10KB). **Đã production.**
- Đợt 6 (`feature/student-profile-timeline`): hồ sơ HV xuyên khóa cho GV (timeline
  nhận xét gốc + AI tổng hợp). 0 migration. **Đã production.**
- Đợt 7 (`feature/project-entry-improvements`): HV nhập sản phẩm — nút Xóa, chip
  chức năng, form controlled, validate link, AI chọn độ khó + "thêm tất cả",
  **trạng thái nộp** (migration `20260719000000` — user ĐÃ áp). **Đã production.**
- Dọn dẹp: xóa 5 file `ui/` không dùng + gỡ dep `sonner`/`next-themes`; **XÓA XONG**
  schema chết `submissions`/`grades` (user dán SQL) + bucket (Storage API) + type
  chết trong `database.types.ts` (bỏ tay 2 khối). **Đã production.**

✅ **Schema chết đã dọn HẾT** (không còn việc thủ công): 2 bảng dropped (user chạy
SQL, xác minh qua PostgREST live schema — không còn phơi ra); bucket xóa qua
`scripts/drop-submissions-bucket.mjs`; `database.types.ts` bỏ 2 khối type.
⚠️ **Bài học:** lệnh `... > database.types.ts` với CLI supabase KHÔNG cài local →
lệnh lỗi nhưng dấu `>` đã CẮT TRẮNG file trước → suýt vỡ build. CLI supabase không
có ở `node_modules/.bin/`; muốn regen phải `pnpm dlx supabase` + login + link.

**Bắt đầu phiên sau thế nào:** `git checkout develop && git checkout -b feature/<slug>`
**trước khi sửa bất kỳ dòng code nào** (đừng commit thẳng vào main/develop).

**Tiến độ (chi tiết ở ROADMAP.md):**
- [x] GĐ 1–5: auth username, khóa/lớp, buổi học + nhận xét AI, tin Zalo, chấm bài
      AI, sản phẩm cuối khóa + gallery, random nhóm thuyết trình
- [x] Đợt 1: đổi auth sang username, UI indigo, AI xưng "em", nhận xét tổng hợp/HV
- [x] Đợt 2: chấm bài viết lại (độc lập, không lưu), dark mode + stat card + popup
      + ConfirmDialog, khu HV chia tab, chặn file DLP, API key riêng từng người
- [x] Đợt 3: font Be Vietnam Pro, sửa khóa/mã lớp + chuyển lớp sang khóa khác,
      thêm HV bằng tìm kiếm, hồ sơ full width, responsive cho điện thoại
- [x] Deploy: Vercel + Render + Supabase — 0đ/tháng
- [x] **E2E 94/94 PASS** trên DB thật (chạy trong `web/`, tự tạo & tự dọn dữ liệu).
      ⚠️ Trước khi chạy phase3/4 (AI): `netstat :8000` chắc chỉ 1 listener ai-service
      — 2 instance chồng port → instance mới không bind, E2E gọi vào cái cũ → 502 giả:

| Script | Số test | Lệnh |
|---|---|---|
| `e2e-phase1.mjs` | 13 | `node --env-file=.env.local scripts/e2e-phase1.mjs` |
| `e2e-phase2.mjs` | 13 | như trên (gồm 3 check hồ sơ HV xuyên khóa) |
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
- 🔴 **Merge Đợt 6** (`feature/student-profile-timeline`) → develop → main → push.
  Chỉ đụng docs + web (không ai-service). Conflict docs với origin có thể xảy ra nếu
  Đợt 4+5 đã đổi cùng vùng — resolve tay như lần trước.
- 🟡 **Nghiệm thu bằng mắt trên production** (máy không có playwright):
  - Đợt 6: vào 1 lớp → bấm tên HV trong bảng → trang hồ sơ hiện timeline nhận xét
    + thẻ số liệu + nút AI tổng hợp chạy. HV chưa nhận xét → empty state.
  - Đợt 4: mở `/teacher/gallery` + nút 👁 "Xem đề" ở trang chấm bài.
  - Đợt 5: **DevTools → Network → Throttling "Slow 4G"** → bấm nav: chữ mờ + spinner
    NGAY, rồi khung xương, rồi nội dung. Thử `/teacher/classes/[id]` + 3 tab HV.

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chỉ mô phỏng logic server action, không gọi thẳng vào nó.** Script
  `e2e-gallery-storage.mjs` tự upload/xóa file y hệt `deleteAssignment` để kiểm
  RLS + cascade + Storage trên DB thật, nhưng thân hàm action thì test không chạm
  tới (Server Action không gọi được từ Node). Đổi logic trong action mà quên đổi
  script là test vẫn xanh — cẩn thận.
- ✅ Schema chết `submissions`/`grades` + bucket: đã có migration xóa (Đợt dọn dẹp).
  Chờ user dán tay + regen types (xem mục ⚠️ ở "Trạng thái hiện tại").

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

### 2026-07-17 (Đợt 7) — Claude / Cải tiến HV nhập sản phẩm + sửa README
Khảo sát tìm ra: **không có nút Xóa** (`deleteProject` viết rồi mà chưa nối UI),
textarea "mỗi dòng một chức năng" dễ lỗi, 4 trường `defaultValue` nên form không
phản ánh sau khi lưu, không validate link, AI bỏ mất mô tả cách làm. Làm cả 3 hướng
user chọn: hoàn thiện form + AI tốt hơn + trạng thái nộp.

**Thứ tự bắt buộc (nhớ cho lần sau):** code ghi cột mới → **áp migration TRƯỚC khi
deploy**, không thì mọi lần lưu vỡ. Đã: code → user dán migration → probe cột →
E2E 98/98 → deploy. Cột thêm có DEFAULT nên an toàn với code đang chạy.

**Thiết kế:** `features` vẫn `text[]` (chỉ tên) → mô tả cách làm của AI nối vào ô
**Ghi chú** để không mất.

**Sửa README (5 lỗi thật):** 74→**98** test (phase2 13, phase4 14, thiếu hẳn
`e2e-gallery-storage` 17); lệnh regen types trỏ `./node_modules/.bin/supabase`
**không tồn tại** — lệnh lỗi nhưng `>` đã cắt trắng `database.types.ts` (đã xảy ra
thật); `cp .env.example .env.local` **hỏng trên clone mới** vì `web/.gitignore` có
`.env*` KHÔNG kèm `!.env.example` → `web/.env.example` chưa bao giờ vào repo (root
.gitignore có nên ai-service thì được); thiếu `purge-test-users`; thiếu bẫy 2
ai-service chồng cổng 8000.

**Để ngỏ cho user:** muốn `cp .env.example` chạy trên máy mới → thêm `!.env.example`
vào `web/.gitignore` rồi commit file. Claude KHÔNG tự làm: không đọc được file env
(chặn quyền) mà không commit thứ chưa xem (lỡ có key thật).

### 2026-07-16 (Dọn dẹp) — Claude / Xóa code + schema thừa + rà docs
User: "chỉnh sửa tài liệu đầy đủ, deploy, dọn dẹp phần dư thừa". Khảo sát trước khi
xóa: đếm lượt dùng từng `ui/*` → 5 file 0 lượt (avatar, checkbox, radio-group,
sonner, tabs); truy dep → `sonner` + `next-themes` chỉ được `ui/sonner.tsx` dùng
(dark mode dùng `documentElement.classList`, không cần next-themes). Xóa 5 file +
`pnpm remove sonner next-themes` → typecheck/build vẫn sạch. Schema chết
`submissions`/`grades` (user trước chốt giữ, giờ chốt xóa): migration
`20260718000000` DROP + thu policy storage về 1 bucket — **user dán tay + regen
types**. Rà docs: DATABASE bỏ schema chết; ARCHITECTURE sửa auth email→username,
Storage bỏ "bài nộp", model → `gemini-flash-latest`, thêm hồ sơ HV; AI-SERVICE sửa
model; CLAUDE cập nhật luật schema chết.

### 2026-07-16 (Đợt 6) — Hồ sơ HV xuyên khóa (GV) — ĐÃ PRODUCTION
Trang `/teacher/classes/[id]/students/[studentId]` (bấm tên HV trong bảng lớp):
timeline nhận xét gốc từng buổi + 3 thẻ số liệu + AI tổng hợp. Query GIỐNG
`generateStudentSummary` (đã chạy prod) nên RLS chắc chắn OK → **0 migration**.
`StudentSummaryPanel` thêm prop `lockedStudent` (tương thích ngược). HV KHÔNG xem
nhận xét (giữ ranh giới cũ). **Bẫy:** phase3/4 fail 502 hóa ra do **2 ai-service
chồng port 8000** (cái mới không bind, gọi vào cái cũ) — không phải lỗi code.

### 2026-07-16 (Đợt 4+5) — Deploy 2 đợt lên production (`7dc5b8d..22121c6`)
Merge Đợt 4 rồi Đợt 5 → develop → main. Conflict docs resolve tay. Dọn 11 tài khoản
test rác (`purge-test-users --yes`) → auth prod còn 2 user thật. phase3/4 lúc đó
flake do **Gemini 503 (Google quá tải)** — độc lập với deploy.

### 2026-07-16 (Đợt 5) — Phản hồi khi chuyển trang — ĐÃ PRODUCTION
`loading.tsx` (teacher/student/profile) + `PageSkeleton` + `NavLinkLabel`
(`useLinkStatus`, spinner client-side) + `cache()` profile. **Cần cả khung xương
lẫn spinner** vì `loading.tsx` nằm TRONG layout, không che được `requireRole()` khi
vào từ ngoài/F5. Đo: prefetch `/teacher/settings` 215B→10.328B (route dynamic chỉ
prefetch tới ranh giới loading → trước đó prefetch rỗng); tra profile 2→1 lần/request.
**Bẫy:** `pnpm build` khi `pnpm dev` đang chạy → `.next` giẫm nhau → 500 `ENOENT
_buildManifest`. Tắt dev trước khi build.

### 2026-07-16 (Đợt 4) — GV xem sản phẩm + xem đề + xóa sạch — ĐÃ PRODUCTION
`/teacher/gallery` (RLS đã cho sẵn, chỉ thiếu UI; tách `components/gallery/` dùng
chung + prop `canModerate`); xem nội dung đề bài (`getAssignmentSpec`, link ký 10ph
cho ảnh/PDF); `deleteAssignment`/`deleteCourse` dọn file Storage, upload đề chuyển
vào `createAssignment`. **Lỗi âm thầm:** cleanup 7 script E2E xóa tài khoản TRƯỚC
khóa (`student_reviews.created_by` không cascade → `deleteUser` fail bị nuốt lỗi →
rò tài khoản rác). Đã đảo thứ tự + log lỗi.

### 2026-07-16 (sau) — Dọn đề hỏng trong production — KHÔNG đổi code
File đề **mồ côi trong bucket** (bị DLP mã hóa: `SECURE FILE : This file is
encrypted`) — dòng DB user đã xóa nhưng file ở lại vì `deleteAssignment` khi đó chưa
xóa file (Đợt 4 sửa). Đã sao lưu rồi xóa. **Mẹo:** script admin dùng
`SUPABASE_SERVICE_ROLE_KEY` phải đặt TRONG `web/scripts/` — Node phân giải package
theo vị trí script, để ngoài là `ERR_MODULE_NOT_FOUND`.

### 2026-07-15→16 — Đợt 1-3 + API key + GĐ 4-5 (đều đã production, chi tiết ở ROADMAP)
Đợt 3 (`c73a998`): font Be Vietnam Pro, sửa khóa/mã lớp + chuyển lớp, thêm HV bằng
tìm kiếm (`search_students`), responsive. Đợt 2 (`7399f06`): chấm bài độc lập không
lưu, dark mode, ConfirmDialog, khu HV chia tab. API key riêng từng người
(`user_secrets`). **2 lỗi âm thầm đáng nhớ:** (1) `--font-sans` trỏ vào biến layout
chưa từng đặt → app chạy font mặc định trình duyệt từ đầu dự án, không báo lỗi;
(2) lỗi "Lỗi khi gọi AI" hóa ra do file đề bị DLP mã hóa, không phải do nhiều file.
