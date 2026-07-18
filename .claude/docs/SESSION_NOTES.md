# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-18, bởi: Claude)

**Đang làm:** KHÔNG có task dở. GĐ 1–5 + Đợt 1–12 đều đã production;
`main` = `develop` = `origin`; working tree sạch; không nhánh feature nào treo.
**E2E 95/95**, pytest 4/4. Việc tiếp tùy user.

**Sản phẩm hiện có** (nghiệp vụ chi tiết ở FEATURES.md, lịch sử ở ROADMAP.md):
- Auth USERNAME (không email), khóa → lớp → buổi, nhận xét AI theo buổi + tổng
  hợp từng HV, tin Zalo chung lớp, chấm bài AI độc lập (không lưu bài/điểm),
  sản phẩm cuối khóa + gallery (HV + GV, hiện cả bạn chưa có SP), hồ sơ HV
  xuyên khóa, API key Gemini riêng từng người.
- 3 màn chiếu TV trong trang lớp (`components/tv-overlay.tsx`): random nhóm
  (không lưu), nghỉ giữa giờ (đếm ngược, nhập phút tùy ý), thuyết trình sản
  phẩm (slide từng em + màn 🎉 tổng kết lớp cho phụ huynh).
- Đổi mật khẩu không cần mật khẩu cũ (`/profile`) + GV reset mật khẩu HV quên
  (nút 🔑 bảng học viên — đường cứu duy nhất vì auth username không có email).
- GitHub Action keep-alive Supabase 2 ngày/lần (secrets đã tạo, đã chạy thử).

**Bắt đầu phiên sau thế nào:** `git checkout develop && git checkout -b feature/<slug>`
**trước khi sửa bất kỳ dòng code nào** (đừng commit thẳng vào main/develop).

**E2E 95/95 PASS** trên DB thật (chạy trong `web/`, tự tạo & tự dọn dữ liệu):

| Script | Số test | Lệnh |
|---|---|---|
| `e2e-phase1.mjs` | 13 | `node --env-file=.env.local scripts/e2e-phase1.mjs` |
| `e2e-phase2.mjs` | 13 | như trên (gồm 3 check hồ sơ HV xuyên khóa) |
| `e2e-api-key.mjs` | 8 | như trên |
| `e2e-class-admin.mjs` | 18 | như trên (gồm 3 check đổi/đặt lại mật khẩu) |
| `e2e-gallery-storage.mjs` | 18 | như trên — gallery GV, xóa sạch Storage, chỉ chủ xóa bình luận |
| `e2e-phase3.mjs` | 10 | **cần ai-service chạy** — thêm `--env-file=../ai-service/.env` |
| `e2e-phase4.mjs` | 15 | như phase3 (xóa SP, RLS, roster bạn cùng lớp) |

⚠️ Trước khi chạy phase3/4: chỉ được có MỘT ai-service. Nếu port 8000 kẹt
"socket ma" (tiến trình chết mà listener vẫn trả lời) → chạy port khác + env
`AI_SERVICE_URL=http://localhost:<port>` (mọi script E2E đều đọc biến này).

Công cụ chẩn đoán: `scripts/check-integrity.mjs` (toàn vẹn dữ liệu),
`scripts/check-user.mjs <username>` (tra 1 tài khoản),
`scripts/purge-test-users.mjs [--yes]` (dọn tài khoản rác E2E, mặc định xem thử).

## 📌 Quyết định đã chốt (không hỏi lại)

- Stack: Next.js 15 + TS + Tailwind + shadcn/ui (Vercel) / Supabase (DB + Auth +
  Storage + RLS) / Python FastAPI + Gemini (Render free). Mục tiêu 0đ/tháng.
- **Auth bằng USERNAME**, email ảo `<username>@eduverse.local` qua admin API;
  đăng nhập qua RPC `get_email_by_username`. KHÔNG thu thập email/tuổi/trường.
- Model Gemini: **`gemini-flash-latest`** (alias — `gemini-2.5-flash` bị Google
  khóa với key mới từ 2026). Client cache bằng `lru_cache`.
- Zalo: KHÔNG dùng API — AI soạn tin, GV bấm Copy. Tin nhận xét CHUNG cả lớp,
  không nêu tên. Xưng hô với học viên trong mọi output AI: **"em"**, cấm "con".
- Đề bài thuộc KHÓA + số buổi (mỗi buổi một đề), dùng chung mọi lớp cùng khóa.
- **Chấm bài là công cụ độc lập, KHÔNG lưu gì** ngoài đề bài — bảng
  `submissions`/`grades` + bucket đã XÓA, đừng hồi sinh.
- **API key Gemini ở bảng `user_secrets`** (RLS chỉ chính chủ), KHÔNG phải cột
  trong `profiles` — RLS theo DÒNG, để trong profiles là lộ key.
- **Font Be Vietnam Pro**, biến CSS phải tên `--font-sans` khớp `@theme` —
  đặt tên khác là font không áp mà KHÔNG báo lỗi.
- Lớp chuyển được sang khóa khác nhưng `total_sessions` KHÔNG cho sửa
  (sessions sinh 1 lần bằng trigger lúc tạo lớp).
- **`projects.features` là `text[]` chỉ tên chức năng** — mô tả cách làm của AI
  nối vào ô Ghi chú (`extra_notes`), không đổi sang bảng con/JSONB.
- **KHÔNG có trạng thái nộp sản phẩm** (Đợt 9): cột `status` đã DROP — đừng hồi
  sinh. **Xóa bình luận: CHỈ chủ nhận xét** (`project_comments_delete_own`) —
  GV cũng không xóa được của học viên.
- **Random nhóm KHÔNG lưu** (Đợt 10): GV chiếu TV, mỗi buổi random mới — bảng
  `presentation_groups` đã DROP, HV không cần trang xem nhóm.
- **Đổi mật khẩu không cần mật khẩu cũ** (Đợt 12): phiên đăng nhập = bằng chứng
  sở hữu; GV reset cho HV qua admin API — action TỰ kiểm quyền (role teacher +
  thấy enrollment qua RLS) vì admin API bỏ qua RLS.
- **Thứ tự migration với code** (đã dính lỗi cả 2 chiều):
  - THÊM cột/bảng: dán migration TRƯỚC khi deploy code đọc/ghi nó.
  - DROP cột/bảng: deploy code bỏ tham chiếu TRƯỚC, dán migration SAU.
  - Luồng chuẩn: code → migration đúng thời điểm → probe → E2E → deploy.
- **File chỉ lên Storage khi dòng DB chắc chắn tạo xong**; xóa dòng có file
  phải đọc path trước rồi `removeSpecFiles` — Storage KHÔNG cascade như FK.
- **Subquery trong policy CHỊU RLS của bảng được tham chiếu** (phát hiện Đợt 8):
  policy A dựa vào bảng B thì B phải cho đọc hoặc dùng helper SECURITY DEFINER.

## ⚠️ Vấn đề đang mở / cần chú ý

### Việc USER cần làm
- 🟡 **`web/.env.example` KHÔNG có trong repo** — `web/.gitignore` có `.env*`
  thiếu `!.env.example`. Muốn sửa: thêm dòng đó rồi tự commit file. Claude KHÔNG
  tự làm (không đọc được file env — chặn quyền; không commit thứ chưa xem).

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chỉ mô phỏng logic server action, không gọi thẳng thân hàm** (Server
  Action không gọi được từ Node) — đổi action mà quên đổi script thì test vẫn
  xanh; validate link, form-sync... phải nghiệm thu bằng mắt.
- 🟡 `e2e-gallery-storage` từng flake 1 lần (17/18 → rerun 18/18, nghi race
  Storage) — gặp lại thì điều tra.

### Ràng buộc môi trường (không sửa được, phải sống chung)
- **Migration dán tay vào Supabase SQL Editor** — mạng chặn cổng 5432/6543,
  `supabase db push` không chạy. SQL Editor = 1 transaction, lỗi là rollback
  hết. SQL KHÔNG xóa được Storage (lỗi 42501) — phải qua Storage API.
- **CLI supabase KHÔNG có trong node_modules** — regen types:
  `corepack pnpm dlx supabase gen types typescript --linked > web/src/lib/database.types.ts`
  (cần login + link). ⚠️ Dấu `>` CẮT TRẮNG file trước khi lệnh chạy — CLI thiếu
  là file 0 byte. Thêm/bớt ít cột thì sửa tay `database.types.ts` an toàn hơn.
- **DLP công ty mã hóa file** trên máy user → đã chặn ở `web/src/lib/file-check.ts`
  + `ai-service/app/storage.py`. Nếu DLP mã hóa cả file code → thêm ô dán text.
- **`git push --force` bị `.claude/settings.json` chặn** — cần thì đưa lệnh cho
  user tự chạy.
- **Git identity**: repo đặt local `user.email = truonghoangduy2612@gmail.com`
  — Vercel chặn deploy nếu author khác chủ team, KHÔNG đổi.
- Render free: cold start 30–60s cho request AI đầu tiên trong ngày.
- Supabase free hết lo pause: workflow keep-alive chạy 2 ngày/lần; nhưng GitHub
  tự TẮT cron nếu repo im 60 ngày → nhận mail thì vào Actions bấm Enable.
- Dev server hay để tiến trình mồ côi → lỗi lạ thì kill port 3000/3001, xóa
  `web/.next`, chạy lại.

## 🗂 Lịch sử phiên gần đây (mới nhất trên cùng)

### 2026-07-17→18 — Claude / Đợt 7–12 (tất cả trong 2 ngày, đều đã production)
- **Đợt 7**: form HV nhập sản phẩm (chip chức năng, nút Xóa, validate link, AI
  chọn độ khó) + sửa 5 lỗi README.
- **Đợt 8**: gallery hiện cả bạn CHƯA có SP — mở RLS enrollments cho bạn cùng
  lớp (`20260720000000`); phát hiện policy subquery chịu RLS.
- **Đợt 9**: user đổi ý — GỠ trạng thái nộp (drop `projects.status`) + xóa bình
  luận chỉ chủ; học bài DROP-sau-deploy (lỡ drop trước → production lỗi vài phút).
- **Đợt 10**: 3 màn chiếu TV + bỏ lưu random nhóm (drop `presentation_groups`,
  xóa `e2e-phase5`) + GitHub Action keep-alive; gặp "socket ma" port 8000.
- **Đợt 11**: màn nghỉ nhập phút tùy ý; màn 🎉 tổng kết lớp cho phụ huynh.
- **Đợt 12**: đổi mật khẩu không cần cũ + GV reset cho HV; E2E class-admin 15→18.

### 2026-07-16 — Đợt 4–6 + dọn dẹp
Gallery GV + xem đề bài + xóa sạch Storage; khung xương/spinner chuyển trang +
prefetch sống lại; hồ sơ HV xuyên khóa; xóa schema chết submissions/grades.

### 2026-07-15 — GĐ 1–5 + Đợt 1–3 (nền tảng)
Auth username, khóa/lớp/buổi + nhận xét AI, Zalo, chấm bài viết lại, sản phẩm +
gallery, font Be Vietnam Pro, API key riêng, responsive. Deploy 0đ/tháng.
