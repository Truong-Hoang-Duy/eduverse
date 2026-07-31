-- Ép giới hạn nhập liệu sản phẩm + bình luận Ở TẦNG DB.
--
-- Cùng lớp lỗi với sự cố XSS `drive_url` (migration `20260731010000`): giới hạn
-- chỉ được kiểm trong Server Action `saveProject`/`addComment`, nhưng RLS cho học
-- viên GHI THẲNG dòng của mình qua REST API, bỏ qua action.
--
-- Đã kiểm chứng 2026-07-30 — DB nhận hết:
--   name 5.000 ký tự (giới hạn 100), mô tả 200.000 (giới hạn 1.000),
--   500 chức năng mỗi cái 300+ ký tự (giới hạn 15 × 80),
--   bình luận 500.000 ký tự (trước đây KHÔNG có giới hạn nào).
-- Hậu quả: MỘT học viên làm vỡ trang gallery của cả lớp và của giáo viên (trang
-- tải mọi sản phẩm trong lớp), kể cả màn chiếu TV.
--
-- Con số phải KHỚP `web/src/lib/project-limits.ts` — sửa một bên nhớ sửa bên kia.
--
-- An toàn với dữ liệu đang có: đã đo trước khi viết — 1 project (name 24, mô tả
-- 276, 7 chức năng, chức năng dài nhất 55) và 0 bình luận.

-- CHECK constraint KHÔNG cho phép subquery, nên phải bọc phép "phần tử dài nhất"
-- vào một hàm IMMUTABLE rồi gọi trong CHECK.
create or replace function public.max_text_length(arr text[])
returns int
language sql
immutable
as $$
  select coalesce(max(length(x)), 0) from unnest(arr) as x;
$$;

alter table public.projects
  add constraint projects_name_within_limits
  check (length(btrim(name)) between 1 and 100);

alter table public.projects
  add constraint projects_description_within_limits
  check (description is null or length(description) <= 1000);

alter table public.projects
  add constraint projects_extra_notes_within_limits
  check (extra_notes is null or length(extra_notes) <= 1000);

alter table public.projects
  add constraint projects_features_within_limits
  check (
    coalesce(array_length(features, 1), 0) <= 15
    and public.max_text_length(features) <= 80
  );

-- Đồng thời khép lại nốt đường XSS cho 2 link còn lại của sản phẩm: bản vá trước
-- chỉ chặn ở chỗ render (`isSafeHttpUrl`), giờ DB cũng không nhận.
alter table public.projects
  add constraint projects_repo_url_is_http
  check (repo_url is null or (repo_url ~ '^https?://' and length(repo_url) <= 500));

alter table public.projects
  add constraint projects_demo_url_is_http
  check (demo_url is null or (demo_url ~ '^https?://' and length(demo_url) <= 500));

alter table public.project_comments
  add constraint project_comments_content_within_limits
  check (length(btrim(content)) between 1 and 2000);
