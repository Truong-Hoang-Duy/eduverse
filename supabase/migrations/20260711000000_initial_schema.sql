-- Eduverse initial schema + RLS
-- Xem .claude/docs/DATABASE.md để hiểu quan hệ. KHÔNG sửa file này sau khi push
-- lên DB — tạo migration mới.

-- ========== TABLES ==========

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'student' check (role in ('teacher', 'student')),
  age int check (age between 5 and 100),
  school text,
  hobbies text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- JSB, JSA, JSI, CSB, CSI...
  name text not null,
  description text,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  class_code text not null unique, -- JSB01, JSB02, CSI03... GV tự đặt
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  total_sessions int not null check (total_sessions between 1 and 100),
  description text,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  session_number int not null check (session_number >= 1),
  title text,
  content text,
  session_date date,
  unique (class_id, session_number)
);

create table public.review_options (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('strength', 'improvement', 'advice')),
  label text not null
);

create table public.student_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  advice text,
  ai_generated_comment text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  session_number int not null check (session_number >= 1),
  title text not null,
  spec_file_path text, -- path trong bucket assignment-specs
  instructions text,
  max_score int not null default 100,
  created_at timestamptz not null default now(),
  unique (course_id, session_number) -- mỗi buổi của khóa MỘT đề
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  code_file_paths text[] not null default '{}', -- paths trong bucket submissions
  uploaded_by uuid not null references public.profiles (id),
  uploaded_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions (id) on delete cascade,
  score int not null check (score between 0 and 100),
  criteria_breakdown jsonb not null default '[]',
  ai_comment text,
  graded_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null,
  description text,
  features text[] not null default '{}',
  repo_url text,
  drive_url text,
  demo_url text,
  extra_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.zalo_templates (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  template_text text not null -- placeholder: {ten_lop} {buoi} {tom_tat} {loi_nhan}
);

create index on public.enrollments (student_id);
create index on public.sessions (class_id);
create index on public.student_reviews (student_id);
create index on public.submissions (class_id);
create index on public.projects (class_id);
create index on public.project_comments (project_id);

-- ========== TRIGGERS ==========

-- Tạo profile ngay khi auth user được tạo (metadata từ form signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, age, school, hobbies)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Học viên mới'),
    case
      when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher'
      else 'student'
    end,
    nullif(new.raw_user_meta_data ->> 'age', '')::int,
    new.raw_user_meta_data ->> 'school',
    new.raw_user_meta_data ->> 'hobbies'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tự sinh N buổi học khi tạo lớp.
create or replace function public.generate_class_sessions()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.sessions (class_id, session_number, title)
  select new.id, n, 'Buổi ' || n
  from generate_series(1, new.total_sessions) as n;
  return new;
end;
$$;

create trigger on_class_created
  after insert on public.classes
  for each row execute function public.generate_class_sessions();

-- ========== HELPER FUNCTIONS (tránh RLS đệ quy) ==========

create or replace function public.is_teacher()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.classes
    where id = p_class_id and teacher_id = auth.uid()
  );
$$;

create or replace function public.is_enrolled(p_class_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.enrollments
    where class_id = p_class_id and student_id = auth.uid()
  );
$$;

-- Học viên tra mã lớp khi đăng ký (không cần quyền SELECT bảng classes).
create or replace function public.get_class_id_by_code(p_class_code text)
returns uuid
language sql security definer set search_path = public stable
as $$
  select id from public.classes where class_code = upper(trim(p_class_code));
$$;

-- ========== RLS ==========

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.sessions enable row level security;
alter table public.review_options enable row level security;
alter table public.student_reviews enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.grades enable row level security;
alter table public.projects enable row level security;
alter table public.project_comments enable row level security;
alter table public.zalo_templates enable row level security;

-- profiles: xem của mình; GV xem học viên trong lớp mình; HV xem bạn cùng lớp.
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from public.enrollments e
    where e.student_id = profiles.id and public.is_teacher_of_class(e.class_id)
  )
  or exists (
    select 1 from public.enrollments e
    where e.student_id = profiles.id and public.is_enrolled(e.class_id)
  )
);
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- courses: GV toàn quyền trên khóa của mình.
create policy "courses_teacher_all" on public.courses for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- classes: GV toàn quyền lớp mình; HV xem lớp mình học.
create policy "classes_teacher_all" on public.classes for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "classes_student_select" on public.classes for select
  using (public.is_enrolled(id));

-- enrollments: GV của lớp toàn quyền (chuyển lớp = update class_id);
-- HV xem của mình + tự ghi danh khi đăng ký.
create policy "enrollments_teacher_all" on public.enrollments for all
  using (public.is_teacher_of_class(class_id))
  with check (public.is_teacher_of_class(class_id));
create policy "enrollments_student_select" on public.enrollments for select
  using (student_id = auth.uid());
create policy "enrollments_student_insert" on public.enrollments for insert
  with check (student_id = auth.uid());

-- sessions: GV của lớp toàn quyền; HV xem buổi của lớp mình.
create policy "sessions_teacher_all" on public.sessions for all
  using (public.is_teacher_of_class(class_id))
  with check (public.is_teacher_of_class(class_id));
create policy "sessions_student_select" on public.sessions for select
  using (public.is_enrolled(class_id));

-- review_options: chỉ GV sở hữu.
create policy "review_options_teacher_all" on public.review_options for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- student_reviews: GV của lớp (qua session) toàn quyền; HV xem nhận xét CỦA MÌNH.
create policy "student_reviews_teacher_all" on public.student_reviews for all
  using (exists (
    select 1 from public.sessions s
    where s.id = session_id and public.is_teacher_of_class(s.class_id)
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = session_id and public.is_teacher_of_class(s.class_id)
  ));
create policy "student_reviews_student_select" on public.student_reviews for select
  using (student_id = auth.uid());

-- assignments: chỉ GV của khóa.
create policy "assignments_teacher_all" on public.assignments for all
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.teacher_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.courses c
    where c.id = course_id and c.teacher_id = auth.uid()
  ));

-- submissions: GV của lớp toàn quyền; HV xem bài CỦA MÌNH.
create policy "submissions_teacher_all" on public.submissions for all
  using (public.is_teacher_of_class(class_id))
  with check (public.is_teacher_of_class(class_id));
create policy "submissions_student_select" on public.submissions for select
  using (student_id = auth.uid());

-- grades: GV (qua submission → class); HV xem điểm CỦA MÌNH.
create policy "grades_teacher_all" on public.grades for all
  using (exists (
    select 1 from public.submissions sub
    where sub.id = submission_id and public.is_teacher_of_class(sub.class_id)
  ))
  with check (exists (
    select 1 from public.submissions sub
    where sub.id = submission_id and public.is_teacher_of_class(sub.class_id)
  ));
create policy "grades_student_select" on public.grades for select
  using (exists (
    select 1 from public.submissions sub
    where sub.id = submission_id and sub.student_id = auth.uid()
  ));

-- projects: HV CRUD của mình; cả lớp (HV cùng lớp + GV) xem được.
create policy "projects_owner_all" on public.projects for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "projects_class_select" on public.projects for select
  using (public.is_enrolled(class_id) or public.is_teacher_of_class(class_id));

-- project_comments: thành viên lớp xem + viết; sửa/xóa comment của mình;
-- GV của lớp xóa được comment bất kỳ.
create policy "project_comments_select" on public.project_comments for select
  using (exists (
    select 1 from public.projects p
    where p.id = project_id
      and (public.is_enrolled(p.class_id) or public.is_teacher_of_class(p.class_id))
  ));
create policy "project_comments_insert" on public.project_comments for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and (public.is_enrolled(p.class_id) or public.is_teacher_of_class(p.class_id))
    )
  );
create policy "project_comments_update_own" on public.project_comments for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "project_comments_delete" on public.project_comments for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_teacher_of_class(p.class_id)
    )
  );

-- zalo_templates: chỉ GV sở hữu.
create policy "zalo_templates_teacher_all" on public.zalo_templates for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- ========== STORAGE ==========

insert into storage.buckets (id, name, public)
values ('assignment-specs', 'assignment-specs', false),
       ('submissions', 'submissions', false);

-- Chỉ giáo viên đọc/ghi 2 bucket này (GV upload hộ bài làm học viên).
create policy "storage_teacher_all" on storage.objects for all
  using (
    bucket_id in ('assignment-specs', 'submissions') and public.is_teacher()
  )
  with check (
    bucket_id in ('assignment-specs', 'submissions') and public.is_teacher()
  );
