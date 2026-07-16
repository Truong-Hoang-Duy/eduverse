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
- **Responsive (bắt buộc — app dùng cả trên điện thoại)**: mọi `grid-cols-2/3/4`
  phải có breakpoint (`grid-cols-1 sm:grid-cols-2`), không để lưới nhiều cột ở
  màn hình nhỏ. Hàng nút/ô chọn có bề rộng tối thiểu phải nằm trong `flex-wrap`.
  Bảng dùng `ui/table.tsx` (đã tự cuộn ngang). Tránh `w-[Npx]` không có breakpoint.
  Nav ẩn chữ "Eduverse" dưới `sm` để không tràn.

## Vai trò & đăng nhập (KHÔNG dùng email)

- **Đăng nhập:** tên tài khoản (username) + mật khẩu.
- **Đăng ký học viên:** họ tên + tên tài khoản (3-20 ký tự, chữ thường/số/./_,
  duy nhất) + **combo box chọn lớp** (danh sách lớp GV đã mở, kèm tên khóa) +
  mật khẩu + nhập lại mật khẩu. KHÔNG thu thập email/tuổi/trường/sở thích.
- **Đăng ký giáo viên:** trang riêng `/signup/teacher`, cần mã mời
  (env `TEACHER_INVITE_CODE`) + username + nhập lại mật khẩu.
- **Thông tin cá nhân** (`/profile`, cả 2 vai trò): sửa họ tên; username read-only.
- **API key Gemini riêng** (`/profile`): tùy chọn, cho CẢ giáo viên và học viên.
  Chưa đặt → dùng key hệ thống (dùng chung, dễ hết lượt). Đặt rồi → mọi tính năng
  AI của người đó dùng key riêng (1.500 lượt/ngày/key). Hiển thị dạng che
  (`AIzaSyD•••••••••••v4k2`), có hướng dẫn lấy key ngay cạnh ô nhập. Lưu ở bảng
  `user_secrets` — xem DATABASE.md để biết vì sao KHÔNG để trong `profiles`.

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
- Danh sách học viên trong lớp; **chuyển học viên sang lớp khác** (kể cả khác khóa).
- **Thêm học viên vào lớp**: nút "+ Thêm học viên" → tìm theo **họ tên hoặc tên
  tài khoản** → bấm Thêm. Dùng RPC `search_students` (SECURITY DEFINER) vì
  `profiles_select` chỉ cho GV thấy HV đã ở trong lớp mình — xem DATABASE.md.
- Xóa lớp → confirm (mất enrollment, session, review).

### Buổi học & nhận xét
- Mỗi lớp có N buổi sinh sẵn; GV điền tiêu đề + nội dung + ngày cho từng buổi.
- Trang nhận xét theo buổi cho từng học viên: tick **điểm mạnh** / **điểm cần cải
  thiện** từ danh mục `review_options` (GV tự quản lý danh mục này) + ô lời khuyên.
- Nút **"AI tạo nhận xét"** → điền sẵn đoạn nhận xét → GV sửa → lưu.

### Tin nhắn Zalo (copy thủ công — KHÔNG dùng Zalo API)
- CRUD mẫu tin (`zalo_templates`) với placeholder `{ten_lop}` `{buoi}` `{tom_tat}` `{loi_nhan}`.
- Chọn lớp + buổi → AI tổng hợp từ các nhận xét đã lưu → preview → nút **Copy**.

### Chấm bài bằng AI — công cụ ĐỘC LẬP, KHÔNG theo lớp
Trang `/teacher/assignments`, không dính lớp/học viên/danh sách HV.

- **Đề bài (thứ DUY NHẤT được lưu)**: thuộc khóa + số buổi, mỗi buổi 1 đề
  (unique), file đề PDF/ảnh/text/md lưu ở bucket `assignment-specs`, kèm hướng
  dẫn chấm tùy chọn. Dùng chung mọi lớp cùng khóa.
- **Xem đề** (nút 👁 ở thẻ đề, và link "Xem đề" cạnh ô chọn khi chấm): mở popup
  hiện nội dung — file chữ (.txt/.md/code) đọc thẳng, ảnh/PDF xem qua link ký
  10 phút (bucket private). File bị DLP mã hóa thì báo rõ và bảo tạo lại bằng
  .txt/.md thay vì hiện bytes rác.
- **Upload file đề xảy ra lúc bấm "Tạo đề bài"**, không phải lúc chọn file —
  chọn xong rồi đổi file/đóng popup/tạo hụt đều KHÔNG để lại file rác trong bucket.
- **Chấm**: chọn khóa → chọn đề → upload file bài làm của **một học sinh mỗi
  lượt** (nhiều file được) → bấm Chấm. KHÔNG nhập tên học sinh.
- **Kết quả**: **ô điểm riêng** (/100, tô màu: đỏ <50, vàng 50–79, xanh ≥80) +
  nhận xét **ngắn gọn dạng gạch đầu dòng** (3-6 ý) + nút **Copy**.
- **KHÔNG lưu gì**: file bài làm gửi inline (base64) sang ai-service, không qua
  Storage; kết quả không ghi DB → tải lại trang là mất. Chấm xong copy rồi làm
  em tiếp theo.

### Sản phẩm cuối khóa (góc nhìn GV)
Trang `/teacher/gallery` (nav "Sản phẩm") — dùng CHUNG component với gallery của
học viên (`components/gallery/`), khác ở 3 chỗ: nhóm theo lớp, xưng "em", và GV
xóa được nhận xét bất kỳ.

- Sản phẩm nhóm theo từng lớp GV dạy; bấm vào từng em → popup chi tiết (tên, mô
  tả, chức năng, link code/demo/drive, ghi chú) + khu nhận xét.
- **GV nhận xét như học viên** (cùng bảng `project_comments`), và xóa được nhận
  xét của bất kỳ ai trong lớp mình (`project_comments_delete` đã cho phép sẵn).
- Không cần migration: `projects_class_select` + `project_comments_*` vốn đã mở
  cho `is_teacher_of_class`; trước đây chỉ thiếu giao diện.

### Random nhóm thuyết trình
- Chọn lớp → nhập số nhóm HOẶC số người/nhóm → shuffle, hiển thị kết quả có
  animation, nút random lại, lưu kết quả lần cuối.

## Học viên

Điều hướng: nav trên cùng có **"Lớp học"** (`exact: true` để không sáng khi đang
ở tab con); 3 khu còn lại đi bằng **tab** (`components/student-tabs.tsx`, render ở
layout nên hiện ở mọi trang — ở `/student` không tab nào sáng).

- **Lớp học** (nav, `/student`): CHỈ thẻ thông tin lớp — mã lớp, khóa, tổng số
  buổi, ngày tham gia. **KHÔNG liệt kê từng buổi** và **KHÔNG hiện nhận xét cá
  nhân** (không query `sessions` lẫn `student_reviews`; nhận xét chỉ để GV gửi
  phụ huynh).
- **Sản phẩm:** CRUD sản phẩm của chính mình (1 sản phẩm/lớp) — tên, mô tả, danh
  sách chức năng, link GitHub/Drive/demo, ghi chú. Nút **AI gợi ý tính năng** →
  3–5 gợi ý kèm độ khó, bấm để thêm vào danh sách.
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
