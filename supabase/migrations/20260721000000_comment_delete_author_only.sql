-- Chỉ CHỦ nhận xét mới xóa được nhận xét của mình (yêu cầu 2026-07-18):
-- bỏ quyền moderation "GV của lớp xóa được comment bất kỳ" của policy gốc.
-- Áp được NGAY (trước deploy): UI moderation cũ chỉ bị xóa hụt (RLS chặn,
-- không lỗi), không vỡ gì.

drop policy if exists "project_comments_delete" on public.project_comments;

create policy "project_comments_delete_own" on public.project_comments for delete
  using (author_id = auth.uid());
