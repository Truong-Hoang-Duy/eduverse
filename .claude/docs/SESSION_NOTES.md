# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-27, bởi: Claude)

**Đang làm:** KHÔNG có task dở.

**ĐÃ DEPLOY production: copy nhận xét từ buổi trước + bộ combo** (Đợt 21,
`feature/review-copy-prior-combos`): (1) combo copy điểm mạnh/cải thiện có
2 nhóm "👥 Bạn cùng buổi" + "📅 Buổi trước của em"; (2) "bộ combo nhận xét"
— GV tạo/quản lý bộ ở TRANG CÀI ĐẶT (chọn từ danh mục), mỗi học viên chỉ
CHỌN ÁP một bộ (không có nút Lưu/Quản lý tại chỗ). Bảng `review_combos`
(user đã dán migration `20260728000000`). ai-service KHÔNG đổi → chỉ Vercel
deploy. Lint + typecheck + build PASS.

**ĐÃ DEPLOY production: công tắc bật/tắt key Gemini riêng** (Đợt 20,
`feature/api-key-toggle`): checkbox ở `/profile` cho phép TẮT key riêng để tạm
dùng key hệ thống mà KHÔNG xóa key. Cột `user_secrets.use_own_key` (migration
`20260727000000`, user đã dán). `getMyApiKey()` trả null khi tắt. ai-service
KHÔNG đổi → chỉ Vercel deploy lại. Lint + typecheck + build PASS.

**ĐÃ DEPLOY production: 3 cải tiến nhận xét theo buổi** (Đợt 19,
`feature/review-level-absent-copy`): xếp loại học lực làm ngữ cảnh cho AI,
copy điểm mạnh/cải thiện từ bạn khác (dữ liệu đã lưu, gộp union), đánh vắng
(mặc định đi học — ẩn form + loại khỏi Zalo + tính đã xử lý). User đã DÁN
migration `20260726000000` vào Supabase và nghiệm thu UI trước khi deploy.
⚠️ **ai-service cũng đổi** (`/generate-review` nhận `academic_level`) → Render
deploy lại, request AI đầu tiên chờ 30–60s do cold start.
- 🐛 **Đã dính lỗi runtime khi user chạy thử** (không phải lỗi SQL): page.tsx
  (Server Component) gọi `isHandled()` nằm trong file `"use client"` →
  "Attempted to call from the server". Sửa bằng cách tách hàm thuần ra
  `review-status.ts` (KHÔNG `"use client"`). Bài học ở "Quyết định đã chốt".

Chống lặp lời văn tin Zalo (qua các buổi, kiểu lưu 2-3 tin trước) vẫn HỦY
như đã chốt (user xác nhận là yêu cầu nhầm lẫn).

**Trước đó cũng đã production:** trang vận hành `/teacher/admin` (Đợt 18,
cần `ADMIN_USERNAMES` ở cả local lẫn Vercel, fail closed); nhập tự do điểm
mạnh/cần cải thiện + gợi ý nội dung buổi học AI + Zalo cá nhân hóa lớp 1-1
(2026-07-21).

**`main` = `origin/main` = `1f0154a`** — ĐÂY là bản đang chạy production.
**`develop` = `origin/develop` = `5180b3f`** + 1 commit docs ghi lại chính
hai hash này (commit đó CỐ Ý không merge sang `main`: nó chỉ sửa ghi chú,
merge sang sẽ đẻ ra hash mới làm ghi chú sai lại — vòng lặp đã dính ở phiên
2026-07-21). Lệch 1 commit docs này là BÌNH THƯỜNG.

⚠️ **`ADMIN_USERNAMES` phải có trong `web/.env.local` (local) và Vercel
(production)**, nếu không trang đá về `/teacher` — cố tình fail closed.
Biến thêm SAU khi deploy thì bản đang chạy không thấy, phải redeploy.

Trước đó (2026-07-21, cũng đã production): nhập tự do điểm mạnh/cần cải
thiện, gợi ý nội dung buổi học bằng AI, Zalo cá nhân hóa cho lớp 1-1.

**`web/.env.example` giờ đã có trong repo** — user tự thêm `!.env.example`
vào `web/.gitignore` + tạo file (chỉ placeholder: `your-project.supabase.co`,
`change-me-...`, không secret thật — Claude verify qua `git diff --cached`
rồi mới commit hộ theo yêu cầu rõ ràng của user). Mục nợ cũ ở "Vấn đề đang
mở" coi như xong.

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
- **Điểm mạnh/cần cải thiện cho gõ tự do** (`review-editor.tsx`): câu gõ tay
  vừa thêm vào review đang xem, VỪA tự insert vào `review_options` (danh
  mục dùng chung) — skill_group lấy theo bộ lọc nhóm đang chọn, hoặc
  "other" nếu đang xem "Tất cả nhóm". Có check trùng label (không phân biệt
  hoa/thường) trước khi insert. Quyết định này (thay vì chỉ áp dụng 1 lần
  không lưu danh mục) do user chọn 2026-07-21 để tái sử dụng câu đã gõ.
- **Gợi ý nội dung buổi học bằng AI** (`/suggest-session-content`): popup
  nhận ghi chú thô của GV, lấy ngữ cảnh **5 buổi TRƯỚC gần nhất** cùng lớp
  (`sessions.content`, không lưu gì mới) để AI viết đúng tiến trình nối
  tiếp. KHÔNG áp `TONE_RULE` — đây là mô tả giáo án, không phải nhận xét
  học viên (giống lý do chấm bài/gợi ý tính năng không áp TONE_RULE). Có
  cả nút Copy và "Dùng gợi ý này" (điền vào ô chính, GV vẫn tự bấm Lưu).
- **Tin Zalo cá nhân hóa khi lớp chỉ có 1 học viên (dạy kèm 1-1)**: tính
  sĩ số qua bảng `enrollments` của cả lớp (KHÔNG phải số HV đã được nhận
  xét buổi đó) để quyết định `is_one_on_one`. Lớp 1 người → được nêu tên/
  gọi "em" cụ thể về chính em đó; lớp >1 người → giữ nguyên hành vi cũ
  (nhận xét chung, tuyệt đối không nêu tên) — ĐỪNG đổi nhánh else khi sửa
  sau này. Khi dùng tên, CHỈ được 1 trong 2 cách (tên HOẶC "em"), TUYỆT
  ĐỐI không ghép ("em An" sai) — sửa sau khi user phát hiện AI ghép sai.

- **Trang vận hành KHÔNG dùng vai trò `admin` trong DB** — chặn bằng biến môi
  trường `ADMIN_USERNAMES` (fail closed). Lý do: `profiles.role` có CHECK
  `('teacher','student')`, thêm giá trị phải drop+add constraint RỒI rà lại RLS
  của mọi bảng (policy đều viết theo `teacher_id = auth.uid()`, không có nhánh
  "admin thấy tất cả"). Dự án 1 người nên env là đủ — **đừng tự đề xuất thêm
  role vào DB trừ khi có nhiều admin thật**. Trang chạy service-role nên mọi
  action phải gọi `denyIfNotAdmin()` ngay dòng đầu: bỏ qua RLS = không còn lưới
  an toàn nào phía dưới.
- **Không tin path do client gửi khi xóa file Storage** — action dọn file mồ côi
  tự tính lại danh sách; nhận từ form là người dùng sửa request ép xóa được file
  đang dùng. Bỏ qua file mới hơn 1 giờ vì `createAssignment` upload TRƯỚC rồi mới
  insert dòng (có rollback) — luôn có khoảnh khắc file chưa được trỏ tới.
- **Hàm THUẦN dùng chung server+client KHÔNG được ở trong file `"use client"`**
  (dính 2026-07-27): `page.tsx` (Server Component) gọi `isHandled()` đặt trong
  `review-editor.tsx` (`"use client"`) → runtime lỗi "Attempted to call from the
  server". `next build` KHÔNG bắt được kiểu gọi chéo này — chỉ lộ khi chạy thật.
  Cách đúng: tách helper thuần + interface sang module không `"use client"`
  (`review-status.ts`), cả hai phía import chung. **Import TYPE từ file client
  thì OK** (bị erase lúc build), chỉ GỌI HÀM runtime mới lỗi.
- **Nhận xét theo buổi (Đợt 19) — 3 tính năng, quyết định nghiệp vụ đã chốt
  2026-07-27** (hỏi user 4 câu qua `AskUserQuestion` trước khi code):
  - **Xếp loại học lực** = 4 mức `academic-levels.ts` (Giỏi/Khá/Trung bình/Cần
    cố gắng — cố ý tránh "Yếu/Kém" cho hợp TONE_RULE). CHỈ làm ngữ cảnh cho AI
    chỉnh độ sâu/giọng, **prompt cấm nêu thẳng xếp loại cho phụ huynh**. Lưu ở
    `student_reviews.academic_level` (nullable, CHECK 4 giá trị — sửa mức phải
    sửa CẢ CHECK, giống `skill-groups`). Web gửi NHÃN (không gửi mã) sang AI.
  - **Copy điểm mạnh/cải thiện từ bạn khác** = từ dữ liệu **đã lưu** (không phải
    state live — user chọn phương án đơn giản), GỘP union bỏ trùng, KHÔNG ghi đè.
  - **Đánh vắng** = `is_absent` bool DEFAULT false (mặc định đi học). Bật →
    ẩn form, loại khỏi tin Zalo (`zalo.ts` lọc `is_absent`), tính "đã xử lý"
    (`isHandled` = `isReviewed` HOẶC `is_absent`). Lưu vắng xóa sạch điểm
    mạnh/cải thiện/lời khuyên/xếp loại của em ở buổi đó.

## ⚠️ Vấn đề đang mở / cần chú ý

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chỉ mô phỏng logic server action, không gọi thẳng thân hàm** — đổi
  action mà quên đổi script thì test vẫn xanh; UI phải nghiệm thu bằng mắt.
- 🟡 **Trang vận hành chưa có E2E** — chỉ lint/typecheck/build + user bấm tay.
- 🟡 **`TEST_USER_PREFIXES` chép ở 2 nơi** (`web/src/lib/admin-report.ts` và
  `web/scripts/purge-test-users.mjs`) vì script Node thuần không import được
  `.ts`. Sửa một bên nhớ sửa bên kia — đã ghi chú chéo ở cả hai file.
- 🟡 **CLAUDE.md nói "không upload Storage trước khi dòng DB tạo xong" nhưng
  `createAssignment` upload trước rồi mới insert** (có rollback nếu insert
  hỏng). Không phải bug, nhưng luật và code đang lệch — sửa luật hoặc sửa code
  khi có dịp.
- 🟡 **`coding-style.md` nói web dùng Vitest nhưng repo chưa có vitest lẫn file
  `.test.ts` nào** — cổng kiểm tra thực tế của `web/` chỉ là lint + typecheck +
  build.
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

### 2026-07-24 — Trang vận hành `/teacher/admin` (Đợt 18, đã deploy production)
- **Dọn ngữ cảnh trước**: sửa hash `main`/`develop` trong notes cho khớp git
  (`c74231b`); **XÓA hẳn** 2 ý treo — chia sẻ màn hình real-time và 8 ý
  brainstorm 2026-07-21 (`b058358`, user yêu cầu "không còn dính đến nữa").
  Lưu ý: xóa trắng nên phiên sau KHÔNG biết 2 ý này từng được cân nhắc.
- **Trang vận hành** (`12e2602`, nhánh `feature/admin-ops-dashboard`): bản web
  của `check-integrity.mjs` + `check-user.mjs` + `purge-test-users.mjs`, thêm 2
  thứ script không có — khóa/lớp mất GV chủ, và file Storage mồ côi (đúng cái
  `spec-storage.ts` ghi chú phải dọn bằng `scripts/check-storage.mjs`, một
  script chưa từng tồn tại). Chi tiết nghiệp vụ ở FEATURES.md.
- Trước khi code đã hỏi user 2 điều bằng `AskUserQuestion` (phạm vi trang, ai
  được vào) vì "quản lý thông tin DB" quá mơ hồ — và nêu rõ **Supabase Studio
  đã là trang admin DB rồi**, chỉ nên xây phần Studio KHÔNG làm được.
- 0 migration, 0 dependency mới. lint + typecheck + build sạch; user nghiệm thu
  ở local rồi mới khai `ADMIN_USERNAMES` trên Vercel và yêu cầu deploy.

### 2026-07-21 — MultiSelect search + random vắng + gallery/review/chấm bài + VS Code task (tất cả đã deploy production)
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
  vào `develop`. Thêm `.vscode/tasks.json` (chore, task chạy song song
  web+ai-service, KHÔNG auto-run khi mở folder). Sau đó merge `develop` →
  `main`, `git push origin develop main` — **`main`=`develop`=`origin`=
  `fb26bac`, ĐÃ DEPLOY production**.
- Lint + typecheck (web) + pytest (ai-service) PASS cho mọi commit trên;
  KHÔNG chạy được E2E (máy Claude thiếu `web/.env.local`); chưa cái nào
  nghiệm thu UI bằng mắt (không có Playwright) — user tự bấm thử trên
  production sau khi deploy.

### 2026-07-21 (tiếp) — 3 cải tiến nhận xét/Zalo (đã deploy)
- **Nhập tự do điểm mạnh/cần cải thiện** (`85e66ff`): xem "Quyết định đã
  chốt".
- **Gợi ý nội dung buổi học bằng AI + Zalo cá nhân hóa lớp 1-1** (`d8c85a6`,
  gộp 1 commit vì cùng sửa `prompts.py`/`schemas.py`/`routes/reviews.py`):
  xem "Quyết định đã chốt". Có 1 vòng sửa thêm ngay sau đó (cấm ghép "em"
  + tên) — đã gộp vào cùng commit vì chưa từng push.
- User tự kiểm tra cả 3 tính năng, hài lòng, rồi mới yêu cầu commit + deploy.
- 2 commit trên gộp qua `feature/review-custom-input-ai-suggestions`, merge
  `--no-ff` vào `develop`, sau đó merge `develop` → `main`,
  `git push origin develop main`.
- Lint + typecheck (web) + pytest (ai-service) PASS; không chạy E2E (thiếu
  `web/.env.local`).

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
