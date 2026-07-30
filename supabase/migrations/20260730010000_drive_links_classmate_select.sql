-- Bạn CÙNG LỚP được xem link Drive của nhau (user chốt 2026-07-30, sau khi
-- migration 20260730000000 chỉ cho giáo viên xem).
--
-- Lý do đổi: học viên cần mở thư mục của bạn để kiểm tra và đánh giá sản phẩm
-- cuối khóa của nhau — cùng mục đích với việc bạn cùng lớp đọc được profile và
-- bình luận sản phẩm của nhau.
--
-- Phạm vi nới CHÍNH XÁC tới đâu:
--   ✅ bạn học CÙNG một lớp với chủ link  → ĐỌC được
--   ❌ học viên lớp khác                   → không
--   ❌ mọi người                            → không
--   ❌ GHI/SỬA/XÓA của người khác          → không (policy này chỉ SELECT)
--
-- `is_enrolled` là SECURITY DEFINER nên subquery không bị RLS của `enrollments`
-- chặn (cùng khuôn với nhánh "bạn cùng lớp" trong policy `profiles_select`).

create policy "drive_links_classmate_select" on public.student_drive_links for select
  using (
    exists (
      select 1 from public.enrollments e
      where e.student_id = student_drive_links.student_id
        and public.is_enrolled(e.class_id)
    )
  );
