-- Bỏ lưu kết quả random nhóm (yêu cầu 2026-07-18): GV chỉ random tại chỗ và
-- chiếu TV, mỗi buổi random mới → bảng presentation_groups thành schema chết.
-- ⚠️ CHỈ áp SAU khi code mới đã deploy: code cũ SELECT bảng này ở trang chi
-- tiết lớp — drop trước là trang lớp lỗi (bài học Đợt 9 với projects.status).

drop table if exists public.presentation_groups;
