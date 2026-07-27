# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-27, bởi: Claude)

**Đang làm:** KHÔNG có task dở. Toàn bộ đã deploy production, `main`=`develop`
(lệch 1 commit docs — bình thường).

**`main` = `origin/main` = `db3edf3`** — bản đang chạy production.
**`develop` = `origin/develop` = `84d34d0`** = main + 1 commit docs ghi hash
(CỐ Ý không merge sang `main`: merge sẽ đẻ hash mới làm ghi chú sai lại — vòng
lặp đã dính 2026-07-21). Lệch 1 commit docs này là BÌNH THƯỜNG.

⚠️ **`ADMIN_USERNAMES` phải có ở `web/.env.local` (local) VÀ Vercel (production)**
— chưa khai thì `/teacher/admin` đá về `/teacher` (fail closed). Biến thêm SAU
deploy KHÔNG áp cho bản đã build → phải redeploy.

**Sản phẩm hiện có** (nghiệp vụ chi tiết ở FEATURES.md, lịch sử ở ROADMAP.md):
Auth USERNAME, khóa→lớp→buổi, **sao chép lớp** (giáo án lấy từ lớp khác, thành
viên chọn, không chép nhận xét); nhận xét AI theo buổi + tổng hợp từng HV (12
nhóm kỹ năng, **xếp loại học lực** ngữ cảnh AI, **đánh vắng**, **copy điểm
mạnh/cải thiện** từ bạn cùng buổi/buổi trước, **bộ combo** `review_combos` tạo
ở Cài đặt + seed ~22 mẫu); tin Zalo tổng hợp cả lớp; chấm bài AI độc lập; sản
phẩm cuối khóa + gallery; hồ sơ HV xuyên khóa; **API key Gemini riêng có công
tắc bật/tắt**; đổi mật khẩu không cần cũ; 3 màn chiếu TV; **trang vận hành
`/teacher/admin`** (ADMIN_USERNAMES); nút "↑ lên đầu trang" + khối thu gọn ở
trang lớp/Cài đặt; GitHub Action keep-alive Supabase.

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

### 2026-07-27 — Đợt 19→25 (7 đợt, đều đã deploy production)
Phiên dài, mỗi đợt 1 nhánh riêng, deploy từng cụm khi user duyệt. Chi tiết
từng đợt ở ROADMAP.md; nghiệp vụ ở FEATURES.md.
- **Đợt 19** (`review-level-absent-copy`, mig `20260726000000`): `student_reviews`
  thêm `academic_level` (CHECK 4 mức) + `is_absent`. ai-service `/generate-review`
  nhận `academic_level` (Render deploy lại). 🐛 fix lỗi gọi hàm client từ server
  → tách `review-status.ts`.
- **Đợt 20** (`api-key-toggle`, mig `20260727000000`): `user_secrets.use_own_key`
  công tắc bật/tắt key riêng, `getMyApiKey()` trả null khi tắt.
- **Đợt 21** (`review-copy-prior-combos`, mig `20260728000000`): copy nhận xét
  2 nhóm (bạn cùng buổi + buổi trước của em); bảng `review_combos` + quản lý ở
  Cài đặt. **Migration bảng mới an toàn dán bất kỳ lúc nào** (`listMyCombos`
  nuốt lỗi table-chưa-tồn-tại → trang không vỡ).
- **Đợt 22** (`review-input-ux-combo-seed`, 0 mig): gõ câu mới trong ô tick
  (`MultiSelect.onCreate`), badge giới hạn cao/cuộn, seed ~22 bộ combo mẫu
  (`seedDefaultCombos` rút từ danh mục GV theo nhóm, bỏ presentation), khối Cài
  đặt đóng mặc định.
- **Đợt 23** (`duplicate-class`, 0 mig): sao chép lớp — giáo án lấy từ LỚP KHÁC
  do GV chọn (`duplicateClass`, upsert đè buổi trigger sinh), thành viên từ lớp
  đang mở, KHÔNG chép nhận xét/sản phẩm.
- **Đợt 24** (`ui-scrolltop-backbtn-collapse`, 0 mig): nút "↑ lên đầu trang"
  (`scroll-to-top.tsx` trong `AppShell`), nút quay lại to hơn, `CollapsibleCard`
  ở trang lớp (chỉ "Buổi học" mở).
- **Đợt 25** (`review-summary-format-backbtn`, 0 mig): bỏ khối tổng hợp trùng ở
  trang lớp; format "tổng hợp toàn khóa" bỏ icon; đồng bộ nút quay lại +
  `cursor-pointer`; cắt đuôi "— <hướng dẫn thừa>" ở mô tả subtitle tính năng.
- **Git**: Đợt 22+23 gộp merge cùng lúc (xung đột docs — resolve tay). Đợt 20
  từng suýt deploy trước khi dán migration → đã dừng hỏi user xác nhận migration
  trước khi push (cột thêm vào bảng đang SELECT thì BẮT BUỘC dán trước deploy).

### 2026-07-24 — Trang vận hành `/teacher/admin` (Đợt 18, đã deploy production)
Bản web của 3 script chẩn đoán (`check-integrity`/`check-user`/`purge-test-users`)
+ 2 kiểm tra script không có (khóa/lớp mất GV chủ, file Storage mồ côi). Chặn
bằng `ADMIN_USERNAMES` (không thêm role `admin` vào DB — xem Quyết định đã chốt),
service-role nên mọi action tự `denyIfNotAdmin()`. Cũng XÓA hẳn 2 ý treo cũ
(chia sẻ màn hình real-time + 8 ý brainstorm) theo yêu cầu user.

### 2026-07-21 — gallery/review/chấm bài + nhập tự do + gợi ý buổi + Zalo 1-1 (đã deploy)
MultiSelect có ô tìm; đánh vắng trước random nhóm (client-only); roster "chưa
khai báo" bên GV + giới hạn nhập liệu (`project-limits.ts`); lọc lớp gallery GV;
chống lặp lời văn review (`prior_comments`); sửa tên đề chấm bài; nhập tự do
điểm mạnh/cải thiện (tự lưu vào `review_options`); gợi ý nội dung buổi bằng AI;
Zalo cá nhân hóa lớp 1-1. Zalo chống-lặp-qua-buổi: HỦY (yêu cầu nhầm). Chi tiết
nghiệp vụ + lý do ở "Quyết định đã chốt".

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
