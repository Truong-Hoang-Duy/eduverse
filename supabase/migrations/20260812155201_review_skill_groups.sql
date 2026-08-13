-- Cho phép giáo viên tự thêm nhóm kỹ năng nhận xét (yêu cầu user 2026-08-12),
-- thay vì phải sửa CHECK constraint + skill-groups.ts mỗi lần muốn thêm nhóm
-- (đã tốn công 2 lần trước: 20260724000000, 20260725000000). 12 nhóm cố định
-- trong `web/src/lib/skill-groups.ts` VẪN LÀ NỀN dùng chung mọi giáo viên;
-- bảng này chỉ chứa nhóm TỰ THÊM, riêng theo từng giáo viên (cùng khuôn RLS
-- với review_combos/zalo_templates).
--
-- Bảng MỚI → an toàn dán TRƯỚC hay SAU deploy đều được. Drop CHECK constraint
-- là NỚI LỎNG tập giá trị hợp lệ (không đụng dữ liệu cũ) nên cũng an toàn dán
-- bất cứ lúc nào.

create table if not exists public.review_skill_groups (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, label)
);

create index if not exists review_skill_groups_teacher_id_idx
  on public.review_skill_groups (teacher_id);

alter table public.review_skill_groups enable row level security;

create policy "review_skill_groups_teacher_all" on public.review_skill_groups for all
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- review_options.skill_group giờ chấp nhận: 1 trong 12 giá trị cố định CŨ, HOẶC
-- id (uuid dạng text) của một dòng review_skill_groups mà giáo viên đó sở hữu.
-- Không thể diễn tả union đó bằng CHECK/FK trên một cột text đơn — validate
-- phần "custom" ở tầng Server Action (xem lib/actions/skill-groups.ts).
alter table public.review_options
  drop constraint if exists review_options_skill_group_check;
