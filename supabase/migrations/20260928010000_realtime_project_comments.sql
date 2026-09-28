-- Bật Supabase Realtime cho bảng project_comments
-- Giúp học viên trong cùng lớp nhận xét chéo bài làm của nhau và xem cập nhật tức thì (real-time) không cần F5

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_comments'
  ) then
    alter publication supabase_realtime add table public.project_comments;
  end if;
end
$$;
