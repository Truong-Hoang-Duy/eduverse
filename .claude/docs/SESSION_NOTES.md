# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-18, bởi: Claude)

**Đang làm:** KHÔNG có task dở. GĐ 1–5 + Đợt 1–17 đều đã production;
`main` = `develop` = `origin` = `14cf763`; working tree sạch; không nhánh
feature nào treo. **E2E 99/99** (+17 phase2 regression), pytest 4/4.
⚠️ Đợt 14: máy KHÔNG có `chromium-cli`/Playwright để tự lái trình duyệt — nút
Copy + bộ lọc trạng thái CHƯA được nghiệm thu bằng mắt, chỉ verify logic. User
tự bấm thử trên `/teacher/sessions/[id]` khi rảnh.
⚠️ Đợt 14: máy KHÔNG có `chromium-cli`/Playwright để tự lái trình duyệt — nút
Copy + bộ lọc trạng thái CHƯA được nghiệm thu bằng mắt, chỉ verify logic. User
tự bấm thử trên `/teacher/sessions/[id]` khi rảnh.

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
| `e2e-phase2.mjs` | 17 | như trên (gồm 3 check hồ sơ HV xuyên khóa + 4 check nhóm kỹ năng) |
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
- **Nhóm kỹ năng cho combo box nhận xét** (Đợt 13, +presentation Đợt 15, +6
  nhóm nữa Đợt 16 = **12 giá trị**): cột `review_options.skill_group`
  (`web/src/lib/skill-groups.ts` — SKILL_GROUPS — là nguồn danh sách DUY NHẤT,
  sửa/thêm nhóm phải sửa CẢ CHECK constraint, Postgres không cho ALTER CHECK
  trực tiếp nên phải drop+add lại — xem migration mới nhất trong
  `supabase/migrations/` để biết constraint hiện hành). Bộ lọc combo box
  **mặc định "Tất cả nhóm"**, chỉ thu hẹp hiển thị, KHÔNG đổi lựa chọn đã tick.
- **Mỗi nhóm nhận xét ≥10 lựa chọn** (Đợt 17, yêu cầu user 2026-07-18): cả bộ
  mặc định seed (112+112 câu) VÀ dữ liệu thật GV — đây là ngưỡng TỐI THIỂU,
  đừng để nhóm nào tụt xuống dưới 10 khi sửa/xóa sau này.
- **Trang Cài đặt: accordion theo nhóm** (Đợt 16) — mỗi nhóm 1 khối thu gọn
  (`<details>`), form thêm nằm TRONG từng accordion (không cần chọn lại nhóm
  qua Select nữa, khác Đợt 13). Đông nhóm (12) nên KHÔNG liệt kê phẳng nữa.
- **Tin Zalo `{tom_tat}` = 2 phần cố định** (chốt lại 2026-07-18, Đợt 15 — đảo
  ngược 1 phần quyết định Đợt 14): phần 1 "📚 Kiến thức đã học:" liệt kê XUỐNG
  DÒNG nhưng KHÔNG ký tự đầu dòng; phần 2 văn xuôi liền mạch nhận xét thái độ.
  ĐỪNG quay lại "toàn văn xuôi" của Đợt 14 — user đã thử và muốn phần kiến thức
  tách bạch dạng liệt kê trở lại.
- **Giọng điệu AI đúng mực, không đại ngôn** (Đợt 13): `TONE_RULE` trong
  `prompts.py` cấm "tuyệt vời/xuất sắc/hoàn hảo...", dùng thang "tốt/khá/chưa
  tốt...". Áp cho 3 prompt VIẾT NHẬN XÉT (review, zalo summary, student summary)
  — KHÔNG áp cho chấm bài (`build_grading_prompt`) và gợi ý tính năng
  (`build_suggest_features_prompt`) vì không phải nhận xét hành vi/thái độ.
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
- 🟡 `e2e-gallery-storage` đã flake **2 lần riêng biệt** (17/18 → rerun 18/18,
  nghi race Storage) — gặp lần thứ 3 thì điều tra nghiêm túc, đừng coi là
  bình thường mãi.

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

### 2026-07-18 — Claude / Đợt 17 — mỗi nhóm nhận xét ≥10 lựa chọn
Yêu cầu rõ ràng + hành động chỉ INSERT (an toàn, dễ đảo ngược) nên KHÔNG hỏi
lại, triển khai luôn. Viết 1 "master list" duy nhất (112 strength + 112
improvement, mỗi nhóm ≥10, presentation 12) dùng cho CẢ HAI nơi: (1) thay hẳn
`DEFAULT_STRENGTHS`/`DEFAULT_IMPROVEMENTS` trong code (bộ seed cho GV mới —
33+26 → 112+112); (2) script so khớp label với 78 câu đã có của GV thật
(`duyth1`), chỉ insert phần CHƯA CÓ (155/224 câu mới) — không đụng câu đã tồn
tại. Kết quả: dữ liệu thật 78→233 câu, verify bằng code tự đếm từng ô
(category×skill_group) đảm bảo không ô nào dưới 10. **0 migration** (không đổi
schema). E2E `e2e-phase2` regression 17/17.

### 2026-07-18 — Claude / Đợt 16 — accordion Cài đặt + 6 nhóm kỹ năng mới
Hỏi rõ 3 điểm mơ hồ qua `AskUserQuestion` trước khi code (đúng hướng — user
từng phàn nàn về việc đoán sai ý): (1) "hiện dropdown" = accordion thu gọn/mở
theo nhóm (không phải dropdown lọc); (2) "xem thêm nhóm" = muốn THÊM nhóm mới,
không phải hỏi UI đang ẩn gì; (3) tên 6 nhóm mới cụ thể (multiSelect, user chọn
cả gợi ý lẫn tự nhập): Kỷ luật/Nề nếp, Tự học, Sáng tạo, Kỹ năng máy tính, Vận
dụng AI, Đặt câu hỏi — tổng 6+6=12 nhóm.

UI: `option-manager.tsx` viết lại — mỗi nhóm 1 `<details>` (cùng pattern
`ReviewEditor`), form thêm nằm trong từng accordion nên bỏ được Select chọn
nhóm khi thêm. Bộ mặc định seed mở rộng 15+13→33+26 câu, dàn đều 11 nhóm (bỏ
"Khác"). Migration `20260725000000` mở rộng CHECK constraint (drop+add).

Dữ liệu thật GV (`duyth1`, 52→78 câu): ngoài 2 câu "hỏi" đã báo trước (move
sang `questioning`), khi rà lại thấy thêm 3 câu nên đổi nhóm cho khớp 6 nhóm
mới (không nằm trong kế hoạch ban đầu, tự quyết định vì nhỏ/dễ đảo ngược, đã
nêu rõ khi báo cáo): "Sáng tạo, chủ động thử cách làm mới" thinking→creativity,
"Cần luyện gõ phím / thao tác máy" coding→computer_skills, "Cần giữ trật tự,
không làm việc riêng" attitude→discipline. Cộng 26 câu mới cho 6 nhóm trống.
E2E `e2e-phase2` regression 17/17 sau khi merge.

### 2026-07-18 — Claude / Đợt 15 — Zalo liệt kê kiến thức + nhóm Thuyết trình
User đổi ý 1 phần quyết định Đợt 14: muốn "Kiến thức đã học" trong tin Zalo
quay lại dạng liệt kê (xuống dòng) nhưng KHÔNG gạch đầu dòng — hỏi rõ qua
`AskUserQuestion` với preview 3 phương án trước khi code (xuống dòng không ký
tự / nối 1 dòng bằng phẩy / dùng emoji ✓) để tránh đoán sai; user chọn "xuống
dòng không ký tự". Prompt mới yêu cầu {tom_tat} = 2 phần cố định (kiến thức
liệt kê + nhận xét văn xuôi), có ví dụ few-shot trong prompt để Gemini bắt
chước cấu trúc chính xác — verify qua Gemini thật, kết quả khớp 100% preview.

Việc 2: thêm nhóm skill_group mới `presentation` (🎤 Thuyết trình) — migration
`20260724000000` drop+add lại CHECK constraint (Postgres không cho ALTER CHECK
trực tiếp). Viết lại HOÀN TOÀN bộ mặc định seed (12→28 lựa chọn, dàn đều 5 nhóm)
— nhưng bộ này chỉ áp cho GV MỚI (nút "Thêm nhanh" chỉ hiện khi rỗng).

⚠️ **Suýt xóa nhầm dữ liệu thật của user**: user yêu cầu "xóa hết... thêm lại
mới hoàn toàn" tưởng là ý muốn thay bộ mặc định — nhưng khi query DB thật, tài
khoản GV duy nhất (`duyth1`) đã có **50 lựa chọn tự soạn công phu** (không phải
12 câu mặc định), toàn bộ đang `skill_group='other'` vì cột mới thêm ở Đợt 13
không hồi cứu phân loại cho dòng cũ. Đã DỪNG LẠI hỏi lại user trước khi xóa
(`AskUserQuestion`) thay vì làm theo nghĩa đen — user chọn **giữ nội dung, chỉ
phân loại lại**. Kết quả: UPDATE `skill_group` cho cả 50 dòng theo mapping đọc
tay từng câu (không đoán bằng regex), + bổ sung 2 câu cho 2 nhóm hơi mỏng
(collaboration cần cải thiện: 1→2, thinking cần cải thiện: 2→3). Nhóm
`presentation` hóa ra đã có sẵn 19/50 câu (gần 40%) — không cần bổ sung gì.
**Bài học: luôn đọc dữ liệu THẬT trước khi "xóa hết" theo yêu cầu — lời user
mô tả có thể không khớp thực tế, và việc dừng lại hỏi đúng lúc cứu được công
sức đã bỏ ra của user.**

### 2026-07-18 — Claude / Đợt 14 — copy nhận xét, lọc trạng thái, Zalo hết bullet
3 cải tiến độc lập, 0 migration (không đụng schema): (1) nút **📋 Copy** cạnh ô
"Nhận xét gửi phụ huynh" trong `ReviewEditor` — copy nhanh để gửi riêng phụ
huynh 1 em (khác tin Zalo tổng hợp cả lớp); (2) bộ lọc **Tất cả/Đã hoàn thành/
Chưa hoàn thành** cho danh sách nhận xét theo buổi — tách `review-list.tsx`
(client) khỏi `page.tsx` (vẫn Server Component) vì cần state lọc; export hàm
`isReviewed()` từ `review-editor.tsx` dùng chung cho cả badge lẫn bộ lọc, tránh
lặp logic "đã nhận xét = có strengths/improvements/comment"; (3) prompt
`build_zalo_summary_prompt` cấm gạch đầu dòng/số thứ tự trong `{tom_tat}`, yêu
cầu văn xuôi liền mạch — **khác mục đích** với "cấm bullet" của
`build_grading_prompt` (chỗ đó UI CHỦ ĐỘNG muốn bullet, chỉ cấm AI tự thêm ký
tự đầu dòng vì UI tự thêm) — đừng nhầm lẫn 2 chỗ khi sửa sau này.

### 2026-07-18 — Claude / Đợt 13 — nhóm kỹ năng + giọng điệu AI
Nhánh `feature/review-skill-groups`. 2 việc độc lập: (1) `review_options` thêm
`skill_group` — combo box điểm mạnh/cần cải thiện có bộ lọc theo nhóm (mặc định
"Tất cả", không đổi lựa chọn đã tick), trang Cài đặt chọn nhóm khi thêm lựa chọn
mới + hiện badge nhóm; (2) `TONE_RULE` mới trong `prompts.py` cấm từ đại ngôn,
áp cho 3 prompt viết nhận xét (không áp chấm bài/gợi ý tính năng — không phải
nhận xét thái độ). E2E `e2e-phase2` 13→17 (mặc định 'other', set nhóm cụ thể,
lọc đúng theo nhóm, CHECK constraint chặn giá trị sai) — trước khi dán migration
chạy thử đúng như dự đoán 4/17 FAIL (thiếu cột), 13 test cũ không ảnh hưởng; sau
khi user dán xong chạy lại **17/17 xanh**, toàn bộ 8 suite **99/99 PASS**, đã
merge lên production. `e2e-gallery-storage` lại flake 1 lần (17/18 → rerun
18/18) — flake thật, không liên quan thay đổi đợt này (2 lần rồi, coi là đặc
tính suite, không phải bug mới).

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
