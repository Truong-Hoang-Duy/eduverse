-- Nhóm kỹ năng cho lựa chọn nhận xét (bộ lọc combo box điểm mạnh/cần cải thiện).
-- Cột có DEFAULT nên an toàn với code cũ → dán TRƯỚC khi deploy code mới
-- (quy tắc ADD-trước / DROP-sau trong SESSION_NOTES).

alter table public.review_options
  add column if not exists skill_group text not null default 'other'
  check (skill_group in ('thinking', 'coding', 'attitude', 'collaboration', 'other'));
