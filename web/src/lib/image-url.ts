/**
 * Link ảnh sản phẩm cuối khóa — học viên tự upload lên trang host ảnh miễn phí
 * rồi DÁN LINK vào (user chốt 2026-08-29). Không dùng Supabase Storage: chi phí
 * lưu trữ = 0 và không có file mồ côi phải dọn.
 *
 * Đánh đổi: link ngoài có thể chết bất cứ lúc nào, nên mọi chỗ render phải chịu
 * được ảnh hỏng (`onError` ẩn thẻ đi), và học viên có thể dán nhầm link TRANG
 * chứa ảnh thay vì link ẢNH — hàm `imageUrlWarning` cảnh báo chuyện đó nhưng
 * KHÔNG chặn, vì nhiều host trả link không có đuôi file mà vẫn là ảnh thật.
 */

/** Khớp CHECK `projects_image_urls_within_limits` (mig 20260829000000). */
export const IMAGE_URL_MAX = 500;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp", ".svg"];

/** Host đã biết là trả về TRANG xem ảnh chứ không phải file ảnh. */
const PAGE_NOT_IMAGE_HOSTS = ["imgur.com", "postimages.org", "ibb.co", "flickr.com"];

/** Lý do link ảnh không dùng được, null nếu OK. Chặn thật, không phải cảnh báo. */
export function imageUrlError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Chưa nhập link ảnh.";
  if (value.length > IMAGE_URL_MAX) {
    return `Link ảnh quá dài (tối đa ${IMAGE_URL_MAX} ký tự).`;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Link ảnh không hợp lệ — hãy dán đầy đủ, bắt đầu bằng https://";
  }
  // Chỉ http(s): chặn `javascript:`/`data:` dán vào rồi biến thành thẻ img.
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Link ảnh phải bắt đầu bằng https://";
  }
  return null;
}

/**
 * Cảnh báo (KHÔNG chặn) khi link trông không phải ảnh trực tiếp.
 *
 * Google Drive được nêu đích danh: dự án đã nghiên cứu và BỎ hướng nhúng ảnh từ
 * Drive (`uc?export=view` bị Google siết, link `googleusercontent` không có tài
 * liệu chính thức) — dán link Drive vào đây gần như chắc chắn ra ảnh vỡ.
 */
export function imageUrlWarning(raw: string): string | null {
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host.endsWith("google.com") || host.endsWith("googleusercontent.com")) {
    return "Link Google Drive thường không hiện được thành ảnh. Hãy upload ảnh lên một trang host ảnh (xem tab Hướng dẫn) rồi dán link ảnh trực tiếp.";
  }

  const path = url.pathname.toLowerCase();
  const looksDirect = IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext));
  if (looksDirect) return null;

  if (PAGE_NOT_IMAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return "Đây có vẻ là link TRANG xem ảnh. Hãy bấm chuột phải vào ảnh → \"Sao chép địa chỉ hình ảnh\" rồi dán lại.";
  }
  return "Link này không kết thúc bằng .jpg/.png... — nếu ảnh không hiện ở khung xem trước thì hãy lấy link ảnh trực tiếp.";
}
