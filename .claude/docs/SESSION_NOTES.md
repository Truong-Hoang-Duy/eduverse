# SESSION_NOTES.md — Sổ tay bàn giao giữa các phiên làm việc

> File này là "bộ nhớ chung". Claude đọc file này ĐẦU MỖI PHIÊN và cập nhật CUỐI
> MỖI PHIÊN (hoặc khi user gõ /handoff). Giữ tối đa ~150 dòng: phiên cũ hơn 2 tuần
> thì xóa hoặc chuyển vào docs/archive/.

---

## 🎯 Trạng thái hiện tại (cập nhật gần nhất: 2026-08-13, bởi: Claude)

**Đang làm:** KHÔNG có task dở. Đợt 55 (`feature/custom-skill-groups`) vừa
merge `develop` → `main` và đẩy production trong phiên này.

**`main` = `origin/main` = `4ed8f96`** trước khi merge Đợt 55 (xem
`git log --oneline -1 main` để lấy hash mới nhất — SESSION_NOTES luôn ghi
chậm hơn merge thật một nhịp, theo đúng nếp cũ của file này).
⚠️ **Có sửa `ai-service/` ở Đợt 49 (giữa Đợt 48→54)** → Render phải deploy
lại. Kiểm `/health` phải trả commit mới nhất của `main`. Đợt 55 CHỈ đổi
`web/` + migration DB, không đụng `ai-service/`.

**4 migration user đã xác nhận CHẠY XONG** (Claude không tự verify được —
không query DB trực tiếp):
`20260805000000_session_review_context_drop_advice.sql`,
`20260805010000_periodic_test_review_split.sql`,
`20260806000000_review_combos_single_type.sql` (cái này **XÓA SẠCH** dữ liệu
`review_combos` cũ của MỌI giáo viên — cố ý, user đã chốt),
`20260812155201_review_skill_groups.sql` (user xác nhận 2026-08-13 — tính
năng "GV tự thêm nhóm kỹ năng" giờ hoạt động được ở production).

⚠️ **CHƯA nghiệm thu bằng mắt trên production**: cả loạt tính năng Đợt 48→54
(đặc biệt "áp nhận xét từ buổi trước cho cả lớp" — gọi AI hàng loạt, dễ vỡ nếu
sai — và "xem buổi khác để tham khảo") **VÀ Đợt 55** (thêm/xóa nhóm kỹ năng).
Chỉ chạy qua lint/typecheck/test/build — môi trường này không có trình duyệt
để tự bấm thử. KHÔNG có E2E nào phủ các action mới: `applyReviewsFromSession`,
`listSessionContentReferences`, `updateReviewCombo`/`createReviewCombo` (có
`type`), và Đợt 55 là `addSkillGroup`/`deleteSkillGroup`/`resolveSkillGroup`.

🔴 **File quy tắc git MỚI: `.claude/docs/GIT-WORKFLOW-RULES.md`** (user thêm
giữa phiên, không nằm trong docs router của CLAUDE.md — chỉ được nạp vì user
gõ `@đường-dẫn` thẳng). **Đọc file này ĐẦU MỖI PHIÊN từ giờ**, nó SIẾT hơn
`.claude/rules/git-workflow.md` cũ:
- KHÔNG tự ý commit — phải đợi user xác nhận rõ ràng, MỖI LẦN (không phải one-time).
- KHÔNG tự ý push — xác nhận riêng, tách khỏi xác nhận commit.
- KHÔNG tự ý merge `develop` → `main`.
- Commit message tiếng Anh, `feat:`/`fix:`, **KHÔNG** `Co-Authored-By` hay bất
  kỳ attribution nào của Claude.
- Luôn `git branch --show-current` TRƯỚC KHI SỬA CODE — phiên này đã 3 LẦN lỡ
  code thẳng trên `main` (quên checkout sau khi merge xong việc trước) rồi mới
  tạo nhánh vá lại. Chưa mất gì nhưng rất dễ mất nếu main đã có commit lạ lúc đó.

**Bắt đầu phiên sau:** `git checkout develop && git pull --ff-only && git checkout -b feature/<slug>`
— và **kiểm tra lại branch trước MỖI lần sửa file**, không chỉ lần đầu.

⚠️ **`pnpm build` xung đột với `pnpm dev` đang chạy** (lỗi lạ "Cannot find
module for page") — port 3000 dùng chung `.next` cache. Luôn `netstat -ano |
grep ":3000 " | grep LISTENING` trước khi build; nếu có, nhờ user dừng dev
server (đừng tự kill tiến trình của user).

**Deploy:** sửa `web/` → chỉ Vercel; sửa `ai-service/` → **cả Render**
(`/health`, so `commit` với `git log --oneline -1 main`). Máy dev KHÔNG vào
được `onrender.com` — phải nhờ user tự mở.

**Sản phẩm hiện có** (nghiệp vụ ở FEATURES.md, lịch sử ở ROADMAP.md): auth
USERNAME; khóa→lớp→buổi + sao chép lớp + **xem nội dung buổi khác để tham
khảo** (buổi trước cùng lớp / cùng buổi số ở lớp khác cùng khóa) + **áp nhận
xét buổi trước cho cả lớp** (gộp tích chọn + gọi AI hàng loạt); nhận xét AI
theo buổi (bối cảnh buổi học cấp BUỔI, buổi kiểm tra định kỳ tách 2 phần nhận
xét, **GV tự thêm nhóm kỹ năng riêng** bên cạnh 12 nhóm nền) + tổng hợp từng
HV; **bộ combo nhận xét CHIA 2 LOẠI** (tích cực/cải thiện) có sửa được; tin
Zalo cả lớp; khu Chấm bài 3 tab; khu học viên theo lớp + Drive; gallery + hồ
sơ HV xuyên khóa; API key Gemini riêng; trang vận hành `/teacher/admin`; 3
màn chiếu TV; `pnpm dev` tự mở trình duyệt.

## ✅ Cổng kiểm tra & E2E

`web/`: **lint + typecheck + `pnpm test` (145 unit test) + build**.
`ai-service/`: **`.venv/Scripts/python -m pytest`** (62 test — Đợt 55 không đụng ai-service).

E2E chạy trong `web/` trên DB THẬT (tự tạo, tự dọn), chia **HAI LOẠI** (Đợt 41):

**A. `pnpm test:e2e`** — gọi THẲNG thân Server Action (`web/e2e/*.e2e.ts`).
Đổi chữ ký hàm là `pnpm typecheck` đỏ, đổi hành vi là bộ này đỏ. **98 ca, CHƯA
thêm ca nào cho các action mới Đợt 48→54 lẫn Đợt 55** (xem cảnh báo ở trên).

🔴 **Bộ này KHÔNG phủ lớp React bọc quanh action** — gọi thẳng thân hàm.
**E2E xanh ≠ UI chạy được**, vẫn phải bấm thử — đã dính lỗi này 1 lần (Đợt 47,
thiếu `startTransition`).

| Bộ | Test | Ghi chú |
|---|---|---|
| `admin-ops.e2e.ts` | 21 | trang vận hành: guard, 3 action service-role, dọn file |
| `signup-login.e2e.ts` | 22 | signup/login/logout + createCourse/createClass |
| `assignments-storage.e2e.ts` | 19 | createAssignment (có ca **rollback file**), deleteCourse |
| `grading.e2e.ts` | 26 | **cần ai-service**; chấm bài + hỏi bài + trắc nghiệm. Tiêu 6 lượt Gemini |
| `reviews.e2e.ts` | 10 | nhận xét theo buổi + đánh vắng; 1 ca cần ai-service. **CHƯA cập nhật cho `type` combo hay bulk-apply** |

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
mới cũng ghi vào đó. Phiên này thêm ~7 mục — trọng tâm: bối cảnh buổi học cấp
BUỔI thay lời khuyên per-student, buổi kiểm tra định kỳ GV tự đánh dấu (không
cứng số buổi), xóa option ngay trong MultiSelect, combo CHỈ MỘT LOẠI + xóa
sạch data cũ, thẻ nhận xét KHÔNG giấu combo trong accordion (đã thử rồi bỏ).

## ⚠️ Vấn đề đang mở / cần chú ý

### Nợ kỹ thuật đã biết, CHƯA làm
- 🟡 **E2E chưa phủ action mới Đợt 48→54 lẫn Đợt 55** — xem bảng trên. Ưu tiên
  nếu làm: `applyReviewsFromSession` (rủi ro cao nhất, ghi hàng loạt + gọi AI
  hàng loạt); Đợt 55 (`addSkillGroup`/`deleteSkillGroup`) rủi ro thấp hơn
  nhưng cũng chưa có ca nào, kể cả probe RLS xác nhận GV A không xóa/thấy
  nhóm của GV B.
- 🟡 Phần RENDER của component không có test — nghiệm thu bằng mắt (có ý thức).
- 🟡 `buildOpsReport` đếm dòng bằng `{ head: true }` — nuốt lỗi PostgREST (xem
  DECISIONS.md).
- 🟡 E2E action còn thiếu: tin Zalo, sản phẩm (`projects`), API key, mật khẩu —
  mới chỉ có probe RLS. Mẫu ở `web/e2e/_harness.ts`, nhớ khai tiền tố vào
  `test-user-prefixes.json`.

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

### 2026-08-13 — Đợt 55 (`feature/custom-skill-groups`) — GV tự thêm nhóm kỹ năng
**Đảo ngược quyết định cũ** "12 nhóm kỹ năng cố định" (DECISIONS.md) — lý do
chốt cũ (chi phí sửa CHECK constraint mỗi lần thêm nhóm, đã tốn công 2 lần:
Đợt 15/16) chính là nỗi đau tính năng này giải quyết. Bảng mới
`review_skill_groups` (teacher-owned, RLS như `review_combos`) cho nhóm GV tự
thêm; 12 nhóm nền vẫn cố định trong `skill-groups.ts`, không đụng dữ liệu
`review_options` cũ. `skill_group` giờ chấp nhận slug nền HOẶC id nhóm tự
thêm — gỡ CHECK constraint, sở hữu validate ở Server Action
(`resolveSkillGroup`) vì không diễn tả được union đó bằng CHECK/FK trên một
cột text. Cài đặt có khối "Nhóm kỹ năng tự thêm" (thêm/xóa); xóa nhóm chuyển
lựa chọn đang thuộc về "📌 Khác" thay vì chặn xóa hay mất dữ liệu (user chốt).

**Đồng thời gộp nốt nhánh `docs/handoff-2026-08-12`** — bàn giao phiên Đợt
48→54 đã viết xong và PUSH cuối phiên trước nhưng CHƯA merge vào
`develop`/`main` (bị bỏ sót); merge sạch, không xung đột.

**Bài học:** đầu phiên đọc `git branch --show-current` thấy đang đứng ở nhánh
docs lạ (không phải `main`/`develop`/`feature/*`) — dấu hiệu có bàn giao dở từ
phiên trước, nên gộp trước khi bắt đầu việc mới để không viết đè/làm mất lịch
sử đã ghi. Migration mới (`20260812155201`) vẫn cần user tự dán vào Supabase
SQL Editor — Claude không tự chạy được.

### 2026-08-12 — Đợt 48→54 (một phiên rất dài, production `4ed8f96`)
**Nhận xét học viên, đổi liên tục theo phản hồi trực tiếp trên UI:**
"Lời khuyên" per-student → **"Bối cảnh buổi học" cấp BUỔI** (gõ 1 lần/buổi,
migration xóa cột `advice`). **Buổi kiểm tra định kỳ** — GV tự tick (KHÔNG
cứng số buổi 5/9/14, vì buổi 14 có khi là thuyết trình) → AI tách nhận xét
thành 2 phần (học tập / kiểm tra), thêm ô "quá trình làm bài" (multi-select
KHÔNG lưu, chỉ feed prompt). **MultiSelect** giờ xóa được lựa chọn ngay tại
chỗ (dấu ✕, confirm dialog dựng NGOÀI DropdownMenu vì Radix tự đóng nội dung
khi thấy tương tác ngoài nó), dropdown tự nới rộng + chữ xuống dòng thay vì
cắt. Thẻ nhận xét thử ÍT NHẤT 3 layout theo phản hồi liên tiếp — chốt cuối:
combo/copy/xếp loại chung 1 dòng (xếp loại bỏ label dùng placeholder), điểm
mạnh/cải thiện/quá trình làm bài chung 1 dòng khác, **KHÔNG giấu gì trong
accordion** (đã thử "Tùy chọn thêm" rồi bỏ ngay vì combo là thao tác tần suất
cao). Ngày học tự điền hôm nay-1.

**Bộ combo nhận xét:** đổi qua lại dropdown ↔ hàng nút theo phản hồi (chốt:
MỘT dropdown, vì GV có hàng chục bộ thì hàng nút tràn 4-5 dòng); thêm SỬA
(update, loại cố định từ lúc tạo); **chia hẳn 2 loại** tích cực/cải thiện —
migration XÓA SẠCH data cũ (không tách tự động được bộ đã pha trộn, user chốt
vậy); gỡ nút "Thêm nhanh bộ mẫu" + `COMBO_TEMPLATES`; thẻ combo đóng mặc định
(tên + số lượng), bấm mới xổ ra — bộ nhiều nhãn từng đẩy cả trang dài ra.

**Tính năng mới:** **"Áp nhận xét từ buổi trước cho CẢ LỚP"** — 1 nút trong
form Nội dung buổi học, GỘP điểm mạnh/cải thiện/xếp loại (không đè), rồi gọi
Gemini viết nhận xét cho TỪNG em (song song, `allSettled`) — hết lượt thì em
đó để trống chứ KHÔNG rollback, tích chọn vẫn giữ. Phải thêm `reviewSignature`
vào `key` của `ReviewEditor` vì `useState(existing)` không tự cập nhật khi
props đổi do ghi hàng loạt. **"Xem nội dung buổi khác"** — popup buổi trước
của lớp + cùng buổi số ở lớp khác cùng khóa, chỉ đọc, RLS có sẵn đủ dùng.

**Ngoài chuyên môn:** `pnpm dev` tự mở trình duyệt khi sẵn sàng (script Node
thuần, không thêm dependency). User thêm `GIT-WORKFLOW-RULES.md` SIẾT quy
trình git giữa phiên — xem cảnh báo 🔴 ở đầu file.

**Bài học:**
- **Đọc kỹ câu hỏi trước khi code** — 1 lần hiểu sai "gom vào accordion" thành
  ngược ý user, phải làm lại; 1 lần user gửi ảnh chê UI mà không giải thích
  liền, phải tự suy luận nguyên nhân (đúng) rồi mới sửa.
- **`useState(props)` không tự đồng bộ** — bài học lặp lại từ nhiều bug khác
  trong dự án: mọi nơi đọc `existing`/`props` vào `useState` một lần đều có
  nguy cơ stale sau khi server ghi lại dữ liệu ở chỗ khác.
- **Luôn `git branch --show-current` trước khi sửa** — 3 lần quên trong 1
  phiên, dù đã tự nhắc ở phiên trước.

### 2026-08-03 — Đợt 47: đánh vắng tự lưu + gợi ý theo gạch đầu dòng (`38aebbd`)
Tick "Vắng" giờ LƯU LUÔN (thiếu `startTransition` từng làm lỗi đỏ mà E2E vẫn
xanh — bài học lặp lại ở Đợt 48→54). Gợi ý nội dung buổi học đổi sang gạch
đầu dòng.

> Phiên cũ hơn (Đợt 1→46): xem ROADMAP.md — đã có tóm tắt + bài học nén sẵn ở
> đó, không lặp lại ở đây nữa.
