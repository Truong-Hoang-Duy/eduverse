-- Xóa schema chết: submissions + grades + bucket submissions.
-- Đây là tàn dư của bản chấm bài CŨ (chấm theo lớp, lưu điểm). Bản chấm bài hiện
-- tại KHÔNG lưu gì (file + kết quả gửi inline sang ai-service rồi mất), nên 2 bảng
-- và bucket này chưa từng được code mới dùng tới.
--
-- ⚠️ Migration này phải DÁN TAY vào Supabase SQL Editor (mạng local chặn cổng
-- 5432/6543 nên `supabase db push` không dùng được). Sau khi chạy, regen types:
--   ./node_modules/.bin/supabase gen types typescript --linked > web/src/lib/database.types.ts
-- để bỏ luôn type submissions/grades khỏi database.types.ts.

-- 1. Bảng: grades tham chiếu submissions → xóa grades trước (hoặc cascade).
drop table if exists public.grades;
drop table if exists public.submissions;

-- 2. Thu gọn storage policy: chỉ còn bucket assignment-specs (bỏ 'submissions').
drop policy if exists "storage_teacher_all" on storage.objects;
create policy "storage_teacher_all" on storage.objects for all
  using (bucket_id = 'assignment-specs' and public.is_teacher())
  with check (bucket_id = 'assignment-specs' and public.is_teacher());

-- 3. Dọn file rác (nếu có) rồi xóa bucket submissions.
delete from storage.objects where bucket_id = 'submissions';
delete from storage.buckets where id = 'submissions';
