-- Thêm trạng thái nộp cho sản phẩm cuối khóa: 'draft' (đang làm) | 'submitted' (đã nộp).
--
-- ⚠️ DÁN TAY vào Supabase SQL Editor (mạng local chặn cổng 5432). Cột thêm mới có
-- DEFAULT nên an toàn với code đang chạy (code cũ không đụng cột này). Áp migration
-- TRƯỚC khi deploy code mới — code mới ghi/đọc `status`, thiếu cột sẽ lỗi khi lưu.
-- Sau khi áp, regen types (hoặc code đã hand-add sẵn `status` vào database.types.ts).

alter table public.projects
  add column if not exists status text not null default 'draft'
  check (status in ('draft', 'submitted'));

-- Sản phẩm đã khai báo từ trước coi như đã nộp (chúng đều là bản HV chủ động tạo).
update public.projects set status = 'submitted' where status = 'draft';
