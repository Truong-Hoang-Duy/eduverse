# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-07-30, bởi: Claude)

**Đang làm:** KHÔNG có task dở. Đợt 26→40 đã merge, deploy (Vercel + Render) và
user nghiệm thu bằng mắt. 7 migration của phiên đã áp — đã ĐO lại trên DB thật
chứ không tin ghi chú.

**`main` = `origin/main` = `b51e818`** — bản đang chạy production.
**`develop` = `origin/develop`** = main + 1-2 commit docs ghi hash (CỐ Ý không
merge sang `main`: merge đẻ hash mới làm ghi chú sai lại — vòng lặp đã dính
2026-07-21). Chỉ còn `main` + `develop`, mọi nhánh feature đã xóa.

**Bắt đầu phiên sau:** `git checkout develop && git checkout -b feature/<slug>`
**trước khi sửa dòng code nào** (đừng commit thẳng vào main/develop).

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

E2E chạy trong `web/` trên DB THẬT (tự tạo, tự dọn). **99/99 các bộ không gọi AI
đều xanh**; các bộ gọi AI đã xanh cùng ngày trên đúng code production (phase3
13/13, phase4 25/25, project-review 9/9). Tổng khi đủ lượt Gemini: **146**.

| Script | Test | Ghi chú |
|---|---|---|
| `e2e-phase1.mjs` | 13 | `node --env-file=.env.local scripts/<script>` |
| `e2e-phase2.mjs` | 17 | hồ sơ HV xuyên khóa + nhóm kỹ năng |
| `e2e-api-key.mjs` | 8 | |
| `e2e-class-admin.mjs` | 18 | đổi/đặt lại mật khẩu |
| `e2e-gallery-storage.mjs` | 19 | gallery GV, xóa sạch Storage |
| `e2e-drive-link.mjs` | 14 | RLS link Drive của HV |
| `e2e-profile-privileges.mjs` | 10 | chống leo thang quyền, quyền theo CỘT |
| `e2e-phase3.mjs` | 13 | **cần ai-service** — thêm `--env-file=../ai-service/.env` |
| `e2e-phase4.mjs` | 25 | như phase3 — xóa SP, RLS, giới hạn nhập liệu ở DB |
| `e2e-project-review.mjs` | 9 | như phase3 — nhận xét sản phẩm (không cần Supabase) |

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
- 🟡 **E2E chỉ mô phỏng logic server action, không gọi thẳng thân hàm** — đổi
  action mà quên đổi script thì test vẫn xanh; UI phải nghiệm thu bằng mắt.
- 🟡 **Trang vận hành chưa có E2E** — chỉ lint/typecheck/build + user bấm tay.
- 🟡 **Vitest phủ LOGIC THUẦN** (92 test: lọc file, ZIP, docx, drive-url, quyền
  admin, xếp loại, trạng thái nhận xét, tên file). Phần RENDER của component và
  thân Server Action (cần mock Supabase) vẫn không có test — nghiệm thu bằng E2E +
  bấm tay. Đây là lựa chọn có ý thức: bug render lộ ra ngay khi nhìn, còn logic
  thuần thì không.
- 🟡 `e2e-gallery-storage` flake 3 lần ở ca "file trong Storage cũng biến mất".
  Điều tra 2 lượt (Đợt 35 + 38): giả thuyết CDN cache SAI, và **15 lượt chạy liên
  tiếp đều xanh → không tái hiện được**. Đã làm nó CHẨN ĐOÁN ĐƯỢC (đọc error của
  `remove()` + đối chiếu `list` vs `download`). Lần đỏ tiếp theo: ĐỌC thông báo
  trước, đừng đoán lại — và đừng điều tra thêm khi chưa có lần đỏ mới.

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
