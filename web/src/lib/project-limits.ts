/**
 * Nguồn duy nhất cho giới hạn nhập liệu sản phẩm cuối khóa.
 *
 * Dùng ở 3 nơi và phải KHỚP cả 3: client (chặn UX), Server Action (thông báo lỗi
 * tử tế), và **CHECK constraint ở DB** (migration `20260731020000` — thẩm quyền
 * THẬT, vì RLS cho học viên ghi thẳng dòng của mình qua API, bỏ qua action).
 * Sửa số ở đây thì phải tạo migration đổi constraint theo.
 */
export const PROJECT_NAME_MAX = 100;
export const PROJECT_TEXT_MAX = 1000;
export const PROJECT_FEATURES_MAX = 15;
export const PROJECT_FEATURE_MAX = 80;

/** Bình luận sản phẩm — trước 2026-07-30 KHÔNG có giới hạn nào ở đâu cả. */
export const PROJECT_COMMENT_MAX = 2000;

/**
 * Ảnh sản phẩm — LINK NGOÀI do học viên dán (không dùng Storage). Khớp CHECK
 * `projects_image_urls_within_limits` (mig `20260829000000`); độ dài mỗi link
 * nằm ở `IMAGE_URL_MAX` trong `lib/image-url.ts`.
 */
export const PROJECT_IMAGES_MAX = 6;
