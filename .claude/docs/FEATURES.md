# FEATURES.md — Nghiệp vụ từng tính năng theo vai trò

> Nguồn sự thật về UX/nghiệp vụ. Đọc phần liên quan đến task, không đọc cả file.

## Quy ước giao diện (dùng lại, đừng viết mới)

- Font: **Be Vietnam Pro** (sans-serif, thiết kế riêng cho dấu tiếng Việt) +
  Geist Mono cho mã lớp/khóa. Biến font PHẢI đặt tên `--font-sans` để khớp
  `@theme` trong globals.css — đặt tên khác là font không áp mà không báo lỗi.
- Khung trang: `AppShell` (nav + main + footer) — đừng tự dựng lại layout.
- Tiêu đề trang: `PageHeader` (title + description + `action` cho nút bên phải).
- Số liệu: `StatCard`. Form tạo mới: bọc trong `Dialog`, nút mở đặt ở `action`
  của PageHeader.
- **Mọi hành động xóa PHẢI dùng `ConfirmDialog`** — không dùng `confirm()` của
  trình duyệt, không xóa thẳng. Description phải nói rõ mất gì / còn gì.
- Dark mode: script chống nháy trắng trong `app/layout.tsx`, nút ở `AppNav`.
  Dùng token theme (`bg-card`, `text-muted-foreground`...), tránh màu hard-code;
  màu cố định (green/yellow) phải có biến thể `dark:`.
- Con trỏ bàn tay đã set toàn cục trong `globals.css` — không cần thêm class.
- **Phản hồi khi chuyển trang (2 lớp, đừng bỏ lớp nào)**: `loading.tsx` ở mỗi khu
  (teacher/student/profile) hiện `PageSkeleton`, **và** `NavLinkLabel` bọc nhãn link
  để spinner hiện ngay trên link vừa bấm. Cần cả hai vì `loading.tsx` nằm BÊN TRONG
  layout nên không che được `await requireRole()` của chính layout — lúc vào khu vực
  từ ngoài hoặc F5 thì chỉ spinner (chạy ở client) mới kịp hiện.
  ⚠️ Thêm trang/khu mới → **nhớ thêm `loading.tsx`**: thiếu nó thì route dynamic
  không prefetch được gì (đo được: 215 bytes → 10.328 bytes khi có).
  ⚠️ `useLinkStatus` phải gọi trong component CON của `<Link>`; gọi cùng chỗ khai
  báo Link thì luôn trả `pending: false` mà **không báo lỗi gì**.
- **Responsive (bắt buộc — app dùng cả trên điện thoại)**: mọi `grid-cols-2/3/4`
  phải có breakpoint (`grid-cols-1 sm:grid-cols-2`), không để lưới nhiều cột ở
  màn hình nhỏ. Hàng nút/ô chọn có bề rộng tối thiểu phải nằm trong `flex-wrap`.
  Bảng dùng `ui/table.tsx` (đã tự cuộn ngang). Tránh `w-[Npx]` không có breakpoint.
  Nav ẩn chữ "Eduverse" dưới `sm` để không tràn.
- **Nút "lên đầu trang"** (`components/scroll-to-top.tsx`) đặt trong `AppShell`
  → có ở MỌI trang đã đăng nhập: nút nổi tròn góc dưới-phải (`fixed bottom-4
  right-4 sm:bottom-6 sm:right-6`), chỉ hiện khi `scrollY > 300`, bấm cuộn mượt
  về đầu (trang cuộn theo window).
- **Khối thu gọn dùng chung** `components/collapsible-card.tsx` (`<details>`,
  đóng mặc định trừ khi `defaultOpen`): dùng ở trang chi tiết lớp (chỉ "Buổi
  học" mở sẵn, còn lại đóng) và có thể tái dùng nơi khác. Nút hành động đặt
  TRONG nội dung, KHÔNG ở summary (bấm summary luôn toggle).
- **Nút "← Quay lại ..."** đồng bộ dạng `Button asChild variant="outline"
  size="sm"` + `cursor-pointer` (class lớp / buổi học / hồ sơ HV). PHẢI thêm
  `cursor-pointer` tường minh: quy tắc pointer toàn cục ở `globals.css` chỉ áp
  cho `button`/`[role=button]`, KHÔNG áp cho `<a>` mà `asChild` sinh ra.

## Vai trò & đăng nhập (KHÔNG dùng email)

- **Đăng nhập:** tên tài khoản (username) + mật khẩu.
- **Đăng ký học viên:** họ tên + tên tài khoản (3-20 ký tự, chữ thường/số/./_,
  duy nhất) + **combo box chọn lớp** (danh sách lớp GV đã mở, kèm tên khóa) +
  mật khẩu + nhập lại mật khẩu. KHÔNG thu thập email/tuổi/trường/sở thích.
- **Đăng ký giáo viên:** trang riêng `/signup/teacher`, cần mã mời
  (env `TEACHER_INVITE_CODE`) + username + nhập lại mật khẩu.
- **Thông tin cá nhân** (`/profile`, cả 2 vai trò): sửa họ tên; username read-only.
- **Đổi mật khẩu** (`/profile`, cả 2 vai trò): chỉ nhập mật khẩu mới ×2, KHÔNG
  hỏi mật khẩu cũ (phiên đăng nhập = bằng chứng sở hữu; `auth.updateUser`).
- **GV đặt lại mật khẩu cho HV quên** (nút 🔑 trong bảng học viên của lớp):
  auth username không có email khôi phục nên đây là đường cứu duy nhất — dialog
  sinh mật khẩu ngẫu nhiên 8 ký tự + Copy gửi cho em. Đi qua admin API
  (`resetStudentPassword` trong `lib/actions/password.ts`) nên action TỰ kiểm
  quyền: caller role teacher + thấy enrollment của em qua RLS; hệ thống không
  lưu mật khẩu để xem lại.
- **API key Gemini riêng** (`/profile`): tùy chọn, cho CẢ giáo viên và học viên.
  Chưa đặt → dùng key hệ thống (dùng chung, dễ hết lượt). Đặt rồi → mọi tính năng
  AI của người đó dùng key riêng (1.500 lượt/ngày/key). Hiển thị dạng che
  (`AIzaSyD•••••••••••v4k2`), có hướng dẫn lấy key ngay cạnh ô nhập. Lưu ở bảng
  `user_secrets` — xem DATABASE.md để biết vì sao KHÔNG để trong `profiles`.
- **Công tắc bật/tắt key riêng** (checkbox khi đã đặt key, yêu cầu user
  2026-07-27): BẬT → dùng key riêng; TẮT → tạm dùng key hệ thống nhưng KHÔNG
  xóa key (bật lại bất cứ lúc nào). Khác với "Xóa key" (xóa hẳn dòng). Cột
  `user_secrets.use_own_key`; `getMyApiKey()` trả null khi tắt → ai-service
  dùng key hệ thống. Dán key mới thì tự bật. Bật khi chưa có key bị chặn.

## Giáo viên

### Khóa học & lớp
- CRUD khóa học: mã tiền tố (JSB, JSA, JSI, CSB, CSI...), tên, mô tả. **Sửa được**
  mã + tên + mô tả (nút ✏️ cạnh tên khóa ở danh sách lớp). Đổi mã khóa KHÔNG đổi
  mã các lớp đã mở.
- CRUD lớp thuộc khóa: mã lớp GV tự đặt, form gợi ý số kế tiếp (JSB01 → JSB02);
  số buổi (`total_sessions` — quyết định số session sinh ra), mô tả. **Sửa được**
  mã lớp + mô tả + **chuyển lớp sang khóa học khác** ("✏️ Sửa lớp" ở trang chi
  tiết). Đổi mã / chuyển khóa KHÔNG ảnh hưởng học viên đang học và buổi học;
  chuyển khóa thì lớp chấm bài theo đề của khóa mới. `total_sessions` KHÔNG sửa
  được (sessions sinh 1 lần bằng trigger lúc tạo lớp).
- **Sao chép lớp** (nút "⧉ Sao chép lớp" ở trang chi tiết, `duplicateClass`):
  tạo lớp MỚI. **Số buổi + giáo án từng buổi** (tiêu đề + nội dung) lấy từ MỘT
  LỚP KHÁC do GV chọn trong dialog — **KHÔNG lấy từ lớp đang mở** (user chốt
  2026-07-27: dropdown chỉ liệt kê các lớp khác, kèm số buổi; `total_sessions`
  lớp mới = lớp nguồn giáo án). **Thành viên** thì lấy từ lớp đang mở (tick chọn,
  mặc định hết). Khóa học đổi được, mã lớp mới phải khác. KHÔNG chép `session_date`
  (lịch riêng), TUYỆT ĐỐI KHÔNG chép nhận xét (`student_reviews` gắn buổi CŨ) và
  sản phẩm — lớp mới trống. Kỹ thuật: insert lớp → trigger sinh N buổi trống →
  `upsert` đè giáo án theo `unique(class_id, session_number)` → insert enrollments
  → redirect sang lớp mới. Chưa có lớp khác thì dialog báo và chặn.
- Danh sách học viên trong lớp; **chuyển học viên sang lớp khác** (kể cả khác khóa).
- **Thêm học viên vào lớp**: nút "+ Thêm học viên" → tìm theo **họ tên hoặc tên
  tài khoản** → bấm Thêm. Dùng RPC `search_students` (SECURITY DEFINER) vì
  `profiles_select` chỉ cho GV thấy HV đã ở trong lớp mình — xem DATABASE.md.
- Xóa lớp → confirm (mất enrollment, session, review).

### Buổi học & nhận xét
- Mỗi lớp có N buổi sinh sẵn; GV điền tiêu đề + nội dung + ngày cho từng buổi.
- Trang nhận xét theo buổi cho từng học viên: tick **điểm mạnh** / **điểm cần cải
  thiện** từ danh mục `review_options` (GV tự quản lý danh mục này) + ô lời khuyên.
- **Bộ lọc nhóm kỹ năng** trên mỗi combo box (điểm mạnh / cần cải thiện): 12
  nhóm — 🧠 Tư duy, ✨ Sáng tạo, 💻 Kỹ năng code, 🖥️ Kỹ năng sử dụng máy tính,
  🤖 Vận dụng AI, ❓ Đặt câu hỏi, 🌱 Thái độ học tập, ⏰ Kỷ luật/Nề nếp, 📚 Tự
  học/Nghiên cứu thêm, 🤝 Giao tiếp & hợp tác, 🎤 Thuyết trình, 📌 Khác —
  **mặc định "Tất cả nhóm"** (không lọc). Chỉ thu hẹp danh sách hiển thị, KHÔNG
  đổi giá trị đã chọn trước đó. Nhóm lưu ở cột `review_options.skill_group`
  (`web/src/lib/skill-groups.ts` là nguồn danh sách nhóm dùng chung — SKILL_GROUPS
  export từ đây, mọi UI khác import lại, không tự khai danh sách nhóm riêng).
- **Gõ câu mới NGAY TRONG ô tick** (user 2026-07-27 — bỏ ô nhập riêng bên dưới
  vì khó nhìn): `MultiSelect` có prop `onCreate` — gõ vào ô tìm kiếm, không khớp
  mục nào thì hiện dòng "➕ Thêm ..." (hoặc Enter). Câu mới vừa vào nhận xét vừa
  lưu `review_options` (skill_group theo bộ lọc đang chọn). Vùng badge đã chọn
  bị GIỚI HẠN chiều cao + cuộn (`max-h-24 overflow-y-auto`, chip wrap chữ) nên
  nhiều/dài mấy cũng KHÔNG đẩy vỡ bố cục (trước đây badge tràn làm bể layout).
- **Bộ mặc định** (nút "⚡ Thêm nhanh bộ lựa chọn mặc định" ở trang Cài đặt khi
  GV chưa có lựa chọn nào): 112 điểm mạnh + 112 cần cải thiện — **mỗi nhóm ít
  nhất 10 lựa chọn** (yêu cầu user 2026-07-18, presentation có 12), bỏ "Khác"
  vì là catch-all.
- **Trang Cài đặt hiển thị dạng accordion theo nhóm** (2026-07-18): mỗi nhóm kỹ
  năng là 1 khối thu gọn/mở rộng (`<details>`, cùng pattern với `ReviewEditor`),
  mặc định đóng, hiện số lượng lựa chọn trong nhóm ngay trên tiêu đề. Form
  "Thêm lựa chọn mới" nằm TRONG từng accordion — không cần chọn lại nhóm vì
  ngữ cảnh đã rõ (khác Đợt 13: trước đó 1 form chung ở đầu cột, phải chọn nhóm
  qua dropdown mỗi lần thêm).
- **Cả 3 khối lớn của trang Cài đặt** (Danh mục nhận xét / Bộ combo / Mẫu Zalo)
  là `<details>` **ĐÓNG mặc định** (user 2026-07-27, cho gọn) — bấm tiêu đề mới
  mở. `SettingsSection` trong `settings/page.tsx`; nội dung vẫn trong DOM khi
  đóng nên state/action của manager con không mất.
- Nút **"AI tạo nhận xét"** → điền sẵn đoạn nhận xét → GV sửa → lưu. Cạnh đó có
  nút **📋 Copy** để copy nhanh đoạn nhận xét đang hiện (gửi riêng phụ huynh em
  đó qua Zalo/tin nhắn cá nhân — khác với tin Zalo TỔNG HỢP cả lớp bên dưới).
- **Xếp loại học lực** (tùy chọn, mỗi em/mỗi buổi): Giỏi / Khá / Trung bình /
  Cần cố gắng (nguồn `web/src/lib/academic-levels.ts` — sửa/thêm mức phải sửa CẢ
  CHECK constraint `academic_level`, drop+add). Mức này CHỈ làm ngữ cảnh cho AI
  viết nhận xét vừa trình độ — prompt cấm nêu thẳng xếp loại cho phụ huynh (user
  chốt 2026-07-27). Chưa chọn = null, không ảnh hưởng gì.
- **Copy điểm mạnh / cần cải thiện** (combo "📋 Copy ... từ", 2 nhóm — user
  chốt 2026-07-27): "👥 Bạn cùng buổi" (các bạn CÙNG buổi đã LƯU lựa chọn) +
  "📅 Buổi trước của em" (chính em đó, tối đa 5 buổi gần nhất đã tích). Chọn →
  GỘP (union, bỏ trùng không phân biệt hoa/thường) vào em đang xem, KHÔNG ghi
  đè. Nguồn là dữ liệu ĐÃ LƯU (không phải state live). Buổi trước lấy từ cùng
  query `priorReviews` ở `page.tsx` (đã bỏ lọc `ai_generated_comment is null` để
  còn thấy buổi chỉ có tích mà chưa lưu câu nhận xét).
- **Bộ combo nhận xét** ("nhận xét nhanh", user chốt 2026-07-27 — bảng
  `review_combos`): TÁCH RÕ 2 nơi.
  - **Tạo/quản lý ở trang Cài đặt** (`combo-manager.tsx`, khối "Bộ combo nhận
    xét"): đặt tên bộ (VD "Học tốt, chưa phát biểu") + chọn nhiều điểm mạnh/cần
    cải thiện từ danh mục qua `MultiSelect`, lưu; xem danh sách + xóa
    (ConfirmDialog). GV soạn sẵn vài bộ mẫu theo tiêu chuẩn hợp lý.
  - **Nút "⚡ Thêm nhanh bộ mẫu"** (`seedDefaultCombos`): dựng ~22 bộ theo "chân
    dung học viên", gồm cả các chân dung PHA TRỘN (yếu/trung bình mặt này nhưng
    mạnh mặt khác — VD "Thao tác tốt, kiến thức còn yếu", "Nhanh nhưng ẩu",
    "Biết dùng AI, lệ thuộc công cụ"...). Rút nhãn từ CHÍNH danh mục của GV theo
    nhóm kỹ năng (trải hết 10 nhóm, BỎ `presentation` vì tùy buổi + `other`).
    Bỏ qua bộ trùng tên (bấm nhiều lần không nhân đôi) và bộ rỗng. Template ở
    `review-combos.ts`.
  - **Áp ở mỗi học viên** (`ComboBar` trong `sessions/[id]`): CHỈ 1 combo "⚡ Áp
    dụng bộ combo..." → gộp union cả bộ vào lựa chọn hiện tại. KHÔNG còn nút
    "Lưu bộ"/"Quản lý bộ" tại chỗ (đã bỏ 2026-07-27 — dồn về Cài đặt).
  - Combos dùng CHUNG mọi lớp/buổi của GV, tải server-side (`listMyCombos`).
    `createReviewCombo`/`deleteReviewCombo` revalidate cả `/teacher/settings`
    lẫn route buổi học động.
- **Đánh vắng** (checkbox 🚫 đầu form, mặc định CÓ đi học): bật lên thì ẩn toàn
  bộ phần nhận xét, bấm Lưu để đánh dấu. Em vắng bị **loại khỏi tin Zalo tổng
  hợp** (`zalo.ts` lọc `is_absent`) và **tính là đã xử lý** trong bộ đếm "X/Y" +
  bộ lọc "Đã hoàn thành" (`isHandled` = `isReviewed` HOẶC `is_absent`). Lưu vắng
  sẽ xóa sạch điểm mạnh/cải thiện/lời khuyên/xếp loại của em ở buổi đó.
- **Bộ lọc trạng thái** trên danh sách nhận xét từng buổi: Tất cả / Đã hoàn
  thành / Chưa hoàn thành (`review-list.tsx`, client component vì cần state lọc
  — `page.tsx` vẫn là Server Component, chỉ truyền data xuống). "Đã hoàn thành"
  = có ít nhất 1 trong 3: điểm mạnh, cần cải thiện, hoặc nhận xét AI đã lưu
  (hàm `isReviewed`, export từ `review-editor.tsx`, dùng chung với badge "Đã
  nhận xét" để không lặp logic).
- ⚠️ **Giọng điệu AI**: mọi prompt viết nhận xét (buổi học, tổng hợp HV, tin
  Zalo) áp `TONE_RULE` trong `prompts.py` — cấm từ đại ngôn ("tuyệt vời", "xuất
  sắc", "hoàn hảo"...), dùng thang vừa phải ("tốt", "khá", "chưa tốt"...).

### Hồ sơ học viên xuyên khóa (CHỈ giáo viên)
Trang `/teacher/classes/[id]/students/[studentId]` — vào bằng cách bấm tên học viên
trong bảng danh sách lớp.

- **Timeline nhận xét từng buổi**: điểm mạnh (badge xanh) / điểm cần cải thiện
  (badge vàng) / lời khuyên / nhận xét đã lưu, sắp theo số buổi; mỗi mục link tới
  trang buổi để sửa. Đây là nhận xét GỐC (khác với bản AI tóm tắt).
- **Thẻ số liệu**: đã nhận xét X/N buổi, tổng lượt điểm mạnh, tổng lượt cần cải thiện.
- **AI tổng hợp toàn khóa**: tái dùng `StudentSummaryPanel` (khóa cứng vào 1 HV,
  không hiện dropdown) — Copy để gửi phụ huynh. **KHÔNG dùng icon**, 5 mục
  (Trong quá trình học / Điểm mạnh / Điểm cần cải thiện / Định hướng sắp tới /
  Khó khăn cần hỗ trợ) format tiêu đề đậm + phân cách `divide-y` cho dễ đọc
  (user 2026-07-27). Đây là NƠI DUY NHẤT dùng tính năng tổng hợp — đã BỎ khối
  "Nhận xét tổng hợp từng học viên" (có dropdown) khỏi trang chi tiết lớp vì
  trùng chức năng.
- ⚠️ **Học viên KHÔNG xem được trang này** — nhận xét vẫn chỉ để GV gửi phụ huynh
  (giữ nguyên ranh giới ở mục "Học viên"). RLS `student_reviews_teacher_all` chỉ
  cho GV của lớp đọc; 0 migration, chỉ thêm UI.

### Tin nhắn Zalo (copy thủ công — KHÔNG dùng Zalo API)
- CRUD mẫu tin (`zalo_templates`) với placeholder `{ten_lop}` `{buoi}` `{tom_tat}` `{loi_nhan}`.
- Chọn lớp + buổi → AI tổng hợp từ các nhận xét đã lưu → preview → nút **Copy**.
- **`{tom_tat}` CHỈ chứa danh sách kiến thức** (chốt lại lần 3 cùng ngày
  2026-07-18): liệt kê từng kiến thức XUỐNG DÒNG RIÊNG, KHÔNG gạch đầu dòng/số
  thứ tự, KHÔNG tự thêm tiêu đề (GV tự viết tiêu đề trong `template_text`),
  và **KHÔNG kèm câu nhận xét/đánh giá nào** — thử để cả 2 phần (kiến thức +
  đánh giá) chung `{tom_tat}` từng bị GV báo lặp với mục "Đánh giá chung quá
  trình học tập" mà họ đã có sẵn, gắn với placeholder khác (`{loi_nhan}` trong
  mẫu của họ, nhưng KHÔNG hardcode tên biến này trong prompt — Gemini tự đọc
  ngữ cảnh câu chữ đứng trước mỗi placeholder trong `template_text` để biết đặt
  đoạn nhận xét chung vào đúng chỗ). Đoạn nhận xét chung vẫn là văn xuôi liền
  mạch, không xuống dòng, không bullet — chỉ đổi CHỖ ĐẶT, không đổi CÁCH VIẾT.

### Chấm bài bằng AI — công cụ ĐỘC LẬP, KHÔNG theo lớp
Nav "Chấm bài" chia **2 tab** (`grading-tabs.tsx`, URL riêng nên chia sẻ được):

| Tab | URL | Có đề bài? | Có điểm? |
|---|---|---|---|
| Bài tập hàng ngày | `/teacher/assignments` | Có (bắt buộc) | Có (/100) |
| Sản phẩm cuối khóa | `/teacher/assignments/project` | **Không** | **Không** |

Cả hai đều không dính lớp/học viên/danh sách HV và **không lưu gì** ngoài đề bài.

#### Tab "Bài tập hàng ngày"

- **Đề bài (thứ DUY NHẤT được lưu)**: thuộc khóa + số buổi, mỗi buổi 1 đề
  (unique), file đề PDF/ảnh/text/md lưu ở bucket `assignment-specs`, kèm hướng
  dẫn chấm tùy chọn. Dùng chung mọi lớp cùng khóa.
- **Xem đề** (nút 👁 ở thẻ đề, và link "Xem đề" cạnh ô chọn khi chấm): mở popup
  hiện nội dung — file chữ (.txt/.md/code) đọc thẳng, ảnh/PDF xem qua link ký
  10 phút (bucket private). File bị DLP mã hóa thì báo rõ và bảo tạo lại bằng
  .txt/.md thay vì hiện bytes rác.
- **Upload file đề xảy ra lúc bấm "Tạo đề bài"**, không phải lúc chọn file —
  chọn xong rồi đổi file/đóng popup/tạo hụt đều KHÔNG để lại file rác trong bucket.
- **Chấm**: chọn khóa → chọn đề → nạp file bài làm của **một học sinh mỗi lượt**
  → bấm Chấm. KHÔNG nhập tên học sinh. Nạp file 4 cách, cộng dồn qua nhiều lượt:
  bấm vào ô, kéo thả file, **kéo thả cả thư mục**, hoặc **file .zip** (giải nén ở
  server). Đường dẫn tương đối được gửi làm tên file để AI thấy bố cục.
- **Tab này GIỮ ảnh và PDF/Word** khi đọc thư mục/zip (ảnh chụp code có thể CHÍNH
  LÀ bài làm) — khác tab sản phẩm cuối khóa. Ngân sách `GRADING_BUDGET`: ≤30 file,
  ≤5MB/file, tổng ≤6MB.
- **Kết quả**: **ô điểm riêng** (/100, tô màu: đỏ <50, vàng 50–79, xanh ≥80) +
  nhận xét **ngắn gọn dạng gạch đầu dòng** (3-6 ý) + nút **Copy**.
- **KHÔNG lưu gì**: file bài làm gửi inline (base64) sang ai-service, không qua
  Storage; kết quả không ghi DB → tải lại trang là mất. Chấm xong copy rồi làm
  em tiếp theo.

#### Tab "Sản phẩm cuối khóa" (`/review-project`)
Sản phẩm cuối khóa là cả một project nhiều file, không có đề để đối chiếu.

- **KHÔNG có đề bài, KHÔNG có điểm số** (chốt 2026-07-30) — chỉ 3 nhóm nhận xét:
  **Điểm mạnh / Cần cải thiện / Gợi ý nâng cấp**, mỗi nhóm vài gạch đầu dòng.
  `PROJECT_REVIEW_SCHEMA` cố ý không có `score`; prompt cấm nêu thang điểm.
- **Đầu vào 3 đường**, đều ra cùng một danh sách file dạng chữ:
  1. **Kéo thả cả thư mục** — `webkitGetAsEntry()` đọc đệ quy (`read-dropped-files.ts`).
  2. **Nút "Chọn thư mục"** — `<input webkitdirectory>`, giữ `webkitRelativePath`.
  3. **File .zip** — giải nén ở SERVER (`extractZipFiles` dùng `lib/zip.ts`), GV
     không cần tự giải nén.
- **Tự lọc rác** (`submission-files.ts` — nguồn DUY NHẤT cho cả 3 đường):
  `node_modules`/`.git`/`dist`/`__pycache__`/`.venv`..., lock file, `*.min.js`,
  file ẩn (trừ `.htaccess`), **ảnh** và nhị phân. Lọc theo TÊN trước khi đọc/giải
  nén nên `node_modules` không bao giờ vào RAM.
- **Ảnh bị bỏ ở tab này nhưng GIỮ ở tab bài tập** — trong project ảnh là asset
  (logo, background), còn bài tập lẻ thì ảnh có thể CHÍNH LÀ bài làm (ảnh chụp
  code). Khác nhau là chủ ý.
- **Ngân sách** `PROJECT_BUDGET`: ≤30 file, ≤200KB/file, tổng ≤2MB (dưới xa trần
  `bodySizeLimit: "10mb"`). Vượt thì **cảnh báo + cho bỏ tick**, không chặn cứng;
  server vẫn guard thật vì vượt trần Next.js báo lỗi rất mờ mịt.
- **GV xem và bỏ tick từng file** trước khi gửi (danh sách kèm dung lượng + dòng
  "đã bỏ qua N file..." để biết hệ thống bỏ đúng thứ đáng bỏ).
- **Khóa học + ghi chú đều TÙY CHỌN**: khóa cho AI biết trình độ để nhận xét vừa
  sức; ghi chú thay chỗ của đề bài.
- ai-service tự **xếp file vào (`index.html`, `main.py`...) lên đầu** và đưa cây
  thư mục vào prompt để AI hiểu bố cục, nhận xét TỔNG THỂ chứ không chấm rời
  từng file.
- **KHÔNG lưu gì** — giống tab bài tập.

### Sản phẩm cuối khóa (góc nhìn GV)
Trang `/teacher/gallery` (nav "Sản phẩm") — dùng CHUNG component với gallery của
học viên (`components/gallery/`), khác ở 2 chỗ: nhóm theo lớp và xưng "em".

- Sản phẩm nhóm theo từng lớp GV dạy; bấm vào từng em → popup chi tiết (tên, mô
  tả, chức năng, link code/demo/drive, ghi chú) + khu nhận xét.
- **GV nhận xét như học viên** (cùng bảng `project_comments`); nhưng **chỉ CHỦ
  nhận xét mới xóa được nhận xét của mình** — không ai xóa của ai (policy
  `project_comments_delete_own`, migration `20260721000000`; quyền moderation
  cũ của GV đã bỏ theo yêu cầu 2026-07-18).

### Random nhóm thuyết trình + màn hình chiếu TV (trang chi tiết lớp)
GV cắm laptop vào TV của lớp; cả 3 màn chiếu dùng chung `components/tv-overlay.tsx`
(overlay toàn màn hình + xin fullscreen trình duyệt + Esc thoát):
- **Random nhóm**: nhập số nhóm HOẶC số người/nhóm → shuffle có animation, thẻ
  nhóm màu riêng + linh vật emoji. **KHÔNG lưu kết quả** (bảng
  `presentation_groups` đã DROP ở `20260722000000` — mỗi buổi random mới, user
  chốt 2026-07-18). Nút "📺 Chiếu màn hình" phóng to chữ để nhìn từ cuối lớp;
  random lại được ngay trên màn chiếu.
- **☕ Nghỉ giữa giờ** (nút ở header trang lớp): chọn 5/10/15 phút HOẶC nhập số
  phút tùy ý (1–180) → đồng hồ đếm ngược khổng lồ, còn ≤1 phút chuyển đỏ, hết
  giờ hiện "vào học thôi!"; có tạm dừng / +1 phút / chọn lại.
- **🎤 Thuyết trình sản phẩm** (nút ở thẻ Sản phẩm cuối khóa) — 2 chế độ:
  - **Từng em**: slideshow mỗi em một slide (tên, dự án, mô tả, chức năng, link
    to bấm được), chuyển bằng nút hoặc phím ← →, thứ tự theo tên, đếm "3/12".
  - **🎉 Tổng kết cả lớp** (chiếu khi nói chuyện với PHỤ HUYNH sau khi các em
    thuyết trình xong): lời cảm ơn + lưới thẻ màu toàn bộ sản phẩm (avatar, tên
    em, tên dự án, 3 chức năng đầu); bấm thẻ nhảy về slide của em đó. Vào bằng
    nút "🖼️ Cả lớp" hoặc "Tiếp →" ở slide cuối.

### Vận hành hệ thống (`/teacher/admin`) — CHỈ username trong ADMIN_USERNAMES
Nav "Vận hành" chỉ hiện với username khai trong biến môi trường `ADMIN_USERNAMES`
(ngăn cách bằng dấu phẩy). **Chưa khai biến = không ai vào được** (fail closed —
quên cấu hình phải mất quyền, không phải mở cho mọi GV).

- **KHÔNG có vai trò `admin` trong DB** và cố tình giữ như vậy: `profiles.role`
  có CHECK `('teacher','student')`, thêm giá trị phải drop+add constraint rồi rà
  lại RLS của MỌI bảng (policy đều viết theo `teacher_id = auth.uid()`, không có
  nhánh "admin thấy tất cả"). Dự án 1 người nên chặn bằng env là đủ.
- ⚠️ Trang chạy bằng **service-role, bỏ qua RLS** → mọi Server Action trong
  `lib/actions/admin.ts` phải gọi `denyIfNotAdmin()` ngay dòng đầu. Không có
  policy nào đỡ nếu quên.
- **Toàn vẹn dữ liệu**: hồ sơ mồ côi (còn `profiles`, mất auth user) và ngược
  lại, ghi danh trỏ tới HV không tồn tại, khóa/lớp mất GV chủ (RLS lọc theo
  `teacher_id` nên chúng vô hình trong app mà vẫn nằm trong DB), tài khoản chưa
  xác nhận email, **file đề mồ côi trong Storage**.
- **Công cụ dọn dẹp**: xóa tài khoản test E2E (khớp tiền tố cố định — xem
  `TEST_USER_PREFIXES`, chép ở cả `lib/admin-report.ts` lẫn
  `scripts/purge-test-users.mjs` vì script Node không import được .ts, sửa một
  bên nhớ sửa bên kia); xóa file Storage không còn đề nào trỏ tới.
  ⚠️ Danh sách file mồ côi được **tính lại trong action**, không nhận từ form —
  tin path client gửi lên là ép xóa được cả file đang dùng.
  ⚠️ File mới hơn **1 giờ được bỏ qua**: `createAssignment` upload TRƯỚC rồi mới
  insert dòng (có rollback), nên luôn có khoảnh khắc file chưa được trỏ tới.
- **Xác nhận email hộ**: email ảo `@eduverse.local` không nhận được thư xác nhận
  nào, nên tài khoản kẹt ở trạng thái chưa confirm là đăng nhập không nổi.
- Dùng `OpsActionButton` (popup xác nhận **có hiện kết quả**) thay `ConfirmDialog`
  dùng chung: thao tác ở đây chạy hàng loạt và có thể xong một phần ("đã xóa 3/5,
  2 cái vướng khóa ngoại"), đóng popup im lặng là giấu mất thông tin cần nhất.

## Học viên

Điều hướng: nav trên cùng có **"Lớp học"** (`exact: true` để không sáng khi đang
ở tab con); 3 khu còn lại đi bằng **tab** (`components/student-tabs.tsx`, render ở
layout nên hiện ở mọi trang — ở `/student` không tab nào sáng).

- **Lớp học** (nav, `/student`): CHỈ thẻ thông tin lớp — mã lớp, khóa, tổng số
  buổi, ngày tham gia. **KHÔNG liệt kê từng buổi** và **KHÔNG hiện nhận xét cá
  nhân** (không query `sessions` lẫn `student_reviews`; nhận xét chỉ để GV gửi
  phụ huynh).
- **Sản phẩm:** CRUD sản phẩm của chính mình (1 sản phẩm/lớp — mỗi lớp một form
  riêng, không có dropdown chọn lớp) — tên, mô tả, chức năng, link GitHub/Drive/demo,
  ghi chú. Có **nút Xóa** (ConfirmDialog).
  - **Chức năng nhập dạng chip**: gõ + Enter (hoặc nút Thêm) để thêm từng cái, bấm
    ✕ để bỏ; tự bỏ trùng. (Trước là textarea "mỗi dòng một" dễ lỗi.)
  - **Link** GitHub/Drive/demo validate ở server (chỉ nhận http/https).
  - KHÔNG có trạng thái nộp: cột `status` draft/submitted (thêm Đợt 7) đã GỠ ở
    migration `20260721010000` theo yêu cầu 2026-07-18 — sản phẩm chỉ có
    "Cập nhật lúc", không badge Đang làm/Đã nộp.
  - Form controlled hoàn toàn: lưu xong phản ánh đúng ngay, tự chuyển TẠO→SỬA
    (hiện nút Xóa) mà không cần tải lại trang.
  - Nút **AI gợi ý tính năng** → 3–5 gợi ý kèm độ khó; **chọn được độ khó mong
    muốn** (Tùy AI / Dễ / Vừa / Khó); bấm 1 gợi ý hoặc **"Thêm tất cả"**. Tên vào
    chip, còn **mô tả cách làm được nối vào ô Ghi chú** để không mất (cột `features`
    là `text[]` chỉ lưu tên).
- **Sản phẩm của lớp:** lưới **ô từng người** (avatar, tên, tên dự án, số chức
  năng, số bình luận) → bấm mở **popup chi tiết** + nhận xét ngay trong popup.
  Chỉ trong lớp mình (RLS + lọc lại ở UI).
  ⚠️ Ô = bạn **đã khai báo sản phẩm**, không phải cả lớp — RLS chỉ cho HV thấy
  dòng enrollment của chính mình nên không liệt kê được bạn cùng lớp.
- **Hướng dẫn:** 4 mục — GitHub / Drive / deploy / **lấy API key Gemini miễn phí**.
  Sửa link video ở biến `VIDEOS` đầu `guide/page.tsx` — nhận cả link đầy đủ lẫn
  ID thuần; để `""` thì hiện ô chờ.

## Ràng buộc phân quyền (nhắc lại)

Học viên KHÔNG: vào route giáo viên, thấy điểm/bài nộp của bạn khác, sửa project
người khác. Tất cả chặn bằng RLS + redirect ở layout.
