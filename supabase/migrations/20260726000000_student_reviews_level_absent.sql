-- Nhận xét theo buổi: thêm mức xếp loại học lực + đánh vắng (yêu cầu user
-- 2026-07-27).
--
-- Cả 2 đều là THÊM cột → an toàn dán TRƯỚC khi deploy code (giống mọi lần ADD
-- trước; DROP mới phải dán sau).
--
-- academic_level: nullable (NULL = GV chưa chọn). CHECK cho NULL đi qua vì
-- `NULL in (...)` trả NULL chứ không false. 4 giá trị khớp
-- `web/src/lib/academic-levels.ts` (ACADEMIC_LEVELS) — sửa/thêm mức phải sửa
-- CẢ CHECK này (Postgres không cho ALTER CHECK trực tiếp, phải drop+add).
--
-- is_absent: mặc định false = có đi học (đúng yêu cầu "mặc định là sẽ đi học").
alter table public.student_reviews
  add column if not exists academic_level text
    check (academic_level in ('gioi', 'kha', 'trung_binh', 'can_co_gang')),
  add column if not exists is_absent boolean not null default false;
