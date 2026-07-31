-- Bỏ cột `projects.drive_url` — đã CHẾT từ Đợt 30.
--
-- Link Drive giờ ở cấp HỌC VIÊN (`student_drive_links`, một link dùng mọi lớp)
-- chứ không phải mỗi lớp một link. Cột này không còn dòng code nào đọc/ghi:
-- form sản phẩm bỏ ô Drive, `saveProject` không ghi, mọi câu `select` đã bỏ tên
-- cột, và nút "Thư mục Drive" ở popup lấy dữ liệu từ `student_drive_links`.
--
-- ⚠️ DÁN SAU KHI code đã deploy (luật của dự án: DROP thì deploy code bỏ tham
-- chiếu TRƯỚC, dán SAU). Dán sớm hơn thì bản đang chạy còn đọc cột này và lỗi.
--
-- Không mất dữ liệu: production có 0 dòng `projects` lúc chuyển đổi (đã đo trước
-- khi làm Đợt 30).

alter table public.projects drop column if exists drive_url;
