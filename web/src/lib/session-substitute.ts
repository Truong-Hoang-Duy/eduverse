/**
 * Helper xử lý trạng thái giáo viên nghỉ dạy và có thầy (cô) khác dạy thay (Substitute Teacher).
 *
 * Nghiệp vụ:
 * 1. Buổi học được tính là ĐÃ HOÀN THÀNH (completed) trong danh sách buổi học của lớp và tiến độ lớp.
 * 2. Loại trừ buổi học này khỏi dữ liệu nhận xét (không đưa vào prior comments chống lặp cho AI,
 *    không đưa vào copy nhận xét, không đưa vào tổng hợp học bạ / đánh giá năng lực cuối khóa).
 *
 * Cơ chế lưu trữ:
 * - Ưu tiên cột `sessions.is_substitute`.
 * - Tự động dự phòng (graceful fallback) qua thẻ `[SUBSTITUTE_TEACHER]` trong `sessions.review_context`
 *   để hoạt động trơn tru ngay cả khi cơ sở dữ liệu Supabase chưa chạy file migration.
 */

export const SUBSTITUTE_MARKER = "[SUBSTITUTE_TEACHER]";

export interface SubstituteCheckableSession {
  is_substitute?: boolean | null;
  review_context?: string | null;
}

/**
 * Kiểm tra xem buổi học có được đánh dấu là có người dạy thay hay không.
 */
export function isSubstituteSession(
  session?: SubstituteCheckableSession | null
): boolean {
  if (!session) return false;
  if (Boolean(session.is_substitute)) return true;
  if (
    typeof session.review_context === "string" &&
    session.review_context.includes(SUBSTITUTE_MARKER)
  ) {
    return true;
  }
  return false;
}

/**
 * Thêm thẻ đánh dấu dạy thay vào bối cảnh buổi học (dùng cho cơ chế dự phòng).
 */
export function addSubstituteMarker(context?: string | null): string {
  const trimmed = (context ?? "").trim();
  if (trimmed.includes(SUBSTITUTE_MARKER)) return trimmed;
  return trimmed ? `${trimmed}\n${SUBSTITUTE_MARKER}` : SUBSTITUTE_MARKER;
}

/**
 * Gỡ bỏ thẻ đánh dấu dạy thay khỏi bối cảnh buổi học.
 */
export function removeSubstituteMarker(context?: string | null): string | null {
  if (!context) return null;
  const cleaned = context
    .replace(SUBSTITUTE_MARKER, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
  return cleaned || null;
}

/**
 * Làm sạch nội dung bối cảnh buổi học khi hiển thị cho người dùng (ẩn thẻ kỹ thuật).
 */
export function cleanContextForDisplay(context?: string | null): string {
  if (!context) return "";
  return context
    .replace(SUBSTITUTE_MARKER, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}
