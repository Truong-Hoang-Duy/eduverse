-- Bắt buộc `drive_url` phải là http(s) — CHỐNG STORED XSS.
--
-- Sự cố tìm được 2026-07-30: validate URL chỉ nằm ở Server Action
-- (`saveMyDriveLink`), nhưng policy `drive_links_own_all` cho học viên GHI thẳng
-- dòng của mình qua REST API, bỏ qua action. Đã kiểm chứng: em ghi được
-- `javascript:alert(document.cookie)` vào drive_url của chính mình, rồi GIÁO VIÊN
-- và BẠN CÙNG LỚP mở trang lớp sẽ thấy một <a href="javascript:..."> bấm được →
-- script chạy trong phiên của người xem.
--
-- Đúng luật của dự án: ràng buộc phải ở tầng DB, check ở UI/action chỉ là lớp phụ.
--
-- `~ '^https?://'` cũng chặn luôn khoảng trắng đứng đầu (DB từng nhận
-- "  javascript:alert(1)") và chuỗi không phải URL.
-- Giới hạn 500 ký tự khớp với `driveUrlError` phía web.
--
-- An toàn với dữ liệu đang có: đã kiểm mọi dòng trong production đều là
-- https://drive.google.com/... (87 ký tự) trước khi viết migration này.

alter table public.student_drive_links
  add constraint student_drive_links_url_is_http
  check (drive_url ~ '^https?://' and length(drive_url) <= 500);
