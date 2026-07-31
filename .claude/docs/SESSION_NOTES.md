# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-30, bởi: Claude)

**Đang làm:** KHÔNG có task dở. Đợt 27→31 đã deploy, user xác nhận
2026-07-30 "đã deploy tất cả". **CẢ 3 migration của phiên này ĐÃ áp** — đã đo
lại trên DB thật: `projects.drive_url` báo "does not exist" (drop xong),
`student_drive_links` có dữ liệu thật.

**`main` = `origin/main` = `31d6165`** — bản đang chạy production (Đợt 27-31).
**`develop` = `origin/develop`** = main + Đợt 31 + commit docs ghi hash
(CỐ Ý không merge sang `main`: merge sẽ đẻ hash mới làm ghi chú sai lại — vòng
lặp đã dính 2026-07-21). Lệch vài commit docs là BÌNH THƯỜNG.
Nhánh `feature/project-review-grading`, `feature/student-class-tabs-drive-link`,
`chore/drop-project-drive-url` đã merge — **xóa được**.

⚠️ **KHÔNG kiểm chứng được ai-service production từ máy dev**:
`eduverse-ai.onrender.com` phân giải DNS đúng (216.24.57.x) và HTTPS ra ngoài vẫn
chạy (github 200), nhưng `/health` trả HTTP 000 sau 60-120s — nghi mạng công ty
chặn `onrender.com` (môi trường này vốn đã chặn cổng 5432/6543). Muốn kiểm thì
mở URL đó trên trình duyệt của user, hoặc bấm thử "Nhận xét sản phẩm" trên
production. **Đừng kết luận Render hỏng chỉ vì curl từ máy dev không thông.**

✅ **Đợt 27→31 ĐÃ nghiệm thu bằng mắt** (user xác nhận 2026-07-30) — không còn
việc treo nào của các đợt này.

⚠️ **`ADMIN_USERNAMES` phải có ở `web/.env.local` (local) VÀ Vercel (production)**
— chưa khai thì `/teacher/admin` đá về `/teacher` (fail closed). Biến thêm SAU
deploy KHÔNG áp cho bản đã build → phải redeploy.

**Sản phẩm hiện có** (nghiệp vụ chi tiết ở FEATURES.md, lịch sử ở ROADMAP.md):
Auth USERNAME, khóa→lớp→buổi, **sao chép lớp** (giáo án lấy từ lớp khác, thành
viên chọn, không chép nhận xét); nhận xét AI theo buổi + tổng hợp từng HV (12
nhóm kỹ năng, **xếp loại học lực** ngữ cảnh AI, **đánh vắng**, **copy điểm
mạnh/cải thiện** từ bạn cùng buổi/buổi trước, **bộ combo** `review_combos` tạo
ở Cài đặt + seed ~22 mẫu); tin Zalo tổng hợp cả lớp; **chấm bài AI độc lập 2 tab
(bài tập hàng ngày có điểm / sản phẩm cuối khóa KHÔNG điểm), nhận cả thư mục và
.zip, đọc được Word .docx**; sản phẩm cuối khóa + gallery; hồ sơ HV xuyên khóa;
**API key Gemini riêng có công
tắc bật/tắt**; đổi mật khẩu không cần cũ; 3 màn chiếu TV; **trang vận hành
`/teacher/admin`** (ADMIN_USERNAMES); nút "↑ lên đầu trang" + khối thu gọn ở
trang lớp/Cài đặt; GitHub Action keep-alive Supabase.

**Bắt đầu phiên sau thế nào:** `git checkout develop && git checkout -b feature/<slug>`
**trước khi sửa bất kỳ dòng code nào** (đừng commit thẳng vào main/develop).

**Cổng kiểm tra `web/`: lint + typecheck + `pnpm test` (54 unit test) + build.**

**E2E 120/120 PASS** trên DB thật (chạy trong `web/`, tự tạo & tự dọn dữ liệu):

| Script | Số test | Lệnh |
|---|---|---|
| `e2e-phase1.mjs` | 13 | `node --env-file=.env.local scripts/e2e-phase1.mjs` |
| `e2e-phase2.mjs` | 17 | như trên (hồ sơ HV xuyên khóa + nhóm kỹ năng) |
| `e2e-api-key.mjs` | 8 | như trên |
| `e2e-class-admin.mjs` | 18 | như trên (đổi/đặt lại mật khẩu) |
| `e2e-gallery-storage.mjs` | 18 | như trên — gallery GV, xóa sạch Storage |
| `e2e-phase3.mjs` | 13 | **cần ai-service chạy** — thêm `--env-file=../ai-service/.env` |
| `e2e-phase4.mjs` | 15 | như phase3 (xóa SP, RLS, roster bạn cùng lớp) |
| `e2e-project-review.mjs` | 9 | như phase3 — nhận xét sản phẩm cuối khóa (không cần Supabase) |
| `e2e-drive-link.mjs` | 9 | `node --env-file=.env.local ...` — RLS link Drive của HV |

⚠️ Trước khi chạy phase3/4: chỉ được có MỘT ai-service. Nếu port 8000 kẹt
"socket ma" (tiến trình chết mà listener vẫn trả lời) → chạy port khác + env
`AI_SERVICE_URL=http://localhost:<port>` (mọi script E2E đều đọc biến này).

Công cụ chẩn đoán: `scripts/check-integrity.mjs` (toàn vẹn dữ liệu),
`scripts/check-user.mjs <username>` (tra 1 tài khoản),
`scripts/purge-test-users.mjs [--yes]` (dọn tài khoản rác E2E, mặc định xem thử).

## 📌 Quyết định đã chốt → `.claude/docs/DECISIONS.md`

Đã tách ra file riêng (2026-07-30). **Đọc DECISIONS.md trước khi định làm
ngược một quyết định cũ**; thêm quyết định mới cũng ghi vào đó, không ghi ở đây.

## ⚠️ Vấn đề đang mở / cần chú ý

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chỉ mô phỏng logic server action, không gọi thẳng thân hàm** — đổi
  action mà quên đổi script thì test vẫn xanh; UI phải nghiệm thu bằng mắt.
- 🟡 **Trang vận hành chưa có E2E** — chỉ lint/typecheck/build + user bấm tay.
- 🟡 **Vitest chỉ phủ LOGIC THUẦN** (54 test: lọc file, ZIP, docx, drive-url).
  Component + Server Action vẫn không có test — nghiệm thu bằng E2E + bấm tay.
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

### 2026-07-30 — Đợt 30 (`student-class-tabs-drive-link`, 2 mig, CHƯA merge)
Khu HV chia theo LỚP (tabs vào trong từng lớp, sản phẩm/gallery query đúng
`class_id`); link Drive nộp bài 1/HV dùng mọi lớp (`student_drive_links`), GV +
bạn cùng lớp xem được, hiện dạng chip gọn; bỏ ô Drive khỏi form sản phẩm; dọn
popup xem sản phẩm. BỎ ý tưởng nhúng ảnh từ Drive. E2E mới 9/9.

### 2026-07-30 — Đợt 27→29 (1 phiên, cùng ngày, đều đã push production `03ab717`)
Chi tiết từng đợt ở ROADMAP.md; nghiệp vụ ở FEATURES.md. **Đợt 27+28 đổi
`ai-service` → Render phải deploy lại** (Đợt 29 chỉ web).
- **Đợt 27** (`grading-word-dropzone-filter`, 0 mig): nút "Bỏ chọn tất cả" ở
  `MultiSelect`; **chấm bài đọc Word .docx** (`docx_to_text` bằng stdlib
  `zipfile`+`ElementTree`, KHÔNG thêm dependency); lọc đề đã lưu theo khóa
  (`saved-assignments.tsx`); kéo thả nhiều file. Sau đó dọn UI ô thả 3 lượt theo
  yêu cầu user (bỏ chữ "Choose Files" của trình duyệt bằng `<label>`; bấm đâu
  cũng chọn được file; bớt chữ; to lên) + xem đề .docx thẳng trong popup
  (`docx-text.ts` tự đọc ZIP bằng `node:zlib`). pytest 11/11, E2E phase3 12/12.
- **Đợt 28** (`project-review-grading`, 0 mig): **tab "Sản phẩm cuối khóa"** —
  nav Chấm bài chia 2 tab; `/review-project` KHÔNG đề bài KHÔNG điểm, trả 3 nhóm;
  3 đường đầu vào (thả thư mục / `webkitdirectory` / .zip giải nén ở server);
  `lib/zip.ts` + `lib/submission-files.ts`. pytest 18/18, E2E mới 9/9.
- **Đợt 29** (cùng nhánh, 0 mig): tab bài tập hàng ngày CŨNG nhận thư mục/.zip;
  `skipReasonFor` có options (bài tập giữ ảnh+PDF/Word, sản phẩm bỏ);
  `lib/zip-submission.ts` dùng chung; lỗi chia 2 mức; thông báo xanh sau khi đọc
  file. **Kiểm chứng "không lưu file bài làm"** + thêm E2E canh Storage
  (phase3 12→13).

### 2026-07-27 — Đợt 26 (`summary-copy-drop-header`, 0 mig, đã deploy)
`toCopyText` bỏ dòng tiêu đề `NHẬN XÉT TỔNG HỢP — <tên HV>` — text copy bắt đầu
ngay ở `TRONG QUÁ TRÌNH HỌC:` để GV dán thẳng vào tin phụ huynh. Panel trên màn
hình VẪN hiện tên HV (chỉ text copy là bỏ) — đừng "sửa lại cho đồng bộ".

### 2026-07-27 — Đợt 19→25 (7 đợt, đều production; chi tiết ở ROADMAP.md)
Đợt 19 `academic_level`+`is_absent` (mig `20260726000000`, 🐛 tách
`review-status.ts` vì gọi hàm client từ server); 20 `user_secrets.use_own_key`
(mig `20260727000000`); 21 copy nhận xét 2 nhóm + bảng `review_combos` (mig
`20260728000000`); 22 gõ câu mới trong ô tick + seed ~22 combo; 23 sao chép lớp;
24 nút "↑ lên đầu trang" + `CollapsibleCard`; 25 dọn nhận xét tổng hợp + nút quay
lại. **Bài học git**: Đợt 20 suýt deploy trước khi dán migration → từ đó luôn
hỏi user xác nhận migration trước khi push.

### 2026-07-24 — Trang vận hành `/teacher/admin` (Đợt 18, production)
Bản web của 3 script chẩn đoán + 2 kiểm tra mới (khóa/lớp mất GV chủ, file
Storage mồ côi). Chặn bằng `ADMIN_USERNAMES`, service-role nên mọi action tự
`denyIfNotAdmin()`.

### 2026-07-21 — gallery/review/chấm bài + gợi ý buổi + Zalo 1-1 (production)
MultiSelect có ô tìm; roster "chưa khai báo" bên GV + `project-limits.ts`; lọc
lớp gallery GV; chống lặp lời văn review (`prior_comments`); nhập tự do điểm
mạnh/cải thiện (tự lưu vào `review_options`); gợi ý nội dung buổi bằng AI; Zalo
cá nhân hóa lớp 1-1. Zalo chống-lặp-qua-buổi: HỦY (yêu cầu nhầm).

### 2026-07-18 — Đợt 13→17 + 4 fix (1 ngày, đều production)
Nhóm kỹ năng + `TONE_RULE` (13); copy nhận xét riêng + bộ lọc Đã/Chưa (14); Zalo
quay lại liệt kê kiến thức (15 — suýt xóa nhầm 50 câu GV tự soạn, bài học ở
"Quyết định đã chốt"); accordion Cài đặt theo nhóm (16); mỗi nhóm ≥10 lựa chọn,
seed 112+112 (17). 4 fix: API key chặn nhầm key không "AIza"; prompt Zalo sai 3
lần liên tiếp.

> Lịch sử cũ hơn 2 tuần (GĐ 1–5 + Đợt 1–12, nền tảng 2026-07-15→16) đã xóa khỏi
> file này — xem `ROADMAP.md` và git log.
