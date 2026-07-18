# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-18, bởi: Claude — /handoff)

**Đang làm:** Đợt 11 (cải tiến màn chiếu: nhập phút tùy ý + tổng kết lớp cho phụ
huynh) CODE XONG trên nhánh `feature/tv-screen-improvements` — **chờ user nghiệm
thu bằng mắt rồi mới merge/deploy**. GĐ 1–5 + Đợt 1–10 đã production.
**E2E 92/92**, pytest 4/4. Phiên 2026-07-18: Đợt 7→11.

- Đợt 4 (`feature/teacher-gallery-spec-viewer`): GV xem/nhận xét sản phẩm, xem nội
  dung đề bài, xóa là xóa sạch (Storage). **Đã production.**
- Đợt 5 (`feature/nav-loading-feedback`): phản hồi khi chuyển trang — khung xương
  + spinner + cache() profile. Prefetch sống lại (215B→10KB). **Đã production.**
- Đợt 6 (`feature/student-profile-timeline`): hồ sơ HV xuyên khóa cho GV (timeline
  nhận xét gốc + AI tổng hợp). 0 migration. **Đã production.**
- Đợt 7 (`feature/project-entry-improvements`): HV nhập sản phẩm — nút Xóa, chip
  chức năng, form controlled, validate link, AI chọn độ khó + "thêm tất cả",
  **trạng thái nộp** (migration `20260719000000` — user ĐÃ áp). **Đã production.**
- Đợt 8 (`feature/gallery-roster-visibility`): gallery HV hiện cả bạn CHƯA có sản
  phẩm (thẻ mờ) — policy `enrollments_classmates_select` thay policy self-only
  (migration `20260720000000`, ĐÃ áp); nhánh classmate trong `profiles_select` giờ
  mới thực sự chạy (trước bị RLS enrollments chặn ngầm subquery). **Đã production.**
- Đợt 9 (`feature/drop-status-restrict-comment-delete`): GỠ hẳn trạng thái nộp
  draft/submitted của Đợt 7 (drop cột `projects.status`, migration `20260721010000`)
  + xóa bình luận CHỈ chủ nhận xét (policy `project_comments_delete_own`, migration
  `20260721000000` — GV hết quyền moderation của Đợt 4). Cả 2 migration user ĐÃ áp.
  **Đã production.**
- Đợt 10 (`feature/tv-group-display-keepalive`): 3 màn chiếu TV cho lớp học
  (`tv-overlay.tsx` dùng chung) — random nhóm (thẻ màu + emoji, KHÔNG lưu nữa,
  bảng `presentation_groups` DROP ở `20260722000000` — dán SAU deploy), nghỉ giữa
  giờ (đếm ngược), thuyết trình sản phẩm (slideshow ← →). Kèm GitHub Action
  keep-alive Supabase (cần 2 secret SUPABASE_URL/SUPABASE_ANON_KEY). E2E phase5
  XÓA (−8), tổng 92. **Đã production.**
- Đợt 11 (`feature/tv-screen-improvements`): màn nghỉ nhập phút tùy ý (1–180);
  thuyết trình thêm chế độ **🎉 Tổng kết cả lớp** cho buổi gặp phụ huynh (lưới
  thẻ màu mọi sản phẩm, bấm thẻ nhảy về slide). UI thuần client, 0 migration.
  **Chờ nghiệm thu → deploy.**
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
- [x] **E2E 92/92 PASS** trên DB thật (chạy trong `web/`, tự tạo & tự dọn dữ liệu).
      ⚠️ Trước khi chạy phase3/4 (AI): `netstat :8000` chắc chỉ 1 listener ai-service
      — 2 instance chồng port → instance mới không bind, E2E gọi vào cái cũ → 502 giả:

| Script | Số test | Lệnh |
|---|---|---|
| `e2e-phase1.mjs` | 13 | `node --env-file=.env.local scripts/e2e-phase1.mjs` |
| `e2e-phase2.mjs` | 13 | như trên (gồm 3 check hồ sơ HV xuyên khóa) |
| `e2e-api-key.mjs` | 8 | như trên |
| `e2e-class-admin.mjs` | 15 | như trên |
| `e2e-gallery-storage.mjs` | 18 | như trên — GV xem/nhận xét SP, xóa sạch Storage, chỉ chủ xóa bình luận |
| `e2e-phase3.mjs` | 10 | **cần ai-service chạy** — thêm `--env-file=../ai-service/.env` |
| `e2e-phase4.mjs` | 15 | như phase3 (xóa SP, RLS, roster bạn cùng lớp) |

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
- **Thêm cột mới cho bảng đang dùng: áp migration TRƯỚC khi deploy code** đọc/ghi
  cột đó — không thì mọi lần ghi vỡ ("column does not exist"). Cột có DEFAULT thì
  an toàn với code CŨ đang chạy. Luồng: viết code → user dán migration → probe cột
  (script `select <col> limit 1`) → E2E → deploy (đã dùng cho `projects.status` Đợt 7).
- **`projects.features` giữ nguyên `text[]` (chỉ tên chức năng)** — mô tả cách làm
  của AI (`/suggest-features`) nối vào ô Ghi chú (`extra_notes`), KHÔNG đổi sang
  bảng con/JSONB.
- **KHÔNG có trạng thái nộp** (user chốt 2026-07-18, Đợt 9): cột `status` của Đợt 7
  đã DROP (`20260721010000`) — đừng hồi sinh. **Xóa bình luận: CHỈ chủ nhận xét**
  (`project_comments_delete_own`) — GV cũng không xóa được của học viên.
- **Random nhóm KHÔNG lưu** (user chốt 2026-07-18, Đợt 10): GV chiếu TV cho lớp,
  mỗi buổi random mới — bảng `presentation_groups` đã DROP (`20260722000000`),
  đừng hồi sinh. HV không cần trang xem nhóm.
- **DROP cột/bảng: deploy code TRƯỚC, dán migration SAU** (ngược với ADD cột) —
  code cũ SELECT đích danh là production 500. Đã dính 1 lần ở Đợt 9.

## ⚠️ Vấn đề đang mở / cần chú ý

### Việc USER cần làm
- 🟡 **`web/.env.example` KHÔNG có trong repo** — `web/.gitignore` có `.env*` mà
  THIẾU dòng `!.env.example` (root .gitignore có nên `ai-service` thì được). Máy
  clone mới không dùng được `cp .env.example .env.local`. Muốn sửa: thêm
  `!.env.example` vào `web/.gitignore` rồi commit file. Claude KHÔNG tự làm — không
  đọc được file env (chặn quyền), không commit thứ chưa xem (lỡ lộ key).

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chỉ mô phỏng logic server action, không gọi thẳng vào nó.** Nhiều script
  (VD `e2e-gallery-storage.mjs`, phần status/xóa trong `e2e-phase4.mjs`) tự thao tác
  DB y hệt action để kiểm RLS/cascade/Storage trên DB thật, nhưng thân hàm action thì
  test không chạm (Server Action không gọi được từ Node). Đổi action mà quên đổi
  script → test vẫn xanh. Validate link, form-sync sau lưu... phải nghiệm thu bằng mắt.
- 🟡 **SESSION_NOTES > 150 dòng** (~220) — luật là giữ ~150, xóa entry >2 tuần. Hiện
  mọi entry đều trong tuần (14–18/07) nên chưa xóa; qua đầu tháng 8 thì dọn Đợt 1–3.

### Ràng buộc môi trường (không sửa được, phải sống chung)
- **Migration phải dán tay vào Supabase SQL Editor** — mạng của user CHẶN cổng
  5432/6543, `supabase db push` không dùng được (chỉ cổng 443 mở). SQL Editor chạy
  trong 1 transaction: lỗi giữa chừng rollback HẾT. **SQL KHÔNG xóa được Storage**
  (bucket/objects) — lỗi `42501 protect_delete`, phải qua Storage API.
- **CLI supabase KHÔNG cài trong `node_modules`** → lệnh regen types phải là
  `corepack pnpm dlx supabase gen types typescript --linked > web/src/lib/database.types.ts`
  (cần `supabase login` + `link` 1 lần). ⚠️ Dấu `>` CẮT TRẮNG file trước khi lệnh
  chạy — CLI thiếu là file thành 0 byte, vỡ build. Lỡ thì `git checkout -- <file>`.
  Cách an toàn hơn khi chỉ thêm/bớt 1 cột: sửa tay `database.types.ts` (đã làm 2 lần).
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

### 2026-07-18 (Đợt 10) — Claude / Màn chiếu TV cho lớp học + keep-alive Supabase
Bối cảnh user: chia nhóm chỉ GV thấy, cắm TV cho lớp xem, mỗi buổi random mới →
bỏ lưu, DROP `presentation_groups` + xóa `saveGroups` + `e2e-phase5` (−8 test, còn
92). 3 màn chiếu dùng chung `components/tv-overlay.tsx` (fullscreen + Esc): random
nhóm (thẻ màu/emoji), nghỉ giữa giờ (đếm ngược 5/10/15ph, tạm dừng/+1ph), thuyết
trình sản phẩm (slideshow theo tên, phím ← →). Keep-alive: cron 2 ngày/lần gọi RPC
anon `list_available_classes` — cú gọi đã test HTTP 200 trên DB thật.
`e2e-gallery-storage` flake 1 lần (17/18 → rerun 18/18, nghi race Storage).
Hoàn tất trọn vẹn: migration drop ĐÃ dán (probe PGRST205), 2 GitHub secret ĐÃ tạo
(user suýt đặt tên `NEXT_PUBLIC_...` — tên secret phải đúng `SUPABASE_URL` /
`SUPABASE_ANON_KEY`), workflow keep-alive đã chạy thử OK.

### 2026-07-18 (Đợt 9) — Claude / Gỡ trạng thái nộp + chỉ chủ bình luận được xóa
User đổi ý về 2 tính năng: bỏ hẳn draft/submitted (Đợt 7) và bỏ moderation của GV
(Đợt 4). **Thứ tự DROP cột ngược với ADD**: sửa code bỏ tham chiếu → deploy →
mới drop cột (code cũ SELECT `status` đích danh; user lỡ drop trước deploy →
gallery production lỗi vài phút cho tới khi push). Policy siết (author-only
delete) thì áp trước deploy được — UI cũ chỉ bị "xóa hụt", không vỡ.
**Bẫy mới — socket ma port 8000:** kill python xong netstat vẫn báo PID cũ
LISTENING và curl vẫn trả lời (handle bị kế thừa) → uvicorn mới bind fail dù
tasklist không thấy tiến trình. Lối thoát: chạy port khác + env `AI_SERVICE_URL`
(mọi script E2E đều đọc biến này). E2E phase4 17→15, gallery-storage 17→18,
tổng **100/100**.

### 2026-07-18 (Đợt 8) — Claude / Gallery hiện cả bạn chưa có sản phẩm
Ý tưởng để ngỏ cuối cùng cần migration. Policy `enrollments_classmates_select`
(`is_enrolled` SECURITY DEFINER — không đệ quy) thay `enrollments_student_select`.
**Phát hiện:** nhánh "HV xem profile bạn cùng lớp" của `profiles_select` xưa nay
KHÔNG chạy — subquery trên enrollments chịu RLS nên không thấy dòng của bạn; mở
enrollments xong nhánh này mới sống, join tên trong gallery mới đúng. UI: prop
`membersWithoutProject` trong `ProjectGrid` (thẻ mờ, không bấm được); page query
roster 1 lần thay vì chỉ enrollment của mình — an toàn khi migration chưa áp
(RLS cũ chỉ trả dòng của mình). E2E phase4 14→17, tổng **101/101**.

### 2026-07-17→18 (Đợt 7) — Claude / Cải tiến HV nhập sản phẩm + sửa README
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

### 2026-07-16 — Đợt 4/5/6 + dọn dẹp (đều ĐÃ PRODUCTION, chi tiết ở ROADMAP)
- **Đợt 4** (`/teacher/gallery`): GV xem/nhận xét sản phẩm + xem đề bài
  (`getAssignmentSpec`, link ký 10ph) + xóa dọn cả file Storage. Lỗi âm thầm: cleanup
  E2E xóa tài khoản TRƯỚC khóa → `deleteUser` fail bị nuốt → rò tài khoản (đã sửa).
- **Đợt 5** (phản hồi chuyển trang): `loading.tsx` + `PageSkeleton` + spinner
  `useLinkStatus` + `cache()` profile. Prefetch route dynamic chỉ tới ranh giới
  `loading` → trước đó rỗng (đo 215B→10KB); tra profile 2→1 lần/request.
- **Đợt 6** (hồ sơ HV xuyên khóa cho GV): `/teacher/classes/[id]/students/[studentId]`
  — timeline nhận xét + AI tổng hợp, tái dùng query của `generateStudentSummary` nên
  0 migration; `StudentSummaryPanel` thêm prop `lockedStudent`.
- **Dọn dẹp**: xóa 5 file `ui/` + 2 dep mồ côi (`sonner`/`next-themes`); DROP schema
  chết + bucket + type; rà lại toàn bộ docs.
- **Mẹo còn giá trị:** script admin (service key) phải đặt TRONG `web/scripts/` — Node
  phân giải package theo vị trí script, để ngoài là `ERR_MODULE_NOT_FOUND`.

### 2026-07-15 — GĐ 1-5 + Đợt 1-3 + API key (nền tảng, đã production, chi tiết ở ROADMAP)
Auth username, khóa/lớp, buổi + nhận xét AI, Zalo, chấm bài, sản phẩm + gallery, random
nhóm. Font Be Vietnam Pro, API key riêng (`user_secrets`). **Lỗi âm thầm đáng nhớ:**
`--font-sans` trỏ vào biến layout chưa đặt → app chạy font mặc định trình duyệt từ đầu
dự án mà không báo lỗi; lỗi "Lỗi khi gọi AI" hóa ra do file đề bị DLP mã hóa.
