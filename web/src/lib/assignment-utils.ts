/**
 * Tiện ích hỗ trợ quản lý đề bài (assignments).
 */

/**
 * Tính số buổi gợi ý tiếp theo cho đề bài của khóa học:
 * - Ưu tiên lấp chỗ trống nhỏ nhất bắt đầu từ buổi 1 (ví dụ đã có buổi 1, 2, 4 -> gợi ý 3).
 * - Nếu không có chỗ trống, trả về số buổi lớn nhất + 1 (ví dụ đã có 1, 2, 3 -> gợi ý 4).
 * - Nếu chưa có đề bài nào -> gợi ý 1.
 */
export function getNextSessionNumber(existingSessions: number[]): number {
  if (!existingSessions || existingSessions.length === 0) return 1;

  const validSessions = existingSessions.filter(
    (s) => typeof s === "number" && Number.isInteger(s) && s > 0
  );
  if (validSessions.length === 0) return 1;

  const set = new Set(validSessions);
  const max = Math.max(...validSessions);

  for (let i = 1; i <= max; i++) {
    if (!set.has(i)) return i;
  }

  return max + 1;
}

/**
 * Tự động tạo tiêu đề đề bài từ tên file upload:
 * - Cắt bỏ phần mở rộng đuôi file (.pdf, .docx, .txt, .md, ...)
 * - Thay thế các ký tự gạch dưới '_' bằng khoảng trắng
 * - Chuẩn hóa các khoảng trắng liên tiếp và cắt tỉa 2 đầu (trim)
 */
export function formatTitleFromFileName(fileName: string): string {
  if (!fileName || typeof fileName !== "string") return "";

  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  const rawName = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;

  return rawName.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Rút gọn đường dẫn Storage thành tên file hiển thị sạch đẹp
 * (loại bỏ thư mục cha và tiền tố timestamp / att-).
 */
export function getDisplayFileName(path: string): string {
  if (!path || typeof path !== "string") return "";
  const raw = path.split("/").pop() ?? path;
  const parts = raw.split("-");
  if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
    if (parts[1] === "att" && parts.length >= 3) {
      return parts.slice(2).join("-");
    }
    return parts.slice(1).join("-");
  }
  return raw;
}
