-- Thêm nhóm kỹ năng 'presentation' (🎤 Thuyết trình) vào skill_group — yêu cầu
-- user 2026-07-18. Postgres không cho ALTER CHECK trực tiếp nên phải drop rồi
-- add lại constraint với danh sách giá trị mở rộng. An toàn dán bất cứ lúc nào
-- (mở rộng tập giá trị hợp lệ, không đụng dữ liệu cũ — giống ADD cột).

alter table public.review_options
  drop constraint if exists review_options_skill_group_check;

alter table public.review_options
  add constraint review_options_skill_group_check
  check (skill_group in ('thinking', 'coding', 'attitude', 'collaboration', 'presentation', 'other'));
