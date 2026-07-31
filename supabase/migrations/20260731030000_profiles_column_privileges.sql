-- CHẶN LEO THANG QUYỀN: học viên tự sửa `profiles.role` thành 'teacher'.
--
-- Sự cố tìm được 2026-07-30. Policy `profiles_update_own` chỉ nói ĐƯỢC SỬA DÒNG
-- NÀO (`id = auth.uid()`), KHÔNG nói được sửa CỘT nào — RLS của Postgres không có
-- khái niệm cột. Nên người dùng gọi REST API sửa thẳng `role` của chính mình.
--
-- Chuỗi tấn công đã kiểm chứng đầy đủ bằng tài khoản test:
--   1. HV `PATCH /profiles?id=eq.<mình>` với `{"role":"teacher"}`  → thành công
--   2. RPC `search_students` (SECURITY DEFINER) trả về HV của LỚP KHÁC
--   3. Tự tạo khóa + lớp của riêng mình                            → thành công
--   4. Ghi danh "nạn nhân" vào lớp đó (`enrollments_teacher_all`)  → thành công
--   5. → thỏa điều kiện của `resetStudentPassword` (caller là teacher + thấy
--        enrollment qua RLS) = ĐẶT LẠI MẬT KHẨU HỌC VIÊN BẤT KỲ, chiếm tài khoản.
--
-- Cách sửa: quyền theo CỘT (`grant update (col)`), thứ Postgres có sẵn cho đúng
-- việc này. Cột nào không cấp thì `authenticated` không sửa được, dù RLS cho phép
-- dòng đó — cả hai lớp phải qua.
--
-- `service_role` (admin API, trang vận hành) và trigger `handle_new_user`
-- (SECURITY DEFINER) KHÔNG bị ảnh hưởng — vẫn đặt được role lúc tạo tài khoản.
--
-- App chỉ sửa `full_name` qua client người dùng (`lib/actions/profile.ts`), nên
-- cấp thêm mấy cột hồ sơ còn lại là dư sức dùng.

revoke update on table public.profiles from authenticated;
revoke update on table public.profiles from anon;

grant update (full_name, age, school, hobbies, avatar_url)
  on table public.profiles to authenticated;

-- Chặn luôn kiểu phá bố cục: `full_name` hiện ở bảng học viên của GV và gallery
-- của bạn cùng lớp, để trống trần thì một em ghi 100.000 ký tự là vỡ trang cả lớp
-- (đã kiểm chứng DB nhận). Dữ liệu thật lúc thêm: 18 profile, tên dài nhất 22.
alter table public.profiles
  add constraint profiles_full_name_within_limits
  check (length(btrim(full_name)) between 1 and 100);

alter table public.profiles
  add constraint profiles_school_within_limits
  check (school is null or length(school) <= 200);

alter table public.profiles
  add constraint profiles_hobbies_within_limits
  check (hobbies is null or length(hobbies) <= 500);

-- ---------------------------------------------------------------------------
-- Chặn nốt: HỌC VIÊN tự tạo khóa/lớp.
--
-- Cũng phát hiện 2026-07-30 và KHÔNG cần đổi role: `courses_teacher_all` chỉ kiểm
-- `teacher_id = auth.uid()`, không kiểm vai trò — nên một em set teacher_id là
-- chính mình rồi insert là xong. Sau đó tự tạo lớp và ghi danh người khác vào lớp
-- đó (vì `is_teacher_of_class` thấy em là "chủ lớp").
--
-- Chặn được `role` rồi thì chuỗi chiếm tài khoản đã đứt ở bước `resetStudentPassword`
-- (action đòi caller role = teacher), nhưng dữ liệu rác kiểu này vẫn làm sai số
-- liệu trang vận hành và không nên tồn tại.
--
-- `is_teacher()` là SECURITY DEFINER để đọc `profiles` không bị RLS của chính
-- `profiles` chặn/đệ quy — cùng khuôn `is_teacher_of_class`/`is_enrolled` đã có.

create or replace function public.is_teacher()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

drop policy if exists "courses_teacher_all" on public.courses;
create policy "courses_teacher_all" on public.courses for all
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher());

drop policy if exists "classes_teacher_all" on public.classes;
create policy "classes_teacher_all" on public.classes for all
  using (teacher_id = auth.uid() and public.is_teacher())
  with check (teacher_id = auth.uid() and public.is_teacher());
