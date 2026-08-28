-- Đợt cải tiến 2026-08-28: xếp loại học lực chuyển sang tích 1 lần theo LỚP
-- (thay vì chọn lại mỗi buổi), thêm cờ buổi "SPCK" (sản phẩm cuối khóa) song
-- song với is_periodic_test, và mở category/type cho danh mục + combo SPCK.
--
-- Toàn bộ là ADD (cột mới, nới CHECK) — dán TRƯỚC khi deploy code mới.

-- Xếp loại học lực giờ gắn với ENROLLMENT (mỗi lớp một mức, không phải mỗi
-- buổi) — cùng 4 giá trị với CHECK cũ của student_reviews.academic_level.
alter table public.enrollments
  add column if not exists academic_level text
    check (academic_level in ('gioi', 'kha', 'trung_binh', 'can_co_gang'));

-- Buổi "làm sản phẩm cuối khóa" (SPCK, thường buổi 9-13) — GV TỰ ĐÁNH DẤU,
-- không hardcode số buổi, cùng tinh thần với is_periodic_test.
alter table public.sessions
  add column if not exists is_project_period boolean not null default false;

-- Danh mục nhận xét: mở thêm category 'project_progress' cho ô "quan sát quá
-- trình làm SPCK" (Postgres không cho ALTER CHECK trực tiếp — drop rồi add lại).
alter table public.review_options
  drop constraint if exists review_options_category_check;
alter table public.review_options
  add constraint review_options_category_check
    check (category in ('strength', 'improvement', 'test_process', 'project_progress'));

-- Bộ combo nhận xét: thêm cột chứa nhãn SPCK (song song strengths/improvements
-- sẵn có) — một bộ giờ chứa ĐỦ CẢ BA, không chia loại nữa.
alter table public.review_combos
  add column if not exists project_notes text[] not null default '{}';

-- BỎ chia loại (yêu cầu user 2026-08-28, đảo ngược 20260806000000): mỗi bộ giờ
-- là một "chân dung học viên" điền cả 3 ô trong 1 lần bấm — vì ô tìm-tích tự do
-- đã bị gỡ, combo là đường DUY NHẤT để thêm điểm mạnh/cải thiện, mà chia loại
-- thì mỗi em phải áp 2-3 lần.
--
-- Ở đây CHỈ nới lỏng (drop CHECK + bỏ NOT NULL) để code cũ đang chạy production
-- vẫn đọc/ghi `type` bình thường trong lúc chờ deploy. Cột bị DROP hẳn ở
-- 20260828010000 (dán SAU deploy). KHÔNG xóa dòng nào: nhãn của bộ cũ nằm ở
-- strengths/improvements nên sang mô hình mới vẫn dùng được nguyên vẹn.
alter table public.review_combos
  drop constraint if exists review_combos_type_check;
alter table public.review_combos
  alter column type drop not null;
