-- Bỏ trạng thái nộp draft/submitted của sản phẩm (yêu cầu 2026-07-18: không cần
-- hiện "Đang làm"/"Đã nộp" nữa) — thêm ở 20260719000000, gỡ tại đây.
-- ⚠️ CHỈ áp SAU khi code mới đã deploy: code cũ SELECT đích danh cột `status`
-- (2 trang gallery) — drop trước là production 500 "column does not exist".

alter table public.projects drop column if exists status;
