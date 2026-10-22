-- Migration: 20261022220000_assignment_attachment_files.sql
-- Thêm cột attachment_file_paths để lưu đường dẫn các file dữ liệu / đính kèm kèm theo đề bài (ví dụ hw3_data.csv, template code, v.v.)
alter table public.assignments
  add column if not exists attachment_file_paths text[] not null default '{}';
