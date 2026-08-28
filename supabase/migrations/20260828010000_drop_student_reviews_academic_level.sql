-- Hai cột chết sau đợt 2026-08-28 — dán SAU khi đã deploy code mới (quy ước
-- THÊM trước / DROP sau của dự án: code cũ còn chạy vẫn SELECT đích danh chúng).

-- Xếp loại học lực chuyển hẳn sang enrollments.academic_level (xem
-- 20260828000000) — GV tích 1 lần cho cả lớp thay vì chọn lại mỗi buổi.
alter table public.student_reviews drop column if exists academic_level;

-- Bộ combo không chia loại nữa: mỗi bộ chứa cả strengths + improvements +
-- project_notes. Nhãn của các bộ cũ KHÔNG mất — chúng vẫn nằm trong 3 mảng đó,
-- chỉ cột phân loại là thừa.
alter table public.review_combos drop column if exists type;
