/**
 * Link triển lãm sản phẩm cuối khóa gửi PHỤ HUYNH — logic thuần, không đụng DB.
 *
 * Quyền vào trang nằm ở CHÍNH cái token trên URL (phụ huynh không có tài khoản),
 * nên token phải đoán không ra và phải có đường thu hồi: tắt, đổi token, hoặc để
 * tự hết hạn. Mặc định 7 ngày — đủ cho buổi lễ và vài ngày xem lại, rồi tự chết
 * mà giáo viên không phải nhớ tắt.
 */

/** Khớp CHECK ở DB (mig 20260829000000). */
export const SHOWCASE_INTRO_MAX = 500;
export const SHOWCASE_COMMENT_MAX = 500;

/** Thang sao của một tiêu chí chấm. */
export const RATING_MAX = 5;

/** Số byte ngẫu nhiên của token — 16 byte ≈ 22 ký tự base64url, đủ để không dò. */
const TOKEN_BYTES = 16;

/** Khớp CHECK `class_showcases_token_shape`. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * Ba tiêu chí phụ huynh chấm cho từng em. Thứ tự ở đây là thứ tự hiện trên form
 * và trong bảng tổng hợp của giáo viên — sửa ở đây là đổi cả hai nơi.
 *
 * Tiêu chí nào cũng ĐƯỢC BỎ TRỐNG: có phụ huynh chỉ kịp xem sản phẩm mà không
 * nghe được phần thuyết trình, ép chấm đủ 3 thì họ sẽ chấm bừa.
 */
export const RATING_CRITERIA = [
  { key: "product", label: "Sản phẩm", hint: "Bài làm hoàn chỉnh, chạy được" },
  { key: "presentation", label: "Thuyết trình", hint: "Tự tin, trình bày dễ hiểu" },
  { key: "creativity", label: "Sáng tạo", hint: "Ý tưởng riêng, thú vị" },
] as const;

export type RatingCriterion = (typeof RATING_CRITERIA)[number]["key"];

export type ExpiryPreset = "1" | "7" | "30" | "none";

export const EXPIRY_PRESETS: { value: ExpiryPreset; label: string }[] = [
  { value: "1", label: "1 ngày" },
  { value: "7", label: "7 ngày (mặc định)" },
  { value: "30", label: "30 ngày" },
  { value: "none", label: "Không hết hạn" },
];

export const DEFAULT_EXPIRY_PRESET: ExpiryPreset = "7";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Token ngẫu nhiên cho URL: base64url, không có ký tự phải encode. */
export function generateShowcaseToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Chuỗi trên URL có đúng hình dạng token không — chặn truy vấn rác trước khi gọi DB. */
export function isShowcaseToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

/** Mốc hết hạn ứng với lựa chọn của giáo viên; `none` = không hết hạn (null). */
export function expiryFromPreset(
  preset: ExpiryPreset,
  now: Date = new Date()
): string | null {
  if (preset === "none") return null;
  return new Date(now.getTime() + Number(preset) * MS_PER_DAY).toISOString();
}

export function isShowcaseExpired(
  expiresAt: string | null,
  now: Date = new Date()
): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= now.getTime();
}

export type ShowcaseStatus = "off" | "expired" | "live";

export function showcaseStatus(
  showcase: { is_enabled: boolean; expires_at: string | null } | null,
  now: Date = new Date()
): ShowcaseStatus {
  if (!showcase || !showcase.is_enabled) return "off";
  return isShowcaseExpired(showcase.expires_at, now) ? "expired" : "live";
}

/** "còn 6 ngày" / "còn 5 giờ" / "không hết hạn" — chữ hiện cạnh nút bật/tắt. */
export function formatRemaining(
  expiresAt: string | null,
  now: Date = new Date()
): string {
  if (!expiresAt) return "không hết hạn";
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return "đã hết hạn";

  const days = Math.floor(ms / MS_PER_DAY);
  if (days >= 1) return `còn ${days} ngày`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `còn ${hours} giờ`;
  return `còn ${Math.max(Math.floor(ms / 60000), 1)} phút`;
}

/** Đường dẫn trang công khai. Ghép với origin ở nơi gọi (server không đoán domain). */
export function showcasePath(token: string): string {
  return `/showcase/${token}`;
}

/* -------------------------------------------------------------------------
 * Hình dạng dữ liệu RPC `get_showcase` trả về.
 * Hàm SQL dựng jsonb bằng tay nên KHÔNG có type sinh tự động — sửa danh sách
 * cột trong migration thì phải sửa cả mấy interface dưới đây.
 * ---------------------------------------------------------------------- */

/** Nhận xét của BẠN CÙNG LỚP (có tên) — khác `guest_notes` là ẩn danh. */
export interface ShowcaseComment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

/** Nhận xét của khách — ẨN DANH, không kèm bất cứ thứ gì nhận diện người viết. */
export interface ShowcaseGuestNote {
  id: string;
  comment: string;
  created_at: string;
}

/** Điểm trung bình từng tiêu chí; null khi chưa ai chấm tiêu chí đó. */
export type ShowcaseRatingAvg = Record<RatingCriterion, number | null>;

export interface ShowcaseProject {
  id: string;
  author_name: string;
  name: string;
  description: string | null;
  features: string[];
  image_urls: string[];
  repo_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
  updated_at: string;
  reaction_count: number;
  /** Số lượt CÓ CHẤM ĐIỂM (nhận xét suông không tính). Luôn hiện. */
  rating_count: number;
  /** null khi giáo viên chưa bật `show_rating_results` — xem DECISIONS.md. */
  rating_avg: ShowcaseRatingAvg | null;
  guest_notes: ShowcaseGuestNote[];
  comments: ShowcaseComment[];
}

export interface ShowcasePayload {
  class_code: string;
  class_description: string | null;
  course_code: string;
  course_name: string;
  teacher_name: string;
  intro: string | null;
  allow_ratings: boolean;
  allow_reactions: boolean;
  show_rating_results: boolean;
  expires_at: string | null;
  projects: ShowcaseProject[];
}

/** Bài chấm của chính máy đang xem (đọc bằng `get_my_showcase_ratings`). */
export interface MyRating {
  id: string;
  project_id: string;
  score_product: number | null;
  score_presentation: number | null;
  score_creativity: number | null;
  comment: string | null;
  created_at: string;
}

/** Điểm chung = trung bình các tiêu chí ĐÃ có điểm; null nếu chưa có tiêu chí nào. */
export function overallScore(avg: ShowcaseRatingAvg | null): number | null {
  if (!avg) return null;
  const values = RATING_CRITERIA.map((c) => avg[c.key]).filter(
    (v): v is number => typeof v === "number"
  );
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(mean * 10) / 10;
}

/** Đã chấm em này chưa — dùng cho dấu ✓ trên thẻ và thanh tiến độ. */
export function hasRated(rating: MyRating | undefined): boolean {
  if (!rating) return false;
  return (
    rating.score_product !== null ||
    rating.score_presentation !== null ||
    rating.score_creativity !== null ||
    Boolean(rating.comment)
  );
}

/** Bỏ dấu tiếng Việt để ô tìm tên gõ "an" ra được "Ánh", "Ân". */
export function normalizeVi(value: string): string {
  return value
    .normalize("NFD")
    // Dải dấu thanh/dấu phụ tổ hợp — viết bằng mã \u để đọc file nào cũng đúng.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
