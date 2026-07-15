# FEATURES.md — Nghiệp vụ từng tính năng theo vai trò

> Nguồn sự thật về UX/nghiệp vụ. Đọc phần liên quan đến task, không đọc cả file.

## Vai trò & đăng nhập (KHÔNG dùng email)

- **Đăng nhập:** tên tài khoản (username) + mật khẩu.
- **Đăng ký học viên:** họ tên + tên tài khoản (3-20 ký tự, chữ thường/số/./_,
  duy nhất) + **combo box chọn lớp** (danh sách lớp GV đã mở, kèm tên khóa) +
  mật khẩu + nhập lại mật khẩu. KHÔNG thu thập email/tuổi/trường/sở thích.
- **Đăng ký giáo viên:** trang riêng `/signup/teacher`, cần mã mời
  (env `TEACHER_INVITE_CODE`) + username + nhập lại mật khẩu.
- **Thông tin cá nhân:** sửa họ tên; username hiển thị read-only.

## Giáo viên

### Khóa học & lớp
- CRUD khóa học: mã tiền tố (JSB, JSA, JSI, CSB, CSI...), tên, mô tả.
- CRUD lớp thuộc khóa: mã lớp GV tự đặt, form gợi ý số kế tiếp (JSB01 → JSB02);
  số buổi (`total_sessions` — quyết định số session sinh ra), mô tả.
- Danh sách học viên trong lớp; **chuyển học viên sang lớp khác** (kể cả khác khóa).
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
- **Chấm**: chọn khóa → chọn đề → upload file bài làm của **một học sinh mỗi
  lượt** (nhiều file được) → bấm Chấm. KHÔNG nhập tên học sinh.
- **Kết quả**: **ô điểm riêng** (/100, tô màu: đỏ <50, vàng 50–79, xanh ≥80) +
  nhận xét **ngắn gọn dạng gạch đầu dòng** (3-6 ý) + nút **Copy**.
- **KHÔNG lưu gì**: file bài làm gửi inline (base64) sang ai-service, không qua
  Storage; kết quả không ghi DB → tải lại trang là mất. Chấm xong copy rồi làm
  em tiếp theo.

### Sản phẩm cuối khóa (góc nhìn GV)
- Xem tất cả sản phẩm của lớp, trang chi tiết để kiểm tra (tên, mô tả, chức năng,
  link code, link demo, ghi chú).

### Random nhóm thuyết trình
- Chọn lớp → nhập số nhóm HOẶC số người/nhóm → shuffle, hiển thị kết quả có
  animation, nút random lại, lưu kết quả lần cuối.

## Học viên

- **Sản phẩm cuối khóa:** CRUD của chính mình — tên dự án, mô tả, danh sách chức
  năng, link GitHub, link Google Drive, link demo, ghi chú nghiên cứu thêm.
- **Gallery lớp:** xem sản phẩm của bạn cùng lớp, bình luận lẫn nhau.
- **AI gợi ý tính năng:** nút trên trang sản phẩm của mình → 3–5 gợi ý kèm độ khó.
- **Trang hướng dẫn nộp bài:** video nhúng YouTube — đưa code lên GitHub,
  Google Drive, deploy demo miễn phí (Vercel / GitHub Pages).

## Ràng buộc phân quyền (nhắc lại)

Học viên KHÔNG: vào route giáo viên, thấy điểm/bài nộp của bạn khác, sửa project
người khác. Tất cả chặn bằng RLS + redirect ở layout.
