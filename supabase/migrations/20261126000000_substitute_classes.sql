-- Migration: Tạo không gian riêng cho "Lớp dạy thay" (substitute_classes + substitute_sessions)
-- Mục đích: cho phép giáo viên tạo nhanh lớp đi dạy thay (không cần tạo tài khoản học viên,
-- không làm nhiễu bảng classes/enrollments/gallery/đăng ký học viên) và xóa sạch lớp + toàn bộ
-- buổi dạy thay bằng 1 chạm khi không còn dạy thay lớp đó nữa (ON DELETE CASCADE).

create table if not exists public.substitute_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  course_name text not null default '',
  class_code text not null,
  notes text,
  students jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists substitute_classes_teacher_id_idx
  on public.substitute_classes (teacher_id);

create table if not exists public.substitute_sessions (
  id uuid primary key default gen_random_uuid(),
  substitute_class_id uuid not null references public.substitute_classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  session_number integer not null default 1 check (session_number >= 1 and session_number <= 100),
  title text,
  content text,
  review_context text,
  session_date date,
  is_periodic_test boolean not null default false,
  is_project_period boolean not null default false,
  is_final_presentation boolean not null default false,
  reviews jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (substitute_class_id, session_number)
);

create index if not exists substitute_sessions_class_id_idx
  on public.substitute_sessions (substitute_class_id);

create index if not exists substitute_sessions_teacher_id_idx
  on public.substitute_sessions (teacher_id);

alter table public.substitute_classes enable row level security;
alter table public.substitute_sessions enable row level security;

-- Chỉ giáo viên sở hữu mới được đọc/ghi/xóa lớp dạy thay của chính mình; học viên bị chặn tuyệt đối.
create policy "substitute_classes_teacher_all" on public.substitute_classes for all
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher());

create policy "substitute_sessions_teacher_all" on public.substitute_sessions for all
  using (
    teacher_id = auth.uid()
    and public.is_teacher()
    and exists (
      select 1
      from public.substitute_classes sc
      where sc.id = substitute_class_id
        and sc.teacher_id = auth.uid()
    )
  )
  with check (
    teacher_id = auth.uid()
    and public.is_teacher()
    and exists (
      select 1
      from public.substitute_classes sc
      where sc.id = substitute_class_id
        and sc.teacher_id = auth.uid()
    )
  );
