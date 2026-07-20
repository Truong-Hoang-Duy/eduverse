-- Thêm 6 nhóm kỹ năng mới (yêu cầu user 2026-07-18): kỷ luật/nề nếp, tự học,
-- sáng tạo, kỹ năng máy tính, vận dụng AI, đặt câu hỏi. Cùng lý do như
-- 20260724000000: Postgres không cho ALTER CHECK trực tiếp nên phải drop rồi
-- add lại constraint với danh sách giá trị mở rộng. An toàn dán bất cứ lúc
-- nào (mở rộng tập giá trị hợp lệ, không đụng dữ liệu cũ).

alter table public.review_options
  drop constraint if exists review_options_skill_group_check;

alter table public.review_options
  add constraint review_options_skill_group_check
  check (skill_group in (
    'thinking', 'creativity', 'coding', 'computer_skills', 'ai_usage',
    'questioning', 'attitude', 'discipline', 'self_study', 'collaboration',
    'presentation', 'other'
  ));
