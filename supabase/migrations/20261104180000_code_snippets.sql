-- Bảng lưu trữ Sổ tay Code (các đoạn code mẫu & mẹo khắc phục lỗi nhanh) của giáo viên.
-- RLS chỉ cho phép giáo viên sở hữu (teacher_id = auth.uid()) đọc/ghi đầy đủ.

create table if not exists public.code_snippets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  code text not null,
  usage_guide text not null default '',
  category text not null default 'general',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists code_snippets_teacher_id_idx
  on public.code_snippets (teacher_id);

alter table public.code_snippets enable row level security;

-- Giáo viên toàn quyền thêm/sửa/xóa các đoạn code của mình
create policy "code_snippets_teacher_all" on public.code_snippets for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- Học viên (và mọi người dùng đã đăng nhập) được quyền xem Sổ tay Code
create policy "code_snippets_select_authenticated" on public.code_snippets for select
  to authenticated using (true);

-- Khởi tạo sẵn đoạn code mẫu %matplotlib inline cho các giáo viên hiện có
insert into public.code_snippets (teacher_id, title, code, usage_guide, category, is_pinned)
select
  p.id,
  'Sửa lỗi không hiển thị biểu đồ khi chạy code (Jupyter / Matplotlib)',
  '%matplotlib inline',
  'Khi em đã gõ đúng câu lệnh vẽ biểu đồ nhưng chạy không thấy hình hiện ra, hãy chèn dòng lệnh này vào đầu ô code đầu tiên của bài rồi chạy lại nhé.',
  'csa',
  true
from public.profiles p
where p.role = 'teacher'
  and not exists (
    select 1 from public.code_snippets cs where cs.teacher_id = p.id
  );

