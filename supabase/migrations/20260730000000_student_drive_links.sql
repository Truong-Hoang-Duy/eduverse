-- Link Google Drive nộp bài của học viên.
--
-- MỘT học viên = MỘT link, dùng chung cho MỌI lớp/khóa em học (user chốt
-- 2026-07-30). Vì vậy khóa chính là student_id, KHÔNG phải (class_id, student_id).
--
-- Tại sao là bảng riêng chứ không phải cột trong `profiles`: policy
-- `profiles_select` cho phép BẠN CÙNG LỚP đọc profile của nhau, nên để link ở đó
-- là bạn học cũng đọc được — trái yêu cầu "chỉ giáo viên xem". Cùng lý do đã tách
-- `user_secrets` cho API key.
--
-- Cột `projects.drive_url` (per-lớp) trở thành dư: link giờ ở cấp học viên. KHÔNG
-- drop trong migration này — theo luật của dự án, deploy code bỏ tham chiếu TRƯỚC
-- rồi mới drop ở migration sau.

create table public.student_drive_links (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  drive_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.student_drive_links enable row level security;

-- Chính chủ: toàn quyền với dòng của mình.
create policy "drive_links_own_all" on public.student_drive_links for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Giáo viên của lớp mà học viên đang học: CHỈ ĐỌC, không sửa link của HV.
-- `is_teacher_of_class` là SECURITY DEFINER nên subquery này không bị RLS của
-- `enrollments` chặn (cùng khuôn với policy `profiles_select` đã có).
create policy "drive_links_teacher_select" on public.student_drive_links for select
  using (
    exists (
      select 1 from public.enrollments e
      where e.student_id = student_drive_links.student_id
        and public.is_teacher_of_class(e.class_id)
    )
  );
