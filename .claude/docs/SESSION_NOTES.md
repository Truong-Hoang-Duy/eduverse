# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-31, bởi: Claude)

**Đang làm:** KHÔNG có task dở. Đợt 41→46 đã merge, deploy và **user xác nhận
chạy tốt trên production** (cả Vercel lẫn Render).

**`main` = `origin/main` = `76c7106`** — bản đang chạy production.
**`develop` = `origin/develop` = `c2005f9`** = main + vài commit docs ghi hash
(CỐ Ý không merge ngược sang `main`: merge đẻ hash mới làm ghi chú sai lại —
vòng lặp đã dính 2026-07-21). Chỉ còn `main` + `develop`, nhánh feature đã xóa.

**Cả 6 đợt KHÔNG có migration nào** — schema DB không đổi từ `b51e818`.

**Bắt đầu phiên sau:** `git checkout develop && git checkout -b feature/<slug>`
**trước khi sửa dòng code nào** (đừng commit thẳng vào main/develop).
⚠️ Tôi đã lỡ sửa code khi đang đứng ở `develop` một lần trong phiên này — nhớ
`git branch --show-current` TRƯỚC khi gõ lệnh sửa đầu tiên.

**Deploy — nhớ phân biệt:** sửa `web/` → chỉ Vercel; sửa `ai-service/` → **cả
Render**. Kiểm Render bằng `https://eduverse-ai.onrender.com/health`, `commit`
phải khớp `git log --oneline -1 main`. Vercel lên nhanh hơn Render nhiều, nên có
lúc giao diện đã mới mà backend chưa — bình thường, không phải hỏng.
⚠️ **Máy dev KHÔNG vào được `onrender.com`** (timeout 60/120/180s — nghi mạng
công ty chặn). Claude không tự xác nhận Render được → phải mở trên máy user.

⚠️ **`ADMIN_USERNAMES` phải có ở CẢ `web/.env.local` và Vercel** — chưa khai thì
`/teacher/admin` đá về `/teacher` (fail closed). Biến thêm SAU deploy không áp
cho bản đã build → phải redeploy.

**Sản phẩm hiện có** (nghiệp vụ ở FEATURES.md, lịch sử ở ROADMAP.md): auth
USERNAME; khóa→lớp→buổi + sao chép lớp; nhận xét AI theo buổi + tổng hợp từng HV
(12 nhóm kỹ năng, xếp loại học lực, đánh vắng, copy nhận xét, bộ combo); tin Zalo
cả lớp; **khu Chấm bài 3 TAB** — bài tập hàng ngày (có điểm, **chọn phần trắc
nghiệm/thực hành**) · sản phẩm cuối khóa (không điểm) · **Hỏi bài** (gợi ý cho HV
đang bí, không điểm); nhận file lẻ + thư mục + `.zip` + ảnh chụp, đọc Word
`.docx`; khu học viên chia THEO LỚP + link Drive nộp bài; gallery + hồ sơ HV
xuyên khóa; API key Gemini riêng có công tắc; trang vận hành `/teacher/admin`;
3 màn chiếu TV.

## ✅ Cổng kiểm tra & E2E

`web/`: **lint + typecheck + `pnpm test` (136 unit test) + build**.
`ai-service/`: **`.venv/Scripts/python -m pytest`** (50 test).

E2E chạy trong `web/` trên DB THẬT (tự tạo, tự dọn), chia **HAI LOẠI** từ Đợt 41:

**A. `pnpm test:e2e`** — gọi THẲNG thân Server Action (`web/e2e/*.e2e.ts`).
Đổi chữ ký hàm là `pnpm typecheck` đỏ, đổi hành vi là bộ này đỏ. Không mock
Supabase: session thật trong `CookieJar` nên RLS còn hiệu lực. **88 ca**; mọi ca
đã quan sát thấy xanh, nhưng hiếm khi xanh HẾT trong một lần chạy vì hạn mức
Gemini (xem cảnh báo dưới).

| Bộ | Test | Ghi chú |
|---|---|---|
| `admin-ops.e2e.ts` | 21 | trang vận hành: guard, 3 action service-role, dọn file |
| `signup-login.e2e.ts` | 22 | signup/login/logout + createCourse/createClass |
| `assignments-storage.e2e.ts` | 19 | createAssignment (có ca **rollback file**), deleteCourse |
| `grading.e2e.ts` | 26 | **cần ai-service**; chấm bài + hỏi bài + trắc nghiệm. Tiêu 6 lượt Gemini, các ca khác miễn phí |

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
🔴 **Hạn mức tính theo GOOGLE CLOUD PROJECT, KHÔNG theo key** (`quotaId:
GenerateRequestsPerDayPerProjectPerModel-FreeTier`) — tạo key mới trong CÙNG
project thì vẫn chung 20 lượt đã cạn, phải là key của project KHÁC. Và key ở
trang Hồ sơ (`user_secrets`) KHÔNG giúp gì cho E2E: bộ test tự tạo tài khoản mới
nên luôn rơi về `GEMINI_API_KEY` trong `ai-service/.env`.
Muốn chạy đủ 88 ca thì chạy `grading.e2e.ts` riêng, 3 bộ kia miễn phí hoàn toàn.

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

### 2026-07-31 — Đợt 41→46 (một phiên, TẤT CẢ đã production `76c7106`)
Chi tiết từng đợt ở ROADMAP.md, quyết định ở DECISIONS.md. **KHÔNG migration nào.**

**Hạ tầng test (41):** dựng bộ E2E **gọi thẳng thân Server Action**
(`pnpm test:e2e`, config riêng, không thêm dependency): stub `next/headers` bằng
`CookieJar` giữ session THẬT nên **RLS còn nguyên hiệu lực** — không mock
Supabase. Phủ `/teacher/admin` (21 ca; khu chạy service-role nên không có RLS
đỡ), chuyển 3 chỗ E2E đang chép lại logic action sang gọi thật. 7 script probe
RLS giữ nguyên vì chúng CỐ Ý gọi REST trần để giả lập kẻ tấn công.

**Tính năng (43, 46):** tab **"Hỏi bài"** — GV nạp đề (+ code/ảnh của em nếu có)
→ AI trả gợi ý ĐƠN GIẢN để Copy dán cho em; chỗ DUY NHẤT văn bản AI được HỌC
VIÊN đọc tận mắt nên có `STUDENT_HELP_RULE` riêng. **Chấm buổi có trắc nghiệm**
(buổi 5/9, lâu lâu 14): đáp án lấy từ chính đề bài, 2 ô tick "Chọn phần", **hai
điểm TÁCH BẠCH**, câu sai nêu thẳng đáp án đúng.

**Sửa lỗi (42, 45):** nav giáo viên đè nhau trên điện thoại; nút "Xóa hết" quá
chìm; nạp file sau khi đã chấm giữ lại bài em trước (trộn bài hai em); 🔴 **nộp
`.zip` LUÔN báo "không tìm thấy file nào"** — `.zip` nằm trong
`BINARY_EXTENSIONS` nên chính file nén bị lọc trước khi kịp mở; chọn .zip qua
hộp thoại chưa bao giờ chạy ở cả 3 tab.

**Chất lượng (44):** 3 tab chấm bài có 3 logic nhận file → gộp thành 1 hook + 2
component, **1635 → 830 dòng**. Giữ tham số hóa 4 khác biệt nghiệp vụ.

**Bài học của phiên — cùng một hình dạng, lặp 4 lần:**
- **Thông báo lỗi sai chỗ thì dẫn người ta đi sai hướng.** Hai lần user báo lỗi
  kèm chẩn đoán, cả hai lần chẩn đoán SAI nhưng rất hợp lý vì câu thông báo nói
  về sai tầng. Từ đó: sửa lỗi thì sửa luôn câu đã gây hiểu nhầm.
- **Đừng tin model giữ đúng thứ đã biết chắc từ ĐẦU VÀO.** Gemini 2 lần không
  tuân prompt (tự viết `dang_o_dau`, đếm sai `so_dung`) → ép ở server.
- **Đo trước khi tin.** `{ head: true }` NUỐT lỗi PostgREST (thử tên bảng bịa vẫn
  `error: null`); `download()` trả bản cũ sau khi xóa còn `list()` thì không;
  hạn mức Gemini tính theo PROJECT chứ không theo key.

### 2026-07-30 — Đợt 26→40 (production `b51e818`) — nén, chi tiết ở ROADMAP.md
7 migration, đều đã áp. Tab "Sản phẩm cuối khóa"; chấm bài đọc Word .docx; nạp
bài bằng thư mục và .zip; khu học viên chia THEO LỚP + link Drive nộp bài.

**🔴 Bảo mật (33→37) — 4 lỗ, CÙNG MỘT GỐC "ràng buộc đặt sai tầng":** stored XSS
ở link người dùng dán · vượt mọi giới hạn nhập liệu · **HV tự nâng role thành
teacher** (chuỗi dẫn tới đặt lại mật khẩu HV bất kỳ) · **HV tự ghi danh vào lớp
khác** rồi đọc sản phẩm + link Drive riêng. Cả 4 đều XANH mọi cổng kiểm tra lúc
còn tồn tại — tìm ra bằng **probe giả lập kẻ tấn công gọi REST trực tiếp**, bỏ
qua code app. Mỗi lỗ: probe kiểm chứng TRƯỚC khi sửa, đo dữ liệu thật TRƯỚC khi
thêm constraint.

**Bài học:** 3 lần test tôi viết đỏ mà CODE ĐÚNG (kỳ vọng sai); 1 lần test **pass
suông** vì nạn nhân chưa có dữ liệu gì để mất; phát hiện hạn mức Gemini thật là
**20 lượt/ngày** (4 chỗ trong code ghi 1.500 — đừng chép số của bên thứ 3).

> Phiên cũ hơn (Đợt 1→25, 2026-07-11 → 27): xem ROADMAP.md.
