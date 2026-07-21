# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-21, bởi: Claude)

**Đang làm:** KHÔNG có task dở — chống lặp lời văn tin Zalo bị HỦY (user xác
nhận đó là yêu cầu nhầm lẫn, 2026-07-21, giữ nguyên `build_zalo_summary_prompt`
như cũ, KHÔNG thêm migration/field gì cho hướng này).

**`develop` (local) = `cb8248f`**, 5 commit trước `origin/develop` (4 commit
tính năng từ `feature/gallery-review-limits` + 1 merge — xem lịch sử phiên
dưới). **`main` = `origin` = `65c077a`** — chưa deploy đợt này (user chỉ yêu
cầu commit, KHÔNG yêu cầu deploy/push). Lint+typecheck(web)+
pytest(ai-service) PASS — **chưa cái nào nghiệm thu bằng mắt** (không có
Playwright). `.vscode/tasks.json` vẫn untracked, user chưa quyết định commit
hay để local — đừng tự thêm.

**Sản phẩm hiện có** (nghiệp vụ chi tiết ở FEATURES.md, lịch sử ở ROADMAP.md):
Auth USERNAME, khóa→lớp→buổi, nhận xét AI theo buổi + tổng hợp từng HV (12
nhóm kỹ năng, mỗi nhóm ≥10 lựa chọn, accordion ở trang Cài đặt), tin Zalo tổng
hợp cả lớp, chấm bài AI độc lập (không lưu, đề bài sửa được tên), sản phẩm
cuối khóa + gallery (roster "chưa khai báo" cả 2 phía HV/GV, giới hạn nhập
liệu), hồ sơ HV xuyên khóa, API key Gemini riêng, đổi mật khẩu không cần mật
khẩu cũ, 3 màn chiếu TV (random nhóm — đánh dấu vắng loại khỏi random, nghỉ
giữa giờ, thuyết trình + tổng kết lớp), GitHub Action keep-alive Supabase.

**Bắt đầu phiên sau thế nào:** `git checkout develop && git checkout -b feature/<slug>`
**trước khi sửa bất kỳ dòng code nào** (đừng commit thẳng vào main/develop).

**E2E 99/99 PASS** trên DB thật (chạy trong `web/`, tự tạo & tự dọn dữ liệu):

| Script | Số test | Lệnh |
|---|---|---|
| `e2e-phase1.mjs` | 13 | `node --env-file=.env.local scripts/e2e-phase1.mjs` |
| `e2e-phase2.mjs` | 17 | như trên (hồ sơ HV xuyên khóa + nhóm kỹ năng) |
| `e2e-api-key.mjs` | 8 | như trên |
| `e2e-class-admin.mjs` | 18 | như trên (đổi/đặt lại mật khẩu) |
| `e2e-gallery-storage.mjs` | 18 | như trên — gallery GV, xóa sạch Storage |
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
- **Auth bằng USERNAME**, email ảo `<username>@eduverse.local` qua admin API.
  Model Gemini: `gemini-flash-latest`. Xưng hô AI: "em", cấm "con".
- **KHÔNG validate định dạng API key Gemini theo prefix cứng** (sự cố
  2026-07-18: chặn nhầm key hợp lệ không bắt đầu "AIza"). Chỉ chặn thứ CHẮC
  CHẮN sai (rỗng, <20 ký tự, khoảng trắng) — key sai thật để Gemini tự từ chối,
  `ai-service/app/gemini.py` dịch lỗi 400/403 thành `BAD_KEY_MESSAGE`. Bài học:
  đừng đoán format bên thứ 3, validate ở nơi có thẩm quyền thật.
- **Chấm bài là công cụ độc lập, KHÔNG lưu gì** ngoài đề bài — đừng hồi sinh
  `submissions`/`grades`. **API key ở bảng `user_secrets` riêng** (RLS theo
  dòng, để trong `profiles` là lộ key).
- **Font Be Vietnam Pro**, biến CSS phải tên `--font-sans` — sai tên là font
  không áp mà KHÔNG báo lỗi.
- **KHÔNG có trạng thái nộp sản phẩm** (đã DROP cột `status`); **xóa bình
  luận: CHỈ chủ nhận xét**; **random nhóm KHÔNG lưu** (GV chiếu TV, mỗi buổi
  random mới) — cả 3 đừng hồi sinh.
- **Đổi mật khẩu không cần mật khẩu cũ**: phiên đăng nhập = bằng chứng sở hữu;
  GV reset cho HV qua admin API (action tự kiểm role + enrollment RLS).
- **Nhóm kỹ năng nhận xét = 12 giá trị cố định**, nguồn DUY NHẤT là
  `web/src/lib/skill-groups.ts` (SKILL_GROUPS) — sửa/thêm nhóm phải sửa CẢ
  CHECK constraint (Postgres không cho ALTER CHECK trực tiếp, phải drop+add;
  xem migration mới nhất để biết constraint hiện hành). Bộ lọc combo box mặc
  định "Tất cả nhóm" (không đổi lựa chọn đã tick). **Mỗi nhóm ≥10 lựa chọn**
  là ngưỡng tối thiểu đã đạt (seed 112+112, dữ liệu thật GV 233 câu) — đừng để
  tụt xuống dưới 10 khi sửa/xóa. Trang Cài đặt hiển thị accordion theo nhóm
  (form thêm nằm TRONG từng accordion, không cần chọn lại qua Select).
- **Tin Zalo `{tom_tat}` CHỈ chứa danh sách kiến thức, KHÔNG kèm câu đánh giá
  nào** (chốt sau 3 lần sửa cùng ngày 2026-07-18 — chi tiết + lý do từng lần ở
  AI-SERVICE.md, đọc kỹ trước khi đổi lại kẻo lặp sai lầm cũ): liệt kê xuống
  dòng, không ký tự đầu dòng, không tự thêm tiêu đề (GV tự đặt trong
  `template_text`). Đoạn nhận xét chung (văn xuôi, không bullet) về tình hình
  học tập KHÔNG ép vào `{tom_tat}` — Gemini tự tìm placeholder khác trong mẫu
  có câu dẫn kiểu "đánh giá/nhận xét" đứng trước để điền đúng chỗ (KHÔNG
  hardcode tên biến, vì mỗi GV đặt tên khác nhau).
- **Giọng điệu AI đúng mực, không đại ngôn**: `TONE_RULE` trong `prompts.py`
  cấm "tuyệt vời/xuất sắc/hoàn hảo...", dùng thang "tốt/khá/chưa tốt". Áp cho
  3 prompt VIẾT NHẬN XÉT (review, zalo, student summary) — KHÔNG áp chấm bài
  hay gợi ý tính năng.
- **Thứ tự migration với code**: THÊM cột/bảng → dán TRƯỚC deploy; DROP →
  deploy code bỏ tham chiếu TRƯỚC, dán SAU. Luồng: code → migration đúng thời
  điểm → probe → E2E → deploy.
- **File chỉ lên Storage khi dòng DB chắc chắn tạo xong**; xóa dòng có file
  phải đọc path trước rồi `removeSpecFiles` — Storage KHÔNG cascade như FK.
- **Subquery trong policy CHỊU RLS của bảng được tham chiếu**: policy A dựa
  bảng B thì B phải cho đọc hoặc dùng helper SECURITY DEFINER.
- **Trước khi "xóa hết theo yêu cầu": luôn đọc dữ liệu THẬT trước** — lời user
  mô tả có thể không khớp thực tế (từng suýt xóa 50 câu GV tự soạn công phu vì
  tưởng chỉ là 12 câu mặc định); dừng lại hỏi khi phát hiện lệch, đừng làm
  theo nghĩa đen.
- **Nhận xét theo buổi chống lặp lời văn**: thêm `prior_comments` (tối đa 3
  buổi gần nhất, lấy từ `student_reviews.ai_generated_comment` join
  `sessions` theo `student_id` + `session_number` nhỏ hơn buổi hiện tại) vào
  `build_review_prompt`, TÁCH BIỆT khỏi `previous_comment` cũ (đó là bản
  nháp của CHÍNH buổi đang xem, không phải buổi trước — đã đổi nhãn prompt
  cho rõ nghĩa, tránh AI hiểu lẫn 2 khối). Prompt yêu cầu đổi câu mở
  đầu/cấu trúc câu, không chỉ tránh trùng Ý.
- **Tin Zalo KHÔNG chống lặp lời văn qua các buổi — HỦY hẳn** (user xác nhận
  2026-07-21 đó là yêu cầu nhầm lẫn). `build_zalo_summary_prompt` giữ nguyên
  như trước, KHÔNG thêm migration lưu tin đã sinh cho mục đích này — đừng tự
  đề xuất lại trừ khi user chủ động nêu lại.
- **Sản phẩm cuối khóa**: roster "chưa khai báo" (trước chỉ có bên HV, giờ
  thêm cả bên GV ở `/teacher/gallery`, tái dùng `ProjectGrid` +
  `membersWithoutProject` có sẵn — không sửa component đó). Giới hạn nhập
  liệu (tên ≤100, mô tả/ghi chú ≤1000, tối đa 15 chức năng/mỗi cái ≤80 ký
  tự) nguồn DUY NHẤT ở `web/src/lib/project-limits.ts`, validate thật ở
  server (`saveProject`), client chỉ chặn UX. KHÔNG thêm deadline/trạng thái
  nộp gì — đã hỏi user, giữ nguyên quyết định cũ (xem trên).
- **Bộ lọc theo lớp/nhóm kỹ năng dùng Select 1-lựa-chọn client-side (không
  URL searchParams)** — dự án chưa từng dùng searchParams để lọc, giữ nhất
  quán với `StatusFilter`/`GroupFilter` đã có (`review-list.tsx`,
  `review-editor.tsx`); áp dụng lại cho bộ lọc lớp ở `/teacher/gallery`
  (`gallery-view.tsx`).

## ⚠️ Vấn đề đang mở / cần chú ý

### Việc USER cần làm
- 🟡 **`web/.env.example` KHÔNG có trong repo** — `web/.gitignore` có `.env*`
  thiếu `!.env.example`. Muốn sửa: thêm dòng đó rồi tự commit file. Claude KHÔNG
  tự làm (không đọc được file env — chặn quyền; không commit thứ chưa xem).
- 🟡 **Nghiệm thu bằng mắt** (máy Claude không có Playwright) 4 commit mới
  của phiên này (đã merge vào `develop`, CHƯA deploy): bộ lọc lớp + roster
  chưa khai báo ở `/teacher/gallery`; giới hạn nhập liệu ở
  `/student/projects` (maxLength + cap 15 chức năng); "AI tạo nhận xét" ở
  `/teacher/sessions/[id]` phải đổi lời văn so với buổi trước; nút "✏️ Sửa
  tên đề" ở `/teacher/assignments`. Sau khi nghiệm thu, deploy giống lần
  trước: merge `develop` → `main`, `git push origin develop main`.

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chỉ mô phỏng logic server action, không gọi thẳng thân hàm** — đổi
  action mà quên đổi script thì test vẫn xanh; UI phải nghiệm thu bằng mắt.
  Chưa chạy lại E2E cho các thay đổi phiên này (máy Claude không có
  `web/.env.local`).
- 🟡 `e2e-gallery-storage` đã flake **2 lần riêng biệt** (17/18 → rerun 18/18,
  nghi race Storage) — gặp lần thứ 3 thì điều tra nghiêm túc.

### Ràng buộc môi trường (không sửa được, phải sống chung)
- **Migration dán tay vào Supabase SQL Editor** — mạng chặn cổng 5432/6543.
  SQL KHÔNG xóa được Storage (lỗi 42501) — phải qua Storage API.
- **CLI supabase KHÔNG có trong node_modules** — regen types cần
  `pnpm dlx supabase` + login/link; dấu `>` CẮT TRẮNG file nếu CLI lỗi giữa
  chừng. Thêm/bớt ít cột thì sửa tay `database.types.ts` an toàn hơn.
- **DLP công ty mã hóa file** trên máy user → đã chặn ở `file-check.ts` +
  `storage.py`. Nếu DLP mã hóa cả file code → thêm ô dán text.
- **`git push --force` bị chặn** — cần thì đưa lệnh cho user tự chạy.
- **Git identity local** = `truonghoangduy2612@gmail.com` — Vercel chặn deploy
  nếu author khác, KHÔNG đổi.
- Render free: cold start 30–60s. Supabase free: keep-alive 2 ngày/lần chống
  pause, nhưng GitHub tự TẮT cron nếu repo im 60 ngày → vào Actions bấm Enable.
- Dev server hay để tiến trình mồ côi → lỗi lạ thì kill port 3000/3001, xóa
  `web/.next`, chạy lại. Script dùng service key phải đặt TRONG `web/scripts/`
  (Node resolve package theo vị trí script).

## 🗂 Lịch sử phiên gần đây (nén — chi tiết đầy đủ nằm trong git log từng commit)

### 2026-07-21 — MultiSelect search + random vắng (đã deploy) + 4 commit gallery/review/chấm bài (chỉ ở `develop`, chưa deploy)
- **Đã deploy production** (`main`=`develop`=`65c077a`): ô tìm kiếm trong
  `MultiSelect` (điểm mạnh/cần cải thiện, filter `%từ%`); đánh dấu vắng mặt
  trước khi random nhóm thuyết trình (client-only, không lưu DB, đúng tinh
  thần "random không lưu"). Kèm `.vscode/tasks.json` (task chạy song song
  web+ai-service, KHÔNG auto-run khi mở folder — an toàn commit) — user
  chưa quyết định có commit vào repo hay không.
- **Sản phẩm cuối khóa** (`c806240`): roster "chưa khai báo" thêm bên GV
  (`/teacher/gallery`, tái dùng `ProjectGrid`), giới hạn nhập liệu
  (`web/src/lib/project-limits.ts`) — xem "Quyết định đã chốt".
- **Bộ lọc lớp gallery GV** (`fabd585`) **+ chống lặp lời văn review**
  (`b21da25`): Select lọc lớp ở `/teacher/gallery` (`gallery-view.tsx`);
  `prior_comments` trong `build_review_prompt` — xem "Quyết định đã chốt".
- **Chấm bài** (`dc8f94d`): nút "✏️ Sửa tên đề" ở `/teacher/assignments`
  (`edit-assignment-title-button.tsx` + `updateAssignmentTitle` trong
  `grading.ts`), theo đúng pattern `EditCourseDialog`/`EditClassDialog` có
  sẵn — chỉ đổi `title`, không đụng file/session_number/course.
- **Zalo chống lặp lời văn: HỦY** — user nêu yêu cầu rồi xác nhận đó là nhầm
  lẫn trước khi code bắt đầu; không đổi gì ở `build_zalo_summary_prompt`.
- 4 commit trên gộp qua `feature/gallery-review-limits`, merge `--no-ff`
  vào `develop` (`cb8248f`) — **CHƯA push lên `origin`**, user chỉ yêu cầu
  commit chứ không yêu cầu deploy lần này.
- Lint + typecheck (web) + pytest (ai-service) PASS cho mọi commit trên;
  KHÔNG chạy được E2E (máy Claude thiếu `web/.env.local`); chưa cái nào
  nghiệm thu UI bằng mắt (không có Playwright).

### 2026-07-18 — Đợt 13→17 + 4 fix (tất cả trong 1 ngày, đều production)
Nhóm kỹ năng cho review_options + `TONE_RULE` (Đợt 13); Copy nhận xét riêng
phụ huynh + bộ lọc Đã/Chưa hoàn thành (Đợt 14); Zalo thử "toàn văn xuôi" rồi
quay lại liệt kê kiến thức + nhóm `presentation` (Đợt 15 — suýt xóa nhầm 50
câu GV tự soạn khi tưởng "xóa hết", dừng hỏi lại thay vì làm theo nghĩa đen,
bài học đã ghi ở "Quyết định đã chốt"); accordion Cài đặt theo nhóm + 6 nhóm
mới (Đợt 16); mỗi nhóm ≥10 lựa chọn, seed 112+112 (Đợt 17). 4 fix cùng ngày:
API key validation chặn nhầm key không "AIza"; prompt Zalo lặp tiêu đề +
thiếu đoạn đánh giá + đè mục "Đánh giá chung" của GV (3 lần sửa, chốt cuối ở
"Quyết định đã chốt"); user tự xóa câu ví dụ few-shot trong
`build_zalo_summary_prompt`.

### 2026-07-15→16 — GĐ 1–5 + Đợt 1–12 (nền tảng, đều production)
Auth username, khóa/lớp/buổi + nhận xét AI, Zalo, chấm bài viết lại, sản phẩm
+ gallery (HV/GV, roster bạn chưa nộp), hồ sơ HV xuyên khóa, font Be Vietnam
Pro, API key riêng, responsive, xóa schema chết, 3 màn chiếu TV, đổi mật khẩu
không cần cũ. Deploy 0đ/tháng (Vercel + Render + Supabase).
