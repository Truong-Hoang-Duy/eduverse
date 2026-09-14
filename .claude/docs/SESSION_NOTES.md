# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-09-14, bởi: Gemini)

**Đang làm:** Đã hoàn thành tính năng **Đánh Giá Năng Lực (9 tiêu chí ĐNL) cho Bài Kiểm Tra Cuối Khóa & Ẩn Demo Score (Đợt 64)** trên nhánh `feature/session-format-selector`:
1. **Nghiệp vụ:** Tại Buổi 14 (hoặc buổi cuối khóa), dù lớp chọn "Thuyết trình (Demo Day)" hay "Bài kiểm tra", hệ thống đều tổng kết toàn khóa và nhận xét theo khung chấm điểm **Bảng Đánh Giá Năng Lực (9 tiêu chí ĐNL chuẩn Denise LMS)**. Tuy nhiên, khi giáo viên chọn "Bài kiểm tra", phần **Demo Score** (thang điểm 10 gồm CSI và 5 tiêu chí demo sản phẩm) được ẩn đi vì khóa thi không có demo sản phẩm.
2. **Frontend Web App (`web/`):**
   - `presentation-evaluation-card.tsx`: Nhận prop `hideDemoScore?: boolean`. Khi bật: đổi tiêu đề thành `📊 Bảng Đánh Giá Năng Lực (Chuẩn Denise LMS)`, ẩn hoàn toàn Phần 2 (toàn bộ khối Demo Score và thanh chia đều điểm), nút "📋 Copy toàn bộ bảng đánh giá" tự động loại trừ Demo Score và chỉ copy nhận xét cùng 9 tiêu chí ĐNL.
   - `presentation-evaluation.ts`: Bổ sung `options?: { hideDemoScore?: boolean }` cho `formatFullEvaluationText`, thêm helper `createDefaultFinalEvaluation` cho phép giáo viên mở bảng ĐNL thủ công.
   - `page.tsx` & `review-list.tsx`: Xác định `isFinalSession` (buổi 14 hoặc buổi cuối của lớp) và truyền xuống `ReviewEditor`.
   - `review-editor.tsx`:
     - Tính toán `hasFinalEvaluation = isFinalPresentation || (isPeriodicTest && isFinalSession)` và `hideDemoScore = isPeriodicTest && !isFinalPresentation`.
     - Bổ sung banner thông báo trực quan cho buổi kiểm tra cuối khóa kèm badge `Buổi 14 / Tổng kết`.
     - Nút AI thông minh: hiển thị `✨ AI tổng kết bài thi & Đánh giá năng lực` khi là bài kiểm tra cuối khóa.
     - Cho phép mở bảng ĐNL thủ công qua nút `📊 Mở Bảng Đánh Giá Năng Lực (9 tiêu chí)` khi chưa gọi AI.
     - Tự động lưu cache rubric vào `localStorage` cho cả bài kiểm tra cuối khóa và buổi thuyết trình.
   - `reviews.ts` (Server Action): Thêm cờ `isExam` vào `GenerateFinalPresentationReviewInput` và gửi sang AI Service.
3. **AI Service (`ai-service/`):**
   - `schemas.py`: Thêm trường `is_exam: bool = False` vào `FinalPresentationReviewRequest`.
   - `prompts.py`: Tinh chỉnh prompt khi `is_exam=True`: chuyển đổi ngữ cảnh sang đánh giá bài kiểm tra cuối khóa, nhận diện quan sát làm bài thi (`testProcessNotes`) và chấm 9 tiêu chí ĐNL chuẩn xác.
   - `routes/reviews.py`: Chuyển tiếp cờ `is_exam` vào prompt builder.
4. **Kiểm thử chất lượng:**
   - `web/`: `pnpm test` (288/288 tests PASSED - 24 files, +2 tests mới), `pnpm typecheck` (0 errors), `pnpm lint` (0 errors).
   - `ai-service/`: `pytest` (87/87 tests PASSED - +1 test mới).
1. **AI Service (`ai-service/`):**
   - Thêm schema `FinalPresentationReviewRequest`, `FinalPresentationReviewResponse`, `DemoScoreBreakdown` (bao gồm `knowledge_score`, `demo_total`, `total` thang 10), `DnlCriterionEvaluation`.
   - Viết prompt `build_final_presentation_review_prompt` tổng hợp toàn bộ 13 buổi học trước (buổi 1-13), thông tin đề tài SPCK của học viên và ghi chú buổi thuyết trình để sinh nhận xét tổng kết gửi phụ huynh cùng bộ điểm ĐNL & Demo Score.
   - **Quy tắc chia đều không dưới 6.0:** Tổng cả điểm kiến thức (thang 5.0) + demo sản phẩm (thang 5.0) được bảo đảm **không dưới 6.0 điểm** (thang 10), tự động chia đều cân đối 50/50 và chia đều 5 tiêu chí demo theo tỷ lệ trọng số chuẩn (40%, 10%, 20%, 20%, 10%). Đồng bộ 9 tiêu chí ĐNL đạt từ Khá trở lên (score >= 3).
   - Endpoint `POST /generate-final-presentation-review` (hỗ trợ cả Gemini và OpenAI). Pytest: 86/86 test xanh (100%).
2. **Frontend Web App (`web/`):**
   - **Tự động nhận diện Buổi 14 / Buổi cuối:** Checkbox "Buổi này là Thuyết trình sản phẩm cuối khóa (Demo Day / Buổi 14)" trong form buổi học (tự động bật nếu số thứ tự là 14 hoặc buổi cuối của lớp).
   - **Giao diện thẻ đánh giá Denise LMS ([presentation-evaluation-card.tsx](file:///d:/Project/Eduverse/web/src/app/(teacher)/teacher/sessions/[id]/presentation-evaluation-card.tsx)):**
     - Khớp giao diện Denise LMS Image 5: Hàng 1 là nhãn `Demo2024 | CSI` kèm ô nhập Điểm kiến thức (tối đa 5.0đ). 5 hàng tiếp theo cho 5 tiêu chí Demo sản phẩm (tổng 5.0đ).
     - Hiển thị `Demo Score: {total} / 10.0` kèm huy hiệu tóm tắt `Kiến thức: {k}/5.0` và `Demo SP: {d}/5.0`.
     - Thanh công cụ chọn nhanh mức điểm: `6.0đ (Tối thiểu)`, `7.0đ`, `7.5đ`, `8.0đ`, `8.5đ`, `9.0đ`, `9.5đ`, `10.0đ` tự động chia đều toàn bộ bảng điểm trong 1 click.
     - Cảnh báo nếu điểm tổng dưới 6.0đ kèm nút sửa nhanh.
     - 9 Tiêu chí ĐNL: KIẾN THỨC (Tự học, Tại lớp), KỸ NĂNG (Giao tiếp hợp tác, Sử dụng máy tính, Giải quyết vấn đề, Tư duy sáng tạo, Tư duy máy tính), THÁI ĐỘ (Trên lớp, Về nhà).
     - Radio 1-5, badge mức độ (TB/Khá/Giỏi) đổi màu tự động, ô nhận xét chỉnh sửa trực tiếp, nút 📋 Sao chép từng ô và nút 📋 "Sao chép toàn bộ bảng đánh giá Denise LMS".
   - **Editor Buổi 14 ([review-editor.tsx](file:///d:/Project/Eduverse/web/src/app/(teacher)/teacher/sessions/[id]/review-editor.tsx)):**
     - Banner tím/indigo Buổi 14, thẻ đề tài SPCK của học viên, ô ghi chú thuyết trình kèm quick chips gợi ý. Nút "✨ AI tổng kết Buổi 14 & Đánh giá năng lực".
     - Cache kết quả rubric vào `localStorage` theo key `eduverse_rubric_${sessionId}_${studentId}` không lo mất khi reload trang.
3. **Database Migration:**
   - Migration `20260911000000_final_presentation_session.sql`: thêm cột `is_final_presentation` vào bảng `sessions`.
   - Có cơ chế graceful fallback trong Server Action: Nếu user chưa kịp dán migration vào Supabase, hệ thống vẫn tự nhận diện theo `session_number === 14` và lưu bình thường không crash.
4. **Kiểm thử chất lượng:**
   - `ai-service`: `.venv/Scripts/python -m pytest` → 86/86 tests PASSED (100%).
   - `web/`: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors), `pnpm test` (270/270 tests PASSED - 23 test files).
   - Nhánh Git: Đã commit và merge sạch từ `feature/final-presentation-review` vào `develop` và `main`, push lên `origin` thành công.

**`main` = `origin/main` = `f35fc30`**
`ai-service/` CÓ đổi ở đợt này (thêm endpoint `/generate-final-presentation-review` và schema rubric ĐNL/Demo Score) — Render tự động build/deploy theo webhook push `main`.
Kiểm tra `/health` khớp commit mới trên Render dashboard nếu cần.


🔴 **Phát hiện đầu phiên: `develop` bị BỎ SÓT một commit chỉ-sửa-docs trên
`main`** (`b8e8a1a`, không phải merge commit — có vẻ soạn trực tiếp trên
`main` ở phiên trước rồi quên đồng bộ ngược). Do nhánh `feature/parent-showcase-link`
tách từ `develop` (đang thiếu commit đó), các file docs sửa trong phiên này
ban đầu bị soạn ĐÈ LÊN bản CŨ (thiếu toàn bộ nội dung Đợt 57: xếp loại học lực
theo lớp, SPCK, combo "chân dung học viên"...). Phát hiện bằng cách so
`git diff --stat develop main` trước khi merge — thấy 5 file docs + 1 file
code lệch nhau đúng 1 commit. Xử lý: dựng lại toàn bộ docs Đợt 58 TRÊN NỀN bản
`main` (giữ nguyên nội dung Đợt 57), không phải merge conflict thô. **Bài học
lặp lại của Đợt 55**: đầu phiên thấy trạng thái nhánh lạ (ở đây là "hai nhánh
chuẩn lệch nhau") thì phải đối chiếu TRƯỚC khi viết đè, đọc DECISIONS.md.

**8 migration user đã xác nhận DÁN + CHẠY XONG** (Claude không tự verify
được — không query DB trực tiếp, trừ lúc probe bằng script tay). 6 migration
Đợt 57 (`20260805000000` → `20260828010000`, xem chi tiết lịch sử phiên
trước) + **2 migration MỚI Đợt 58**:
`20260829000000_class_showcase.sql` (`projects.image_urls`; bảng
`class_showcases`/`showcase_reactions`; RPC anon cho khách vãng lai),
`20260829010000_showcase_ratings.sql` (đổi thiết kế tương tác của khách —
"lời chúc" → "chấm điểm ẩn danh": đổi tên `allow_messages`→`allow_ratings`,
thêm `show_rating_results`, DROP bảng `showcase_messages` thay bằng
`showcase_ratings`, viết lại `get_showcase` + 2 RPC mới).
🔴 **Sự cố ngắn tương tự Đợt 57 nhưng KHÔNG chạm production của user vì phát
hiện trước khi user dán**: Claude sửa THẲNG vào `20260829000000.sql` sau khi
đổi thiết kế lời chúc→chấm điểm, dù user ĐÃ dán bản cũ và bật thử link (thấy
QR chạy được lần đầu). Vì code mới đọc cột `allow_ratings`/`show_rating_results`
chưa tồn tại, panel "🔗 Link cho phụ huynh" hiện "chưa bật" dù dòng
`class_showcases` vẫn còn — user báo lại đúng triệu chứng này. Sửa: trả file
`000000` về ĐÚNG bản đã dán, viết `20260829010000` làm bước chuyển đổi (dùng
`information_schema` nên dán lại nhiều lần không sao), và bịt luôn chỗ nuốt
`error` ở Server Action khiến "lỗi đọc dữ liệu" và "chưa bật link" hiện giống
hệt nhau trên UI. Toàn bộ bài học ở DECISIONS.md — **luật cũ nhắc lại nghiêm:
file trong `supabase/migrations/` mà user đã dán là BẤT BIẾN, kể cả vừa tạo
vài phút trước; đổi thiết kế = migration MỚI, không sửa file cũ.**

✅ **Đợt 58 là NGOẠI LỆ hiếm hoi trong dự án: ĐÃ nghiệm thu bằng mắt + ĐÃ chạy
E2E trên DB thật, cả hai đều xanh.** User tự bấm thử trên `pnpm dev` (sáng +
tối, điện thoại) và xác nhận "ổn định, đẹp mắt". Sau khi dán migration,
`pnpm test:e2e` chạy `e2e/showcase.e2e.ts` (40 ca) trên DB thật: **40/40
xanh** ở cả 2 lần chạy trong phiên. (`grading.e2e.ts` có 1-3 ca đỏ vì Gemini
"đang quá tải" — flake đã biết, không liên quan nhánh này.) Vẫn CHƯA nghiệm
thu: toàn bộ Đợt 48→57 cũ (xem cảnh báo trong lịch sử phiên bên dưới, chưa
đổi từ trước tới giờ).

🔴 **`.claude/docs/GIT-WORKFLOW-RULES.md` SIẾT hơn `.claude/rules/git-workflow.md`
cũ** — đọc file này ĐẦU MỖI PHIÊN:
- KHÔNG tự ý commit/push/merge `develop`→`main` — phải đợi user xác nhận rõ
  ràng MỖI LẦN.
- Commit message tiếng Anh, `feat:`/`fix:`, **KHÔNG** `Co-Authored-By` hay bất
  kỳ attribution nào của Claude.
- Luôn `git branch --show-current` TRƯỚC KHI SỬA CODE.

**Bắt đầu phiên sau:** `git checkout develop && git pull --ff-only && git checkout -b feature/<slug>`
— và **kiểm tra lại branch trước MỖI lần sửa file**, không chỉ lần đầu. Cũng
nên `git log --oneline -3 main ^develop` một lần đầu phiên để bắt sớm kiểu
lệch nhánh vừa dính ở trên.

⚠️ **`pnpm build` xung đột với `pnpm dev` đang chạy** (lỗi lạ "Cannot find
module for page") — port 3000 dùng chung `.next` cache. Luôn `netstat -ano |
grep ":3000 " | grep LISTENING` trước khi build; nếu có, nhờ user dừng dev
server (đừng tự kill tiến trình của user).

**Deploy:** sửa `web/` → chỉ Vercel; sửa `ai-service/` → **cả Render**
(`/health`, so `commit` với `git log --oneline -1 main`). Máy dev KHÔNG vào
được `onrender.com` — phải nhờ user tự mở.

**Sản phẩm hiện có** (nghiệp vụ ở FEATURES.md, lịch sử ở ROADMAP.md): auth
USERNAME; khóa→lớp→buổi + sao chép lớp + chuyển học viên qua dialog riêng +
xếp loại học lực tích 1 lần/lớp + xem nội dung buổi khác để tham khảo + áp
nhận xét buổi trước cho cả lớp; nhận xét AI theo buổi (buổi kiểm tra định kỳ
tách 2 phần, buổi SPCK có ô quan sát riêng, GV tự thêm nhóm kỹ năng riêng) +
tổng hợp từng HV; bộ combo nhận xét = "chân dung học viên"; gợi ý nội dung
buổi học chạy được kể cả không gõ gì; tin Zalo cả lớp; khu Chấm bài 3 tab; khu
học viên theo lớp + Drive; gallery + hồ sơ HV xuyên khóa; API key Gemini
riêng; trang vận hành `/teacher/admin`; 3 màn chiếu TV; **link triển lãm sản
phẩm cuối khóa cho PHỤ HUYNH** (mới — `/showcase/<token>`, không cần đăng
nhập, bản sắc thị giác riêng "Bảng vàng", QR chiếu TV, phụ huynh chấm điểm +
nhận xét ẩn danh từng em); `pnpm dev` tự mở trình duyệt.

## ✅ Cổng kiểm tra & E2E

`web/`: **lint + typecheck + `pnpm test` (229 unit test) + build**.
`ai-service/`: **`.venv/Scripts/python -m pytest`** (68 test — Đợt 58 KHÔNG đụng ai-service).

E2E chạy trong `web/` trên DB THẬT (tự tạo, tự dọn), chia **HAI LOẠI** (Đợt 41):

**A. `pnpm test:e2e`** — gọi THẲNG thân Server Action (`web/e2e/*.e2e.ts`).
Đổi chữ ký hàm là `pnpm typecheck` đỏ, đổi hành vi là bộ này đỏ. **138 ca** —
`showcase.e2e.ts` (Đợt 58) đã chạy thật, 40/40 xanh. Các bộ action Đợt 48→57
(combo, SPCK, xếp loại theo lớp...) **vẫn CHƯA có ca nào** (xem cảnh báo trên).

🔴 **Bộ này KHÔNG phủ lớp React bọc quanh action** — gọi thẳng thân hàm.
**E2E xanh ≠ UI chạy được**, vẫn phải bấm thử — đã dính lỗi này 1 lần (Đợt 47,
thiếu `startTransition`). Đợt 58 là ngoại lệ: ĐÃ bấm thử thật, không chỉ dựa E2E.

| Bộ | Test | Ghi chú |
|---|---|---|
| `admin-ops.e2e.ts` | 21 | trang vận hành: guard, 3 action service-role, dọn file |
| `signup-login.e2e.ts` | 22 | signup/login/logout + createCourse/createClass |
| `assignments-storage.e2e.ts` | 19 | createAssignment (có ca **rollback file**), deleteCourse |
| `grading.e2e.ts` | 26 | **cần ai-service**; chấm bài + hỏi bài + trắc nghiệm. Tiêu 6 lượt Gemini |
| `reviews.e2e.ts` | 10 | nhận xét theo buổi + đánh vắng + gợi ý nội dung; 1 ca cần ai-service. Schema Đợt 57; **CHƯA có ca cho `applyReviewsFromSession`/combo mới** |
| `showcase.e2e.ts` | 40 | **MỚI Đợt 58**; link phụ huynh: token, ẩn HV, chấm điểm/sửa lượt/ẩn danh thật, công tắc hiện điểm TB, thả tim, lượt xem, thu hồi link (tắt/bật/đổi token/hết hạn), ranh giới RLS 3 bảng mới. Không cần ai-service |

**B. `node --env-file=.env.local scripts/<script>`** — probe RLS gọi REST trần,
CỐ Ý bỏ qua code app. **ĐỪNG chuyển sang gọi action.** 7 script, ~101 ca —
xem chi tiết ở git log nếu cần (không đổi gì phiên này).

⚠️ Hạn mức Gemini free = **20 lượt/NGÀY theo Google Cloud PROJECT** (không theo
key). E2E gọi AI đỏ thì nghi hạn mức trước, đọc log ai-service (`Gemini quota
exhausted` vs `unavailable (high demand)`).

Công cụ chẩn đoán: `/health` ai-service, `scripts/check-integrity.mjs`,
`scripts/check-user.mjs`, `scripts/purge-test-users.mjs [--yes]`.

## 📌 Quyết định đã chốt → `.claude/docs/DECISIONS.md`

Đọc DECISIONS.md trước khi định làm ngược một quyết định cũ; thêm quyết định
mới cũng ghi vào đó. Phiên Đợt 58 thêm ~12 mục — trọng tâm: ảnh sản phẩm là
LINK NGOÀI (không Storage), trang công khai đi qua RPC SECURITY DEFINER
(không mở policy anon, không service-role), link hết hạn mặc định 7 ngày,
đổi "lời chúc" → "chấm điểm ẩn danh" (bảng KHÔNG có cột tên), điểm trung bình
mặc định KHÔNG hiện cho phụ huynh (tránh xếp hạng trẻ con), bản sắc thị giác
riêng "Bảng vàng" phải qua test tương phản WCAG AA, không dùng emoji làm phần
tử giao diện.

## ⚠️ Vấn đề đang mở / cần chú ý

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chưa phủ hầu hết action Đợt 48→57** (xem bảng trên) — `showcase.e2e.ts`
  của Đợt 58 là bộ MỚI DUY NHẤT đã đủ ca. Ưu tiên nếu làm tiếp:
  `applyReviewsFromSession` (rủi ro cao nhất, ghi hàng loạt + gọi AI hàng
  loạt), `setEnrollmentAcademicLevel`/combo mới Đợt 57, `addSkillGroup`/
  `deleteSkillGroup` Đợt 55.
- 🟡 Phần RENDER của component không có test — nghiệm thu bằng mắt (có ý thức).
- 🟡 `buildOpsReport` đếm dòng bằng `{ head: true }` — nuốt lỗi PostgREST (xem
  DECISIONS.md).
- 🟡 E2E action còn thiếu: tin Zalo, API key, mật khẩu — mới chỉ có probe RLS.
  Mẫu ở `web/e2e/_harness.ts`, nhớ khai tiền tố vào `test-user-prefixes.json`.

### Ràng buộc môi trường (không sửa được, phải sống chung)
- Migration dán tay vào Supabase SQL Editor — mạng chặn cổng 5432/6543. SQL
  KHÔNG xóa được Storage (lỗi 42501) — phải qua Storage API.
- CLI supabase KHÔNG có trong node_modules — sửa tay `database.types.ts` an
  toàn hơn `pnpm dlx supabase` (dấu `>` cắt trắng file nếu CLI lỗi giữa chừng).
- DLP công ty mã hóa file trên máy user → đã chặn ở `file-check.ts`/`storage.py`.
- `git push --force` bị chặn — cần thì đưa lệnh cho user tự chạy.
- Git identity local = `truonghoangduy2612@gmail.com` — Vercel chặn deploy nếu
  author khác, KHÔNG đổi.
- Render free cold start 30–60s; **`maxDuration = 60`** đã thêm ở
  `sessions/[id]/page.tsx` vì trang này có thể gọi AI cho cả lớp một lượt.
- Supabase free pause sau 7 ngày im; GitHub Actions keep-alive tự tắt nếu repo
  im 60 ngày.
- `pnpm dev` giờ TỰ MỞ trình duyệt (`web/scripts/dev.mjs`) — vẫn có thể để lại
  tiến trình mồ côi trên port 3000 nếu dừng không sạch; kill port + xóa
  `web/.next` nếu gặp lỗi lạ. Script dùng service key phải đặt TRONG
  `web/scripts/`.

## 🗂 Lịch sử phiên gần đây (nén — chi tiết đầy đủ nằm trong git log từng commit)

### 2026-08-29 — Đợt 58 (`feature/parent-showcase-link`) — link triển lãm sản phẩm cho PHỤ HUYNH
User muốn một link công khai gửi phụ huynh xem sản phẩm cuối khóa của cả lớp
trong buổi lễ tốt nghiệp. Khảo sát trước khi code (không có sẵn khái niệm
"khách vãng lai" trong app — mọi route đều sau `requireRole`), hỏi rõ 4 điểm
mơ hồ bằng `AskUserQuestion` (phạm vi, nội dung hiện, hiện tên đầy đủ hay
viết tắt, hạn dùng mặc định) trước khi viết migration đầu tiên.

**Thiết kế đổi 2 lần theo phản hồi trực tiếp** (giống nếp cũ của Đợt 48→54):
(1) bản đầu có "lời chúc" công khai + thanh tên các em dính đầu trang để
chuyển bạn; (2) user xem xong yêu cầu đổi hẳn sang "chấm điểm + nhận xét ẨN
DANH" (3 tiêu chí sao Sản phẩm/Thuyết trình/Sáng tạo, đều được bỏ trống) và
bỏ thanh tên → chuyển sang POPUP khi bấm vào từng em, vì thanh tên 12-20 nút
cuộn ngang không hợp điện thoại. Bảng `showcase_ratings` thay hẳn
`showcase_messages` — không có cột tên vì ẩn danh là RÀNG BUỘC THIẾT KẾ.

**Sự cố migration** (xem chi tiết ở "Trạng thái hiện tại" phía trên): sửa
thẳng file migration đã dán thay vì tạo file mới, khiến panel "chưa bật link"
sai sự thật ngay sau lần đổi thiết kế. Vá bằng migration nối tiếp
(`information_schema`, dán lại vô hại) + bịt chỗ nuốt `error` khiến triệu
chứng khó chẩn đoán.

## Cập nhật phiên làm việc (Cập nhật bởi: Gemini)
- Hoàn thành tính năng sinh lời chào Buổi 1 bằng AI (Gemini/OpenAI) thay vì hardcode. Tính năng lấy API Key/Provider từ cài đặt cá nhân của người dùng.
- Tinh chỉnh Prompt cho lời chào Buổi 1: không dùng emoji, format chuẩn Zalo, văn phong trang trọng, ngôn ngữ chuẩn học đường.
- Setup cron job để tự động dọn dẹp các bản ghi Showcase hết hạn (dùng `pg_cron`).
- Đã merge và deploy code (feature/ai-session-1-greeting -> develop -> main).
- Bổ sung tính năng lọc theo tên học viên & tên sản phẩm trên trang Showcase phụ huynh (`/showcase/[token]`), Thư viện học viên (`/student/classes/[classId]/gallery`), và Thư viện giáo viên (`/teacher/gallery`). Loại bỏ điều kiện `projects.length > 6` để các lớp nhỏ vẫn luôn có ô tìm kiếm. Đã bổ sung unit tests và pass toàn bộ 264 tests. (Nhánh `feature/showcase-name-filter`).

**Bản sắc thị giác riêng "Bảng vàng"** (user yêu cầu RÕ RÀNG "không phải
giao diện tối mặc định", duyệt bản kế hoạch trước khi code): palette ngà/than
ấm + đồng thau + đất nung khoanh trong `.showcase-theme`, Playfair Display +
Dancing Script, motif triện tốt nghiệp (phát triển từ icon mũ tốt nghiệp sẵn
có) dùng 3 cỡ, viền kép giấy khen, checklist thành tích thay hàng tag rời
rạc, sao/tim vẽ SVG thay emoji hệ thống. `contrast.test.ts` MỚI đọc hex thẳng
từ `globals.css`, ép mọi cặp chữ/nền cả 2 mode đạt WCAG AA — đổi màu không
qua test là biết ngay, không phải duyệt bằng mắt. Bug kỹ thuật đáng nhớ:
popup Radix portal ra ngoài cây DOM của layout nên không thừa kế được biến
font/màu — phải tách `.showcase-theme` (khai biến) khỏi `.showcase-surface`
(sơn nền) và truyền tay class font xuống popup.

**Phát hiện cuối phiên (trước khi merge)**: `develop` thiếu 1 commit
docs-only đã có trên `main` (xem "Trạng thái hiện tại") — dựng lại docs Đợt
58 trên nền `main` thay vì để git tự 3-way-merge các file prose dài.

Dependency MỚI (user duyệt): `qrcode-generator`. Ảnh sản phẩm đổi hẳn sang
link ngoài học viên tự dán (không Storage, user chốt vì chi phí — lợi phụ:
hết nạn file mồ côi).

`lint + typecheck + 229 unit test + build` sạch; `pnpm test:e2e` 138 ca,
`showcase.e2e.ts` (40 ca) 40/40 xanh trên DB thật sau khi user dán migration.
User tự nghiệm thu bằng mắt (sáng + tối, điện thoại): "ổn định, đẹp mắt".

> Phiên cũ hơn (Đợt 1→57): xem ROADMAP.md — đã có tóm tắt + bài học nén sẵn ở
> đó, không lặp lại ở đây nữa.
