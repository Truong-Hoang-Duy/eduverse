-- Nhận xét học viên: thay "Lời khuyên" per-student bằng "Bối cảnh buổi học"
-- cấp BUỔI (yêu cầu user 2026-08-05) — GV gõ 1 lần/buổi thay vì gõ lại cho
-- từng em, dùng làm ngữ cảnh khi AI viết nhận xét (KHÔNG hiện cho phụ huynh,
-- khác với `sessions.content` vốn có đi vào tin Zalo).
--
-- DROP trước, ADD sau trong CÙNG file vẫn an toàn: hai cột độc lập nhau, không
-- có ràng buộc/trigger nào phụ thuộc `student_reviews.advice`.
--
-- advice bị xóa hẳn (không chỉ ngừng ghi) — không còn ô nhập nào tạo giá trị
-- mới, và mọi nơi đọc nó (trang lịch sử HV, tổng hợp AI, review-status) đã gỡ
-- cùng migration này. Mất dữ liệu lời khuyên cũ (nếu có) là CỐ Ý, user đã chốt.
alter table public.student_reviews
  drop column if exists advice;

alter table public.sessions
  add column if not exists review_context text;
