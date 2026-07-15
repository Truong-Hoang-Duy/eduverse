-- Tìm học viên để thêm vào lớp.
--
-- Vì sao cần RPC: `profiles_select` chỉ cho giáo viên đọc profile của học viên
-- ĐÃ ở trong lớp mình → không thể tìm học viên mới để thêm. Hàm SECURITY DEFINER
-- này đi vòng qua RLS nhưng tự kiểm tra `is_teacher()` nên chỉ giáo viên gọi được,
-- và chỉ trả về đúng 3 cột không nhạy cảm (không đụng `user_secrets`).

create or replace function public.search_students(p_query text)
returns table (id uuid, full_name text, username text)
language sql security definer set search_path = public stable
as $$
  select p.id, p.full_name, p.username
  from public.profiles p
  where public.is_teacher()
    and p.role = 'student'
    and coalesce(trim(p_query), '') <> ''
    and (
      p.full_name ilike '%' || trim(p_query) || '%'
      or p.username ilike '%' || trim(p_query) || '%'
    )
  order by p.full_name
  limit 20;
$$;
