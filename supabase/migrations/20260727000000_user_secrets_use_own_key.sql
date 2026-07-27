-- Công tắc bật/tắt key Gemini riêng mà KHÔNG xóa key (yêu cầu user 2026-07-27):
-- bật → dùng key riêng, tắt → tạm dùng key hệ thống, key vẫn được lưu lại.
--
-- THÊM cột → an toàn dán TRƯỚC khi deploy code.
--
-- DEFAULT true để giữ nguyên hành vi cũ: ai đã có key thì trước giờ luôn dùng
-- key đó, nay mặc định vẫn "đang bật".
alter table public.user_secrets
  add column if not exists use_own_key boolean not null default true;
