-- Bộ combo nhận xét chia THÀNH 2 LOẠI tách bạch (yêu cầu user 2026-08-06): một
-- bộ giờ CHỈ được chứa điểm mạnh HOẶC chỉ chứa điểm cần cải thiện, không còn
-- pha trộn cả hai như trước.
--
-- Bộ combo hiện có (kể cả bộ mẫu do "Thêm nhanh bộ mẫu" tạo — tính năng này bị
-- gỡ luôn trong đợt này) đa số PHA TRỘN cả hai loại nên không migrate/tách tự
-- động được — user chốt XÓA SẠCH, tự tạo lại bộ mới theo luật 1-loại/bộ.
delete from public.review_combos;

-- Bảng vừa rỗng nên thêm NOT NULL không cần default/backfill.
alter table public.review_combos
  add column type text not null check (type in ('strength', 'improvement'));
