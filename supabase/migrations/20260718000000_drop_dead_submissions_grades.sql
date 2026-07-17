-- Xóa schema chết: submissions + grades + (bucket submissions xóa riêng, xem dưới).
-- Đây là tàn dư của bản chấm bài CŨ (chấm theo lớp, lưu điểm). Bản chấm bài hiện
-- tại KHÔNG lưu gì (file + kết quả gửi inline sang ai-service rồi mất), nên 2 bảng
-- và bucket này chưa từng được code mới dùng tới.
--
-- ⚠️ Migration này phải DÁN TAY vào Supabase SQL Editor (mạng local chặn cổng
-- 5432/6543 nên `supabase db push` không dùng được). SQL Editor chạy trong 1
-- transaction — lỗi giữa chừng là rollback HẾT, chạy lại được (mọi câu đều idempotent).
-- Sau khi chạy, regen types:
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

-- 3. ⚠️ KHÔNG xóa bucket bằng SQL: Supabase chặn DELETE trực tiếp vào
--    storage.objects/storage.buckets (trigger protect_delete → lỗi 42501).
--    Bucket `submissions` xóa qua Storage API:
--      cd web && node --env-file=.env.local scripts/drop-submissions-bucket.mjs --yes
