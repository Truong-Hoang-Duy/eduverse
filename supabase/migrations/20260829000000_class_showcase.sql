-- Trang triển lãm sản phẩm cuối khóa cho PHỤ HUYNH — link công khai, không đăng nhập.
--
-- ⚠️ ĐÂY LÀ BẢN ĐÃ DÁN LÊN DB (v1). Thiết kế phần tương tác của khách đã đổi
-- ngay sau đó (lời chúc → chấm điểm ẩn danh) — thay đổi đó nằm ở migration
-- `20260829010000_showcase_ratings.sql`, KHÔNG sửa vào file này.
--
-- Bối cảnh: buổi lễ cuối khóa, phụ huynh đến xem con thuyết trình. Giáo viên bật
-- một link (kèm QR chiếu lên TV), phụ huynh mở trên điện thoại là xem được sản
-- phẩm của TẤT CẢ các em, chuyển qua lại giữa từng bạn, thả tim và gửi lời chúc.
--
-- Vì sao đi qua RPC SECURITY DEFINER chứ không mở policy cho `anon`:
--   1. Quyền truy cập ở đây KHÔNG phải "là ai" mà là "có token còn hạn không" —
--      RLS không nhìn thấy token trên URL, chỉ hàm nhận tham số mới thấy.
--   2. Mở policy anon cho `projects`/`profiles` là mở cho TOÀN BỘ dữ liệu bảng
--      đó rồi lọc bằng điều kiện — sai một dấu là lộ sạch. Hàm chỉ trả về đúng
--      những cột đã liệt kê, cột mới thêm sau này KHÔNG tự động lọt ra ngoài.
--   3. Route public trong Next.js vì vậy chỉ cần anon key, KHÔNG đụng
--      service-role (đúng luật kiến trúc của dự án).
--
-- KHÔNG BAO GIỜ trả ra ngoài: username, link Drive nộp bài
-- (`student_drive_links`), nhận xét/xếp loại học lực của giáo viên, dữ liệu lớp
-- khác. Trang này chỉ có: tên em, sản phẩm em khai, ảnh em dán, bình luận của
-- bạn cùng lớp.

-- ---------------------------------------------------------------------------
-- 1. Ảnh sản phẩm — LINK NGOÀI, không dùng Supabase Storage
-- ---------------------------------------------------------------------------
-- User chốt 2026-08-29: học viên tự upload ảnh lên trang host ảnh miễn phí
-- (postimages, imgbb... không cần tài khoản) rồi dán link vào. Đổi lại chi phí
-- Storage = 0 và KHÔNG có file mồ côi phải dọn — điểm đau cố hữu của dự án này
-- (xem Gotcha 1 ở DATABASE.md). Bù lại link ngoài có thể chết; chỗ render phải
-- chịu được ảnh hỏng.

-- CHECK không cho subquery → bọc "mọi phần tử đều là http(s)" vào hàm IMMUTABLE,
-- cùng khuôn với `public.max_text_length` của migration 20260731020000.
create or replace function public.all_http_urls(arr text[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(x ~ '^https?://'), true) from unnest(arr) as x;
$$;

alter table public.projects
  add column if not exists image_urls text[] not null default '{}';

alter table public.projects
  add constraint projects_image_urls_within_limits
  check (
    coalesce(array_length(image_urls, 1), 0) <= 6
    and public.max_text_length(image_urls) <= 500
    and public.all_http_urls(image_urls)
  );

-- ---------------------------------------------------------------------------
-- 2. Link triển lãm của lớp
-- ---------------------------------------------------------------------------
create table public.class_showcases (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null unique references public.classes (id) on delete cascade,
  -- Token nằm trên URL nên phải đoán KHÔNG RA: sinh từ crypto ở tầng app, 22+
  -- ký tự base64url. CHECK ở đây chỉ chặn token rác/ngắn lọt vào DB.
  token text not null unique,
  is_enabled boolean not null default true,
  -- null = không hết hạn. Mặc định của app là 7 ngày kể từ lúc bật.
  expires_at timestamptz,
  intro text,
  allow_messages boolean not null default true,
  allow_reactions boolean not null default true,
  -- Em nào không muốn công khai (hoặc chưa xong) thì giáo viên bỏ tick — mảng id
  -- gọn hơn một bảng nối cho danh sách vài chục em.
  hidden_student_ids uuid[] not null default '{}',
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_showcases_token_shape check (token ~ '^[A-Za-z0-9_-]{16,64}$'),
  constraint class_showcases_intro_within_limits
    check (intro is null or length(intro) <= 500)
);

alter table public.class_showcases enable row level security;

-- Chỉ giáo viên của lớp đụng được. Khách vãng lai KHÔNG có policy nào — họ đi
-- qua RPC bên dưới.
create policy "class_showcases_teacher_all" on public.class_showcases for all
  using (public.is_teacher_of_class(class_id))
  with check (public.is_teacher_of_class(class_id));

-- ---------------------------------------------------------------------------
-- 3. Lời chúc của khách (phụ huynh)
-- ---------------------------------------------------------------------------
create table public.showcase_messages (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.class_showcases (id) on delete cascade,
  -- null = lời chúc cho CẢ LỚP, khác null = gửi riêng một em.
  project_id uuid references public.projects (id) on delete cascade,
  guest_name text not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint showcase_messages_name_within_limits
    check (length(btrim(guest_name)) between 1 and 50),
  constraint showcase_messages_content_within_limits
    check (length(btrim(content)) between 1 and 500)
);

create index showcase_messages_showcase_idx
  on public.showcase_messages (showcase_id, created_at);

alter table public.showcase_messages enable row level security;

-- Giáo viên đọc và XÓA được (kiểm duyệt sau — user chốt: lời chúc hiện ngay cho
-- liền mạch buổi lễ). Không ai INSERT trực tiếp: khách đi qua
-- `add_showcase_message`, hàm đó mới kiểm token + chống spam.
create policy "showcase_messages_teacher_select" on public.showcase_messages for select
  using (
    exists (
      select 1 from public.class_showcases s
      where s.id = showcase_messages.showcase_id
        and public.is_teacher_of_class(s.class_id)
    )
  );

create policy "showcase_messages_teacher_delete" on public.showcase_messages for delete
  using (
    exists (
      select 1 from public.class_showcases s
      where s.id = showcase_messages.showcase_id
        and public.is_teacher_of_class(s.class_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Thả tim
-- ---------------------------------------------------------------------------
-- `visitor_id` là chuỗi ngẫu nhiên trình duyệt tự sinh và giữ trong
-- localStorage — KHÔNG định danh được ai, chỉ để một máy không bấm tim 100 lần
-- và để bấm lần nữa là bỏ tim.
create table public.showcase_reactions (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.class_showcases (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  unique (project_id, visitor_id),
  constraint showcase_reactions_visitor_shape
    check (visitor_id ~ '^[A-Za-z0-9_-]{8,64}$')
);

alter table public.showcase_reactions enable row level security;

create policy "showcase_reactions_teacher_select" on public.showcase_reactions for select
  using (
    exists (
      select 1 from public.class_showcases s
      where s.id = showcase_reactions.showcase_id
        and public.is_teacher_of_class(s.class_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. RPC cho khách vãng lai
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
    select s.id, s.class_id, s.intro, s.allow_messages, s.allow_reactions,
           s.hidden_student_ids, s.expires_at,
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
    'allow_messages', sc.allow_messages,
    'allow_reactions', sc.allow_reactions,
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
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'project_id', m.project_id,
          'guest_name', m.guest_name,
          'content', m.content,
          'created_at', m.created_at
        ) order by m.created_at desc
      )
      from public.showcase_messages m
      where m.showcase_id = sc.id
    ), '[]'::jsonb)
  )
  from sc;
$$;

-- Đếm lượt mở trang. Tách khỏi `get_showcase` để hàm kia giữ được `stable` và để
-- app chỉ đếm MỘT lần mỗi trình duyệt (mỗi lần F5 cộng thêm 1 thì con số vô nghĩa).
create or replace function public.bump_showcase_view(p_token text)
returns void
language sql
security definer
set search_path = public
volatile
as $$
  update public.class_showcases
  set view_count = view_count + 1
  where token = p_token
    and is_enabled
    and (expires_at is null or expires_at > now());
$$;

-- Gửi lời chúc. Ném exception tiếng Việt để Server Action hiện thẳng cho khách.
create or replace function public.add_showcase_message(
  p_token text,
  p_project_id uuid,
  p_guest_name text,
  p_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_showcase public.class_showcases%rowtype;
  v_row public.showcase_messages%rowtype;
  v_name text := btrim(coalesce(p_guest_name, ''));
  v_content text := btrim(coalesce(p_content, ''));
  v_recent int;
  v_total int;
begin
  select * into v_showcase
  from public.class_showcases
  where token = p_token
    and is_enabled
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'Link này không còn hiệu lực.';
  end if;
  if not v_showcase.allow_messages then
    raise exception 'Giáo viên đã tắt phần lời chúc.';
  end if;
  if v_name = '' or v_content = '' then
    raise exception 'Vui lòng nhập tên và lời chúc.';
  end if;
  if length(v_name) > 50 or length(v_content) > 500 then
    raise exception 'Tên tối đa 50 ký tự, lời chúc tối đa 500 ký tự.';
  end if;

  -- Chống spam Ở TẦNG DB, vì ai cũng gọi được hàm này: giới hạn theo phút và
  -- theo tổng số. Không dùng IP (Supabase không đưa IP xuống hàm) nên đây là
  -- hàng rào cho lớp, không phải cho từng người.
  select count(*) into v_recent
  from public.showcase_messages
  where showcase_id = v_showcase.id and created_at > now() - interval '1 minute';
  if v_recent >= 30 then
    raise exception 'Đang có quá nhiều lời chúc cùng lúc — thử lại sau một phút nhé.';
  end if;

  select count(*) into v_total
  from public.showcase_messages
  where showcase_id = v_showcase.id;
  if v_total >= 500 then
    raise exception 'Trang đã nhận đủ 500 lời chúc.';
  end if;

  -- Gửi riêng một em thì em đó phải thuộc đúng lớp này (chặn dán id lớp khác).
  if p_project_id is not null then
    if not exists (
      select 1 from public.projects
      where id = p_project_id and class_id = v_showcase.class_id
    ) then
      raise exception 'Không tìm thấy sản phẩm này.';
    end if;
  end if;

  insert into public.showcase_messages (showcase_id, project_id, guest_name, content)
  values (v_showcase.id, p_project_id, v_name, v_content)
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'project_id', v_row.project_id,
    'guest_name', v_row.guest_name,
    'content', v_row.content,
    'created_at', v_row.created_at
  );
end;
$$;

-- Thả tim / bỏ tim. Trả về số tim mới + trạng thái để giao diện cập nhật ngay.
create or replace function public.toggle_showcase_reaction(
  p_token text,
  p_project_id uuid,
  p_visitor_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_showcase public.class_showcases%rowtype;
  v_deleted int;
  v_reacted boolean;
begin
  select * into v_showcase
  from public.class_showcases
  where token = p_token
    and is_enabled
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'Link này không còn hiệu lực.';
  end if;
  if not v_showcase.allow_reactions then
    raise exception 'Giáo viên đã tắt phần thả tim.';
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

  delete from public.showcase_reactions
  where project_id = p_project_id and visitor_id = p_visitor_id;
  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    insert into public.showcase_reactions (showcase_id, project_id, visitor_id)
    values (v_showcase.id, p_project_id, p_visitor_id);
    v_reacted := true;
  else
    v_reacted := false;
  end if;

  return jsonb_build_object(
    'reacted', v_reacted,
    'count', (
      select count(*) from public.showcase_reactions
      where project_id = p_project_id and showcase_id = v_showcase.id
    )
  );
end;
$$;

grant execute on function public.get_showcase(text) to anon, authenticated;
grant execute on function public.bump_showcase_view(text) to anon, authenticated;
grant execute on function public.add_showcase_message(text, uuid, text, text) to anon, authenticated;
grant execute on function public.toggle_showcase_reaction(text, uuid, text) to anon, authenticated;
