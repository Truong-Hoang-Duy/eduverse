-- Buổi 5/9 (đôi khi 14) có kiểm tra định kỳ (yêu cầu user 2026-08-05): nhận
-- xét gửi phụ huynh phải tách rõ 2 phần — quá trình học tập / kết quả kiểm
-- tra — thay vì viết chung một đoạn. GV tự đánh dấu buổi nào có kiểm tra
-- (KHÔNG cứng theo số buổi: buổi 14 tùy lớp có thể là thuyết trình sản phẩm
-- thay vì kiểm tra).
alter table public.sessions
  add column if not exists is_periodic_test boolean not null default false;

-- Danh mục "quá trình làm bài kiểm tra" tái dùng bảng review_options — thêm
-- category mới, đổi CHECK (Postgres không cho ALTER CHECK trực tiếp).
-- 'advice' được bỏ khỏi danh sách hợp lệ: category này CHƯA TỪNG được ứng
-- dụng tạo dòng nào (per-student advice cũ dùng cột riêng student_reviews.advice,
-- đã DROP ở `20260805000000`) — an toàn xóa khỏi CHECK.
alter table public.review_options
  drop constraint if exists review_options_category_check;
alter table public.review_options
  add constraint review_options_category_check
    check (category in ('strength', 'improvement', 'test_process'));
