# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-31, bởi: Claude)

**Đang làm:** KHÔNG có task dở. Đợt 41→44 đã merge và **push lên `main`**.

**`main` = `origin/main` = `237f6cd`** — vừa đẩy lên production, user đã nghiệm
thu trên máy dev trước khi deploy.

⚠️ **Đợt 43 SỬA `ai-service/` (endpoint `/help-student`) → Render PHẢI deploy
lại.** Kiểm bằng cách mở `https://eduverse-ai.onrender.com/health`, trường
`commit` phải là **`237f6cd`**. Còn hiện `403891b` nghĩa là Render CHƯA build
xong — tab "Hỏi bài" sẽ báo lỗi kết nối cho tới lúc đó (Vercel deploy nhanh hơn
Render nhiều). Máy dev KHÔNG vào được `onrender.com`, phải mở trên máy user.

- **Đợt 41** (`feature/e2e-action-harness`): chỉ test + tài liệu, **78/78 E2E xanh**.
- **Đợt 42** (`fix/mobile-nav-and-grading-reset`): sửa `src/` thật (nav mobile,
  nút Xóa hết, luật nạp file) — user đã nghiệm thu bằng mắt trên máy mình.

Cả hai đợt **không có migration**.

⚠️ **Hạn mức Gemini tính theo GOOGLE CLOUD PROJECT, không theo key** — log ghi
`quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier`. Tạo key mới trong
CÙNG project thì vẫn chung 20 lượt/ngày đã cạn; phải là key của project KHÁC.
Và key ở trang Hồ sơ (`user_secrets`) KHÔNG giúp gì cho E2E: bộ test tự tạo tài
khoản mới nên luôn rơi về `GEMINI_API_KEY` trong `ai-service/.env`.

**`main` = `origin/main` = `b51e818`** — bản đang chạy production, KHÔNG đổi.
**`develop` = `origin/develop`** = main + vài commit docs ghi hash (CỐ Ý không
merge sang `main`: merge đẻ hash mới làm ghi chú sai lại — vòng lặp đã dính
2026-07-21).

**Bắt đầu phiên sau:** nếu làm việc KHÁC thì
`git checkout develop && git checkout -b feature/<slug>` **trước khi sửa dòng
code nào** (đừng commit thẳng vào main/develop).

**Kiểm Render đang chạy bản nào** (Đợt 40): mở
`https://eduverse-ai.onrender.com/health` → `commit` phải khớp
`git log --oneline -1 main`. Không cần dashboard.
⚠️ **Máy dev KHÔNG vào được `onrender.com`** (DNS đúng, HTTPS ra ngoài vẫn tốt,
nhưng timeout ở 60/120/180s — nghi mạng công ty chặn, môi trường này vốn đã chặn
cổng 5432/6543). Claude không tự xác nhận Render được → phải mở trên máy user.
Đừng kết luận "Render hỏng" chỉ vì curl từ máy dev không thông.

⚠️ **`ADMIN_USERNAMES` phải có ở CẢ `web/.env.local` và Vercel** — chưa khai thì
`/teacher/admin` đá về `/teacher` (fail closed). Biến thêm SAU deploy không áp cho
bản đã build → phải redeploy.

**Sản phẩm hiện có** (nghiệp vụ ở FEATURES.md, lịch sử ở ROADMAP.md): auth
USERNAME; khóa→lớp→buổi + sao chép lớp; nhận xét AI theo buổi + tổng hợp từng HV
(12 nhóm kỹ năng, xếp loại học lực, đánh vắng, copy nhận xét, bộ combo); tin Zalo
cả lớp; **chấm bài AI 2 tab** (bài tập hàng ngày CÓ điểm / sản phẩm cuối khóa
KHÔNG điểm), nhận file lẻ + thư mục + `.zip`, đọc được Word `.docx`; **khu học
viên chia THEO LỚP** + link Drive nộp bài; gallery + hồ sơ HV xuyên khóa; API key
Gemini riêng có công tắc; trang vận hành `/teacher/admin`; 3 màn chiếu TV.

## ✅ Cổng kiểm tra & E2E

`web/`: **lint + typecheck + `pnpm test` (92 unit test) + build**.
`ai-service/`: **`.venv/Scripts/python -m pytest`** (27 test).

E2E chạy trong `web/` trên DB THẬT (tự tạo, tự dọn), chia **HAI LOẠI** từ Đợt 41:

**A. `pnpm test:e2e`** — gọi THẲNG thân Server Action (`web/e2e/*.e2e.ts`).
Đổi chữ ký hàm là `pnpm typecheck` đỏ, đổi hành vi là bộ này đỏ. Không mock
Supabase: session thật trong `CookieJar` nên RLS còn hiệu lực. **78/78 xanh**
(2026-07-31, có cả 3 ca gọi Gemini thật).

| Bộ | Test | Ghi chú |
|---|---|---|
| `admin-ops.e2e.ts` | 21 | trang vận hành: guard, 3 action service-role, dọn file |
| `signup-login.e2e.ts` | 22 | signup/login/logout + createCourse/createClass |
| `assignments-storage.e2e.ts` | 19 | createAssignment (có ca **rollback file**), deleteCourse |
| `grading.e2e.ts` | 16 | **cần ai-service**; chỉ tiêu 3 lượt Gemini, các ca khác miễn phí |

**B. `node --env-file=.env.local scripts/<script>`** — probe RLS gọi REST trần,
CỐ Ý bỏ qua code app để giả lập kẻ tấn công. **ĐỪNG chuyển sang gọi action.**

| Script | Test | Ghi chú |
|---|---|---|
| `e2e-phase2.mjs` | 17 | hồ sơ HV xuyên khóa + nhóm kỹ năng |
| `e2e-api-key.mjs` | 8 | |
| `e2e-class-admin.mjs` | 18 | đổi/đặt lại mật khẩu |
| `e2e-drive-link.mjs` | 14 | RLS link Drive của HV |
| `e2e-profile-privileges.mjs` | 10 | chống leo thang quyền, quyền theo CỘT |
| `e2e-phase4.mjs` | 25 | **cần ai-service** — thêm `--env-file=../ai-service/.env` |
| `e2e-project-review.mjs` | 9 | như phase4 — nhận xét sản phẩm (không cần Supabase) |

⚠️ Chỉ được có MỘT ai-service. Port 8000 hay kẹt "socket ma" (tiến trình chết mà
listener vẫn trả lời) → chạy port khác + `AI_SERVICE_URL=http://localhost:<port>`
(mọi script E2E đều đọc biến này).

⚠️ **E2E gọi AI đỏ thì NGHI GEMINI TRƯỚC, đừng sửa code.** Hai nguyên nhân, đọc
log ai-service là biết ngay (từ Đợt 35 cả hai đều được log):
`Gemini quota exhausted` = hết lượt — **free tier chỉ 20 lượt/NGÀY** cho
`gemini-3.6-flash` mà mỗi bộ gọi 6-10 lượt → **2 bộ là hết ngày**, không phải
task đang treo; `Gemini unavailable (high demand)` = Google tắc nghẽn, chạy lại
sau ít phút là được.

Công cụ chẩn đoán: `/health` của ai-service (commit đang chạy),
`scripts/check-integrity.mjs`, `scripts/check-user.mjs <username>`,
`scripts/purge-test-users.mjs [--yes]`.


## 📌 Quyết định đã chốt → `.claude/docs/DECISIONS.md`

Đã tách ra file riêng (2026-07-30). **Đọc DECISIONS.md trước khi định làm
ngược một quyết định cũ**; thêm quyết định mới cũng ghi vào đó, không ghi ở đây.

## ⚠️ Vấn đề đang mở / cần chú ý

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **Phần RENDER của component không có test** — nghiệm thu bằng mắt. Lựa chọn
  có ý thức: bug render lộ ra ngay khi nhìn, còn logic thuần thì không.
- 🟡 **`buildOpsReport` đếm dòng bằng `{ head: true }`**, mà cách gọi đó NUỐT lỗi
  PostgREST (xem DECISIONS.md) → bảng bị drop sẽ hiện `0` thay vì báo lỗi. Nhỏ,
  biết để đó.
- 🟡 **Các bộ E2E gọi action mới chưa phủ hết action** — mới có admin, auth,
  khóa/lớp, đề bài, chấm bài. Nhận xét (`reviews`, `zalo`), sản phẩm
  (`projects`), API key, mật khẩu vẫn chỉ có probe RLS. Thêm bộ mới thì theo mẫu
  `web/e2e/_harness.ts` và nhớ khai tiền tố vào `test-user-prefixes.json`.

### Đã trả xong (Đợt 41) — đừng mở lại
- ✅ ~~E2E chỉ mô phỏng logic server action~~ — 3 chỗ chép lại logic đã chuyển
  sang gọi thẳng thân hàm; 7 script còn lại là probe RLS, CỐ Ý giữ nguyên.
- ✅ ~~Trang vận hành chưa có E2E~~ — `admin-ops.e2e.ts`, 21 ca.
- ✅ ~~`e2e-gallery-storage` flake ở ca "file cũng biến mất"~~ — nhiều khả năng do
  hỏi `download()` (qua CDN, trả bản cũ) thay vì `list()` (metadata Postgres).
  Bộ mới chỉ hỏi `list()`. Nếu còn đỏ nữa thì mới điều tra tiếp.

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

### 2026-07-31 — Đợt 43 + 44: tab "Hỏi bài" và gộp phần nhận file (production `237f6cd`)
**Đợt 43** — tab thứ 3 của khu Chấm bài: GV nạp đề (+ code/ảnh chụp màn hình của
em nếu có) → AI trả gợi ý ĐƠN GIẢN để GV Copy dán lại cho em qua Zalo. Đây là chỗ
DUY NHẤT trong hệ thống mà văn bản AI sinh ra được HỌC VIÊN đọc tận mắt, nên có
`STUDENT_HELP_RULE` riêng (ghì độ khó, cấm giải hộ bài, code minh họa ≤3 dòng).
KHÔNG chấm điểm. Bắt được khi chạy E2E: Gemini vẫn tự viết `dang_o_dau` dù prompt
dặn trả rỗng → phải ép ở server, chế độ đã biết chắc từ đầu vào.

**Đợt 44** — user chỉ ra 3 tab đang có 3 logic nhận file. Đo lại: 2 bản gần y hệt
(nợ tôi tự tạo ở Đợt 43) + 1 bản khác thật. Gộp thành 1 hook + 2 component,
**1635 → 830 dòng** ở 3 tool. Giữ tham số hóa 4 khác biệt nghiệp vụ, thống nhất 3
thứ về thao tác — chi tiết ở DECISIONS.md.

### 2026-07-31 — Đợt 42: 3 lỗi UI user báo khi dùng thật
Nav giáo viên đè lên nút đổi giao diện trên điện thoại — 4 nhãn tiếng Việt
(~214px chữ) cộng logo + nút + avatar không vừa hàng ~360px. Cho nav xuống hàng
riêng **khi có >2 mục** (học viên 1 mục thì giữ nguyên, đẩy xuống là phí một
dòng). Nút "Xóa hết" từ chữ xám `text-xs` thành `Button variant="destructive"`
kèm số file, ở CẢ hai tab. Nạp file sau khi đã chấm giờ mở bài mới thay vì giữ
file của em trước (trước đây trộn bài hai em mà GV không nhận ra).
Quyết định + lý do ở DECISIONS.md — trong đó có ngoại lệ CÓ CHỦ Ý của luật
"mọi hành động xóa dùng ConfirmDialog".

### 2026-07-31 — Đợt 41: trả 2 món nợ E2E (production `403891b`)
Dựng bộ E2E **gọi thẳng thân Server Action** (`pnpm test:e2e`, config riêng, không
thêm dependency): stub `next/headers` bằng `CookieJar` giữ session THẬT nên RLS
còn nguyên hiệu lực — không mock Supabase. Phủ trang vận hành `/teacher/admin`
(21 ca, khu chạy service-role nên không có RLS đỡ) và chuyển 3 chỗ E2E đang chép
lại logic action sang gọi thật; 7 script probe RLS giữ nguyên vì chúng CỐ Ý gọi
REST trần để giả lập kẻ tấn công. 78 ca, 75 xanh.

**Bắt được khi làm:** `e2e-phase1.mjs` tạo tài khoản `e2e.*` mà tiền tố đó chưa
từng được khai → script dọn không thấy; regex canh chuyện này chỉ bắt `makeUser(`
nên bỏ sót suốt. **Đo được 2 cạm bẫy** (đã ghi DECISIONS.md): `download()` trả
bản cũ sau khi xóa file còn `list()` thì không — nhiều khả năng là gốc của flake
điều tra 2 lượt không ra; và `{ head: true }` nuốt lỗi PostgREST nên ca "bảng
phải biến mất" viết kiểu đó pass suông theo cả hai chiều (đã thử tên bảng bịa,
vẫn `error: null`).

### 2026-07-30 — Đợt 26→40 (một phiên dài, TẤT CẢ đã production `b51e818`)
Chi tiết từng đợt ở ROADMAP.md; quyết định ở DECISIONS.md. 7 migration, đều đã áp.

**Tính năng (26→31):** bỏ dòng tiêu đề khỏi text copy nhận xét tổng hợp; chấm bài
đọc **Word .docx** (stdlib `zipfile`, KHÔNG thêm dep); lọc đề theo khóa; kéo thả
nhiều file; **tab "Sản phẩm cuối khóa"** (`/review-project` — KHÔNG đề bài, KHÔNG
điểm, trả 3 nhóm); nạp bài bằng **cả thư mục và .zip** cho hai tab; **khu học viên
chia THEO LỚP** (`/student/classes/[classId]/...`) + **link Drive nộp bài**
(`student_drive_links`, 1 link/HV, GV + bạn cùng lớp xem được); drop cột
`projects.drive_url` đã chết.

**🔴 Bảo mật (33→37) — 4 lỗ, CÙNG MỘT GỐC "ràng buộc đặt sai tầng":** stored XSS ở
link người dùng dán · vượt mọi giới hạn nhập liệu · **HV tự nâng role thành teacher**
(chuỗi dẫn tới đặt lại mật khẩu HV bất kỳ) · **HV tự ghi danh vào lớp khác** rồi đọc
sản phẩm + link Drive riêng. Cả 4 đều XANH mọi cổng kiểm tra lúc còn tồn tại — tìm
ra bằng **probe giả lập kẻ tấn công gọi REST API trực tiếp**, bỏ qua code app.
Mỗi lỗ: probe kiểm chứng TRƯỚC khi sửa, đo dữ liệu thật TRƯỚC khi thêm constraint.

**Chất lượng & vận hành (32, 38→40):** Vitest + **92 unit test** (bắt được bug `đ`
trong `sanitizeFileName`: "đề bài" → `_e_bai`); tách `DECISIONS.md`; xóa 14 nhánh đã
merge; gộp nguồn duy nhất cho tiền tố tài khoản test (danh sách ĐÃ lệch thật, dọn 6
tài khoản rác nó bỏ sót); thông báo lỗi Gemini phân biệt hết-lượt vs tắc-nghẽn + log
cả hai; phát hiện hạn mức thật **20 lượt/ngày** (4 chỗ ghi 1.500, kể cả text cho học
viên); `/health` trả commit đang chạy.

**Bài học quy trình:** 3 lần test tôi viết đỏ mà CODE ĐÚNG (kỳ vọng sai); 1 lần test
**pass suông** vì nạn nhân chưa có dữ liệu gì để mất; flake `e2e-gallery-storage`
điều tra 2 lượt, 15 lượt chạy liên tiếp đều xanh → **không tái hiện được**, chỉ làm
nó chẩn đoán được.


### 2026-07-18 → 27 — Đợt 13→25 (đều production; chi tiết đầy đủ ở ROADMAP.md)
Nhóm kỹ năng + `TONE_RULE`; accordion Cài đặt; mỗi nhóm ≥10 lựa chọn (Đợt 13-17).
Trang vận hành `/teacher/admin` chặn bằng `ADMIN_USERNAMES` (18). `academic_level`
+ `is_absent`; công tắc key riêng; `review_combos`; sao chép lớp; nút lên đầu trang
(19-25). **Bài học git:** Đợt 20 suýt deploy trước khi dán migration → từ đó luôn
hỏi user xác nhận migration trước khi push.
