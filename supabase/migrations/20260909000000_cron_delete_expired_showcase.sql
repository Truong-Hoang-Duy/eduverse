-- Kích hoạt extension pg_cron (được hỗ trợ bởi Supabase)
create extension if not exists pg_cron;

-- Lên lịch cron job chạy MỖI GIỜ MỘT LẦN ('0 * * * *')
-- Xóa các lớp có link tổng kết khóa học (showcase) đã hết hạn.
-- Chú ý: Việc xóa dòng trong class_showcases sẽ tự động xóa các dòng liên quan
-- trong showcase_ratings và showcase_reactions nhờ ON DELETE CASCADE.
select cron.schedule(
  'delete-expired-showcases',
  '0 * * * *',
  $$ delete from public.class_showcases where expires_at < now(); $$
);
