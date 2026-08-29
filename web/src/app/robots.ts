import type { MetadataRoute } from "next";

/**
 * Trang triển lãm `/showcase/<token>` không đăng nhập vẫn xem được, nên phải nói
 * rõ với máy tìm kiếm là ĐỪNG lập chỉ mục: link chỉ dành cho phụ huynh trong lớp,
 * không phải nội dung công khai để tra Google ra tên các em.
 *
 * Đây là lớp phòng thủ phụ — lớp chính là thẻ `robots: noindex` ngay trong
 * `generateMetadata` của chính trang đó (file này chỉ ngăn con bot lịch sự).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: ["/showcase/"] }],
  };
}
