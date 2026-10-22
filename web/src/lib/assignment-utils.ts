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
