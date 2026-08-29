-- Trang phụ huynh: LỜI CHÚC → CHẤM ĐIỂM + NHẬN XÉT ẨN DANH (user chốt 2026-08-29,
-- ngay sau khi xem bản đầu).
--
-- Vì sao là migration RIÊNG chứ không sửa `20260829000000`: bản kia ĐÃ được dán
-- lên DB thật rồi. Lần trước tôi sửa thẳng vào nó, hậu quả là code mới `SELECT`
-- `allow_ratings`/`show_rating_results` trên schema cũ → PostgREST lỗi → trang lớp
-- tưởng "chưa bật link" và mã QR biến mất. Đúng loại sự cố đã ghi ở DECISIONS.md.
--
-- File này viết PHÒNG THỦ (kiểm `information_schema` trước khi đổi) để dán được
-- dù DB đang ở bản nào — dán hai lần cũng không sao.
--
-- ⚠️ MẤT DỮ LIỆU CÓ CHỦ Ý: bảng `showcase_messages` (lời chúc) bị xóa cùng nội
-- dung trong đó. Tính năng đã bị thay hẳn, không có chỗ nào để chuyển dữ liệu
-- sang: lời chúc có TÊN người gửi, còn bài chấm mới thì ẩn danh theo thiết kế.

-- ---------------------------------------------------------------------------
-- 1. Công tắc trên `class_showcases`
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'class_showcases'
      and column_name = 'allow_messages'
  ) then
    alter table public.class_showcases rename column allow_messages to allow_ratings;
  end if;
end $$;

-- Lỡ dán file này lên một DB chưa có cột nào trong hai cột (không nên xảy ra,
-- nhưng dán tay thì chuyện gì cũng có thể) — vẫn có cột để chạy tiếp.
alter table public.class_showcases
  add column if not exists allow_ratings boolean not null default true;

-- Điểm trung bình có hiện cho phụ huynh xem không. MẶC ĐỊNH TẮT: bảng điểm công
-- khai giữa buổi lễ biến trang này thành bảng xếp hạng trẻ con trước mặt phụ
-- huynh. Nhận xét chữ vẫn hiện (ẩn danh) — phần định tính không xếp hạng được ai.
alter table public.class_showcases
  add column if not exists show_rating_results boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. Bảng chấm điểm ẩn danh (thay `showcase_messages`)
-- ---------------------------------------------------------------------------
-- Ẩn danh THẬT: bảng này KHÔNG có cột tên/email/IP. Thứ duy nhất nhận diện là
-- `visitor_id` — chuỗi ngẫu nhiên do chính trình duyệt sinh và giữ trong
-- localStorage, không truy ngược được ra ai. Nó tồn tại vì đúng hai việc:
--   (1) một máy chỉ chấm một lần cho mỗi em (UNIQUE), và
--   (2) phụ huynh sửa lại điểm/nhận xét của chính mình (upsert theo cặp khóa).
--
-- Ba tiêu chí đều CHO PHÉP BỎ TRỐNG: có phụ huynh chỉ xem sản phẩm mà không kịp
-- nghe thuyết trình. Nhưng phải có ít nhất một thứ (điểm nào đó hoặc nhận xét),
-- nếu không thì đây là dòng rỗng vô nghĩa.
create table if not exists public.showcase_ratings (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.class_showcases (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  visitor_id text not null,
  score_product smallint,
  score_presentation smallint,
  score_creativity smallint,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, visitor_id),
  constraint showcase_ratings_visitor_shape
    check (visitor_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  constraint showcase_ratings_scores_in_range check (
    (score_product is null or score_product between 1 and 5)
    and (score_presentation is null or score_presentation between 1 and 5)
    and (score_creativity is null or score_creativity between 1 and 5)
  ),
  constraint showcase_ratings_comment_within_limits
    check (comment is null or length(btrim(comment)) between 1 and 500),
  constraint showcase_ratings_not_empty check (
    num_nonnulls(score_product, score_presentation, score_creativity) > 0
    or comment is not null
  )
);

create index if not exists showcase_ratings_showcase_idx
  on public.showcase_ratings (showcase_id, created_at);

alter table public.showcase_ratings enable row level security;

-- Giáo viên đọc và XÓA được (kiểm duyệt SAU khi đã hiện — user chốt: giữa buổi
-- lễ không ai ngồi duyệt kịp). Không ai INSERT/UPDATE trực tiếp: khách đi qua
-- `rate_showcase_project`, hàm đó mới kiểm token + chống spam.
drop policy if exists "showcase_ratings_teacher_select" on public.showcase_ratings;
create policy "showcase_ratings_teacher_select" on public.showcase_ratings for select
  using (
    exists (
      select 1 from public.class_showcases s
      where s.id = showcase_ratings.showcase_id
        and public.is_teacher_of_class(s.class_id)
    )
  );

drop policy if exists "showcase_ratings_teacher_delete" on public.showcase_ratings;
create policy "showcase_ratings_teacher_delete" on public.showcase_ratings for delete
  using (
    exists (
      select 1 from public.class_showcases s
      where s.id = showcase_ratings.showcase_id
        and public.is_teacher_of_class(s.class_id)
    )
  );


-- ---------------------------------------------------------------------------
-- 3. RPC cho khách vãng lai — bản mới
-- ---------------------------------------------------------------------------
-- Trả về NULL cho cả 3 trường hợp "không có token này" / "đã tắt" / "hết hạn" —
-- cố ý không phân biệt, để không xác nhận hộ kẻ dò token rằng nó từng tồn tại.
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
          -- Số lượt chấm luôn hiện (khích lệ, không xếp hạng ai); còn ĐIỂM
          -- trung bình chỉ hiện khi giáo viên bật `show_rating_results`.
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
          -- Nhận xét của khách: KHÔNG kèm bất cứ thứ gì nhận diện người viết.
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
        ) order by au.full_name
      )
      from public.projects pr
      join public.profiles au on au.id = pr.student_id
      where pr.class_id = sc.class_id
        and not (pr.student_id = any (sc.hidden_student_ids))
    ), '[]'::jsonb)
  )
  from sc;
$$;

/**
 * Chấm điểm + nhận xét ẩn danh cho MỘT em. Gọi lại là SỬA bài chấm cũ của chính
 * máy đó (upsert theo `project_id + visitor_id`), không tạo dòng mới.
 *
 * Ném exception tiếng Việt để Server Action hiện thẳng cho khách.
 */
create or replace function public.rate_showcase_project(
  p_token text,
  p_project_id uuid,
  p_visitor_id text,
  p_product smallint,
  p_presentation smallint,
  p_creativity smallint,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_showcase public.class_showcases%rowtype;
  v_row public.showcase_ratings%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_recent int;
begin
  select * into v_showcase
  from public.class_showcases
  where token = p_token
    and is_enabled
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'Link này không còn hiệu lực.';
  end if;
  if not v_showcase.allow_ratings then
    raise exception 'Giáo viên đã tắt phần chấm điểm.';
  end if;
  if p_visitor_id !~ '^[A-Za-z0-9_-]{8,64}$' then
    raise exception 'Phiên xem không hợp lệ — tải lại trang giúp mình nhé.';
  end if;
  if not exists (
    select 1 from public.projects
    where id = p_project_id and class_id = v_showcase.class_id
  ) then
    raise exception 'Không tìm thấy sản phẩm này.';
  end if;

  if num_nonnulls(p_product, p_presentation, p_creativity) = 0
     and v_comment is null then
    raise exception 'Hãy chấm ít nhất một tiêu chí hoặc viết một dòng nhận xét.';
  end if;
  if coalesce(p_product, 1) not between 1 and 5
     or coalesce(p_presentation, 1) not between 1 and 5
     or coalesce(p_creativity, 1) not between 1 and 5 then
    raise exception 'Điểm phải từ 1 đến 5 sao.';
  end if;
  if length(v_comment) > 500 then
    raise exception 'Nhận xét tối đa 500 ký tự.';
  end if;

  -- Chống spam Ở TẦNG DB, vì ai cũng gọi được hàm này. Không dùng IP (Supabase
  -- không đưa IP xuống hàm) nên đây là hàng rào cho CẢ TRANG, không phải cho
  -- từng người; giới hạn mỗi người đã có sẵn nhờ UNIQUE(project_id, visitor_id).
  select count(*) into v_recent
  from public.showcase_ratings
  where showcase_id = v_showcase.id and created_at > now() - interval '1 minute';
  if v_recent >= 60 then
    raise exception 'Đang có quá nhiều lượt chấm cùng lúc — thử lại sau một phút nhé.';
  end if;

  insert into public.showcase_ratings (
    showcase_id, project_id, visitor_id,
    score_product, score_presentation, score_creativity, comment
  )
  values (
    v_showcase.id, p_project_id, p_visitor_id,
    p_product, p_presentation, p_creativity, v_comment
  )
  on conflict (project_id, visitor_id) do update
  set score_product = excluded.score_product,
      score_presentation = excluded.score_presentation,
      score_creativity = excluded.score_creativity,
      comment = excluded.comment,
      updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'project_id', v_row.project_id,
    'score_product', v_row.score_product,
    'score_presentation', v_row.score_presentation,
    'score_creativity', v_row.score_creativity,
    'comment', v_row.comment,
    'created_at', v_row.created_at
  );
end;
$$;

/**
 * Bài chấm của CHÍNH máy đang xem, để mở lại trang vẫn thấy mình đã chấm những
 * em nào và sửa được.
 *
 * `visitor_id` là bí mật của riêng trình duyệt đó (không hiện ở đâu trên trang),
 * nên biết id thì mới đọc được — không ai dò được bài chấm của người khác.
 */
create or replace function public.get_my_showcase_ratings(
  p_token text,
  p_visitor_id text
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', rt.id,
      'project_id', rt.project_id,
      'score_product', rt.score_product,
      'score_presentation', rt.score_presentation,
      'score_creativity', rt.score_creativity,
      'comment', rt.comment,
      'created_at', rt.created_at
    )
  ), '[]'::jsonb)
  from public.showcase_ratings rt
  join public.class_showcases s on s.id = rt.showcase_id
  where s.token = p_token
    and s.is_enabled
    and (s.expires_at is null or s.expires_at > now())
    and rt.visitor_id = p_visitor_id;
$$;

grant execute on function public.get_showcase(text) to anon, authenticated;
grant execute on function public.rate_showcase_project(text, uuid, text, smallint, smallint, smallint, text) to anon, authenticated;
grant execute on function public.get_my_showcase_ratings(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Dọn phần lời chúc cũ — CHẠY CUỐI CÙNG
-- ---------------------------------------------------------------------------
-- Đặt sau khi `get_showcase` đã được thay bằng bản không còn đọc
-- `showcase_messages` nữa, và bỏ `add_showcase_message` trước khi bỏ bảng nó
-- dùng — để không phụ thuộc vào việc Postgres có ghi nhận phụ thuộc của hàm
-- thân-chuỗi hay không.
drop function if exists public.add_showcase_message(text, uuid, text, text);
drop table if exists public.showcase_messages;
