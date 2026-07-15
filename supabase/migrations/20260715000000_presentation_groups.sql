-- Random nhóm thuyết trình: lưu kết quả chia nhóm GẦN NHẤT của mỗi lớp.
-- Mỗi lớp giữ 1 kết quả (random lại + lưu sẽ ghi đè).

create table public.presentation_groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes (id) on delete cascade,
  -- [{"name": "Nhóm 1", "members": [{"id": "<uuid>", "name": "Nguyễn Văn A"}]}]
  groups jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.presentation_groups enable row level security;

-- GV của lớp toàn quyền; HV trong lớp xem được nhóm của mình.
create policy "presentation_groups_teacher_all" on public.presentation_groups for all
  using (public.is_teacher_of_class(class_id))
  with check (public.is_teacher_of_class(class_id));

create policy "presentation_groups_student_select" on public.presentation_groups for select
  using (public.is_enrolled(class_id));
