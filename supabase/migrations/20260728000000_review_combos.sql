-- "Bộ combo" nhận xét lưu sẵn (yêu cầu user 2026-07-27): GV lưu vài bộ điểm
-- mạnh/cần cải thiện hay dùng, 1 chạm áp cả bộ vào nhận xét — giảm thời gian
-- tích chọn. Khác `review_options` (từng nhãn lẻ) ở chỗ đây là một TẬP nhiều
-- nhãn gom lại.
--
-- Bảng MỚI → an toàn dán TRƯỚC hay SAU deploy đều được (code cũ không tham
-- chiếu). Dán TRƯỚC cho đúng nếp.

create table if not exists public.review_combos (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists review_combos_teacher_id_idx
  on public.review_combos (teacher_id);

alter table public.review_combos enable row level security;

-- Chỉ GV sở hữu — cùng khuôn với review_options/zalo_templates.
create policy "review_combos_teacher_all" on public.review_combos for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
