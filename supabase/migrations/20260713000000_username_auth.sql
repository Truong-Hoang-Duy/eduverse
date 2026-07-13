-- Chuyển sang đăng nhập bằng TÊN TÀI KHOẢN (không dùng email thật).
-- Email trong auth.users là email ảo <username>@eduverse.local, sinh tự động.

-- 1. Cột username duy nhất trên profiles
alter table public.profiles add column username text unique;

-- Backfill cho tài khoản cũ (nếu có): lấy phần trước @ của email
update public.profiles p
set username = lower(split_part(u.email, '@', 1))
from auth.users u
where u.id = p.id and p.username is null;

-- 2. Trigger tạo profile: thêm username (bắt buộc), bỏ thu thập tuổi/trường/sở thích
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_class_code text := new.raw_user_meta_data ->> 'class_code';
  v_username text := lower(trim(new.raw_user_meta_data ->> 'username'));
  v_class_id uuid;
begin
  if v_username is null or v_username = '' then
    -- fallback cho user tạo ngoài luồng app (VD tạo tay trong dashboard)
    v_username := lower(split_part(new.email, '@', 1));
  end if;

  insert into public.profiles (id, full_name, role, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Học viên mới'),
    case
      when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher'
      else 'student'
    end,
    v_username
  );

  -- Học viên đăng ký kèm mã lớp → tự ghi danh. Mã sai → chặn luôn việc tạo user.
  if coalesce(new.raw_user_meta_data ->> 'role', 'student') = 'student' then
    if v_class_code is null or trim(v_class_code) = '' then
      raise exception 'Thiếu mã lớp';
    end if;
    select id into v_class_id
    from public.classes
    where class_code = upper(trim(v_class_code));
    if v_class_id is null then
      raise exception 'Mã lớp không tồn tại: %', v_class_code;
    end if;
    insert into public.enrollments (class_id, student_id)
    values (v_class_id, new.id);
  end if;

  return new;
end;
$$;

-- 3. Danh sách lớp cho combo box ở form đăng ký (chưa đăng nhập vẫn gọi được)
create or replace function public.list_available_classes()
returns table (class_code text, course_name text)
language sql security definer set search_path = public stable
as $$
  select c.class_code, co.name
  from public.classes c
  join public.courses co on co.id = c.course_id
  order by c.class_code;
$$;

-- 4. Tra email đăng nhập từ username (hỗ trợ cả tài khoản cũ dùng email thật)
create or replace function public.get_email_by_username(p_username text)
returns text
language sql security definer set search_path = public stable
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = lower(trim(p_username));
$$;
