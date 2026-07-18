-- HV xem được danh sách ghi danh của lớp mình đang học (bạn cùng lớp), để
-- gallery hiện cả bạn CHƯA có sản phẩm. `is_enrolled` là SECURITY DEFINER nên
-- policy tham chiếu lại chính enrollments mà không gây RLS đệ quy.
-- Policy cũ `enrollments_student_select` (chỉ dòng của mình) bị policy mới bao
-- trùm (mình luôn is_enrolled lớp mình) → gỡ cho khỏi thừa.
-- Tác dụng phụ có chủ đích: nhánh "HV xem profile bạn cùng lớp" trong
-- `profiles_select` (subquery trên enrollments, chịu RLS) giờ mới thực sự
-- nhìn thấy dòng ghi danh của bạn → join lấy full_name hoạt động đúng.

drop policy if exists "enrollments_student_select" on public.enrollments;

create policy "enrollments_classmates_select" on public.enrollments for select
  using (public.is_enrolled(class_id));
