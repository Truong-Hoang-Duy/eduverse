-- ---------------------------------------------------------------------------
-- Chế độ "Đang thuyết trình" (Live Spotlight) cho trang Showcase cuối khóa.
-- Cho phép giáo viên ghim một học sinh đang thuyết trình,
-- điện thoại phụ huynh nhận thông báo nổi và bấm để xem ngay sản phẩm.
-- ---------------------------------------------------------------------------

-- 1. Thêm cột `spotlight_project_id` vào `class_showcases`
alter table public.class_showcases
  add column if not exists spotlight_project_id uuid references public.projects (id) on delete set null;

-- 2. Cập nhật hàm RPC `get_showcase` bổ sung `spotlight_project_id`
create or replace function public.get_showcase(p_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with sc as (
    select s.id, s.class_id, s.intro, s.allow_ratings, s.allow_reactions,
           s.show_rating_results, s.hidden_student_ids, s.expires_at,
           s.spotlight_project_id,
           c.class_code, c.description as class_description,
           co.code as course_code, co.name as course_name,
           t.full_name as teacher_name
    from public.class_showcases s
    join public.classes c on c.id = s.class_id
    join public.courses co on co.id = c.course_id
    join public.profiles t on t.id = c.teacher_id
    where s.token = p_token
      and s.is_enabled
      and (s.expires_at is null or s.expires_at > now())
  )
  select jsonb_build_object(
    'class_code', sc.class_code,
    'class_description', sc.class_description,
    'course_code', sc.course_code,
    'course_name', sc.course_name,
    'teacher_name', sc.teacher_name,
    'intro', sc.intro,
    'allow_ratings', sc.allow_ratings,
    'allow_reactions', sc.allow_reactions,
    'show_rating_results', sc.show_rating_results,
    'expires_at', sc.expires_at,
    'spotlight_project_id', sc.spotlight_project_id,
    'projects', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'author_name', au.full_name,
          'name', pr.name,
          'description', pr.description,
          'features', to_jsonb(pr.features),
          'image_urls', to_jsonb(pr.image_urls),
          'repo_url', pr.repo_url,
          'demo_url', pr.demo_url,
          'extra_notes', pr.extra_notes,
          'updated_at', pr.updated_at,
          'reaction_count', (
            select count(*) from public.showcase_reactions r
            where r.project_id = pr.id and r.showcase_id = sc.id
          ),
          'rating_count', (
            select count(*) from public.showcase_ratings rt
            where rt.project_id = pr.id and rt.showcase_id = sc.id
              and num_nonnulls(rt.score_product, rt.score_presentation,
                               rt.score_creativity) > 0
          ),
          'rating_avg', case when sc.show_rating_results then (
            select jsonb_build_object(
              'product', round(avg(rt.score_product)::numeric, 1),
              'presentation', round(avg(rt.score_presentation)::numeric, 1),
              'creativity', round(avg(rt.score_creativity)::numeric, 1)
            )
            from public.showcase_ratings rt
            where rt.project_id = pr.id and rt.showcase_id = sc.id
          ) else null end,
          'guest_notes', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', rt.id,
                'comment', rt.comment,
                'created_at', rt.created_at
              ) order by rt.created_at desc
            )
            from public.showcase_ratings rt
            where rt.project_id = pr.id and rt.showcase_id = sc.id
              and rt.comment is not null
          ), '[]'::jsonb),
          'comments', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', cm.id,
                'author_name', ca.full_name,
                'content', cm.content,
                'created_at', cm.created_at
              ) order by cm.created_at
            )
            from public.project_comments cm
            join public.profiles ca on ca.id = cm.author_id
            where cm.project_id = pr.id
          ), '[]'::jsonb)
        )
        -- Thứ tự ban đầu: tên học viên A → Z theo tiếng Việt
        order by au.full_name collate "C"
      )
      from public.projects pr
      join public.profiles au on au.id = pr.student_id
      where pr.class_id = sc.class_id
        and not (pr.student_id = any(sc.hidden_student_ids))
    ), '[]'::jsonb)
  )
  from sc;
$$;

-- 3. RPC nhẹ chỉ để đọc trạng thái spotlight (polling nhanh từ client phụ huynh)
create or replace function public.get_showcase_spotlight(p_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'spotlight_project_id', s.spotlight_project_id
  )
  from public.class_showcases s
  where s.token = p_token
    and s.is_enabled
    and (s.expires_at is null or s.expires_at > now());
$$;

grant execute on function public.get_showcase_spotlight(text) to anon, authenticated;
