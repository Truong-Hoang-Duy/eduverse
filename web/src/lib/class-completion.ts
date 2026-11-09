// Lớp "đã hoàn thành" — SUY RA từ dữ liệu nhận xét, KHÔNG lưu cột trạng thái.
//
// Vì sao suy ra thay vì thêm cột `classes.status`: trạng thái này chỉ là hệ quả
// của việc nhận xét xong buổi cuối (hoặc buổi cuối do giáo viên khác dạy thay).
// Lưu thành cột thì phải có trigger/hành động đặt cờ, và cờ đó lệch ngay khi GV
// thêm học viên mới hay sửa nhận xét buổi cuối. Suy ra thì luôn khớp dữ liệu thật.

export interface ClassCompletionInput {
  /** Sĩ số hiện tại của lớp (`enrollments`). */
  studentCount: number;
  /** Số học viên đã XỬ LÝ XONG ở buổi cuối — `isHandled` (đã nhận xét HOẶC
   *  đã đánh vắng), cùng thước đo với bộ đếm "X/Y" ở trang buổi học. */
  handledCount: number;
  /** Buổi cuối có người dạy thay hay không (nếu dạy thay thì tính là hoàn thành). */
  isSubstitute?: boolean;
}

/**
 * Lớp xong khi buổi CUỐI (buổi thứ `total_sessions`) đã xử lý hết học viên
 * HOẶC buổi cuối do giáo viên khác dạy thay.
 *
 * Lớp chưa có học viên nào KHÔNG tính là hoàn thành — lớp trống mà hiện "đã
 * hoàn thành" thì vô nghĩa, và nó sẽ biến mất khỏi danh sách đang học ngay khi
 * vừa mở lớp.
 */
export function isClassCompleted({
  studentCount,
  handledCount,
  isSubstitute = false,
}: ClassCompletionInput): boolean {
  if (studentCount <= 0) return false;
  if (isSubstitute) return true;
  return handledCount >= studentCount;
}
