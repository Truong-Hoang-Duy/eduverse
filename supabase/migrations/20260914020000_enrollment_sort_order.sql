-- Migration 20260914020000: Thêm cột sort_order vào enrollments để giáo viên
-- tự do sắp xếp thứ tự học viên trong lớp và hiển thị nhất quán ở các buổi nhận xét.

alter table public.enrollments
  add column if not exists sort_order integer not null default 0;

create index if not exists idx_enrollments_class_sort_order
  on public.enrollments (class_id, sort_order, joined_at);
