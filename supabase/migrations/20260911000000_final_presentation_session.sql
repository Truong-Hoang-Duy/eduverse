-- Cờ buổi "Thuyết trình sản phẩm cuối khóa & Tổng kết" (Demo Day, thường là Buổi 14).
-- GV tự đánh dấu hoặc hệ thống tự động kích hoạt khi là buổi 14 / buổi cuối khóa.
alter table public.sessions
  add column if not exists is_final_presentation boolean not null default false;
