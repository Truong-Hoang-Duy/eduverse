-- Migration: Thêm cờ is_substitute vào bảng sessions
-- Cho phép giáo viên đánh dấu buổi học nghỉ dạy và có thầy (cô) khác dạy thay.
-- Buổi học sẽ được tính là hoàn thành và loại trừ khỏi dữ liệu nhận xét.

alter table public.sessions
  add column if not exists is_substitute boolean not null default false;
