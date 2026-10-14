/**
 * Định nghĩa và helper cho các hình thức buổi học (Session Format).
 *
 * Eduverse hỗ trợ 4 hình thức buổi học:
 * 1. `standard`: Buổi học tiêu chuẩn (học lý thuyết, bài tập).
 * 2. `periodic_test`: Bài kiểm tra (kiểm tra định kỳ giữa khóa hoặc bài thi cuối khóa).
 * 3. `project_period`: Giai đoạn làm sản phẩm cuối khóa / SPCK (thường B9-13).
 * 4. `final_presentation`: Buổi thuyết trình sản phẩm cuối khóa (Demo Day / B14).
 */

export type SessionFormat =
  | "standard"
  | "periodic_test"
  | "project_period"
  | "final_presentation";

export interface SessionFormatConfig {
  id: SessionFormat;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  detailHint: string;
  iconName: "book-open" | "file-check" | "laptop" | "mic";
}

export const SESSION_FORMATS: Record<SessionFormat, SessionFormatConfig> = {
  standard: {
    id: "standard",
    label: "Buổi học tiêu chuẩn",
    shortLabel: "Tiêu chuẩn",
    tagline: "Lý thuyết & bài tập thực hành",
    description: "Học kiến thức mới và thực hành bài tập thông thường.",
    detailHint:
      "Giao diện nhận xét tiêu chuẩn gồm: Điểm mạnh, Cần cải thiện và lời nhận xét chi tiết.",
    iconName: "book-open",
  },
  periodic_test: {
    id: "periodic_test",
    label: "Bài kiểm tra",
    shortLabel: "Bài kiểm tra",
    tagline: "Định kỳ hoặc thi cuối khóa",
    description:
      "Kiểm tra định kỳ giữa khóa hoặc thi cuối khóa (dành cho lớp không thuyết trình).",
    detailHint:
      "Nhận xét AI sẽ tự động tách rõ 2 phần: Quá trình học tập & Kết quả bài kiểm tra (kèm ô quan sát làm bài).",
    iconName: "file-check",
  },
  project_period: {
    id: "project_period",
    label: "Làm đồ án (SPCK)",
    shortLabel: "Làm đồ án",
    tagline: "Giai đoạn thực hiện sản phẩm",
    description: "Thường dùng cho các buổi 9–13 hoàn thiện sản phẩm cuối khóa.",
    detailHint:
      "Bổ sung ô quan sát tiến độ làm SPCK để cung cấp ngữ cảnh chi tiết cho AI viết nhận xét.",
    iconName: "laptop",
  },
  final_presentation: {
    id: "final_presentation",
    label: "Thuyết trình (Demo Day)",
    shortLabel: "Thuyết trình",
    tagline: "Báo cáo sản phẩm & Denise LMS",
    description:
      "Buổi 14 / buổi cuối của các khóa học có làm đồ án tốt nghiệp.",
    detailHint:
      "Mở chế độ tổng hợp toàn khóa học (từ Buổi 1 đến 13), tích hợp Bảng Đánh Giá Năng Lực & Demo Score Denise LMS.",
    iconName: "mic",
  },
};

/**
 * Xác định hình thức buổi học dựa trên các cờ dữ liệu trong DB.
 * Ưu tiên: final_presentation > periodic_test > project_period > standard.
 */
export function resolveSessionFormat(session: {
  session_number?: number;
  is_periodic_test?: boolean | null;
  is_project_period?: boolean | null;
  is_final_presentation?: boolean | null;
}): SessionFormat {
  if (session.is_final_presentation) return "final_presentation";
  if (session.is_periodic_test) return "periodic_test";
  if (session.is_project_period) return "project_period";
  // Nếu cột is_final_presentation chưa tồn tại trong DB (undefined) và là buổi 14:
  if (
    session.is_final_presentation === undefined &&
    session.session_number === 14 &&
    !session.is_periodic_test &&
    !session.is_project_period
  ) {
    return "final_presentation";
  }
  return "standard";
}

/**
 * Chuyển đổi SessionFormat sang các cờ boolean tương ứng với schema DB.
 */
export function formatToFlags(format: SessionFormat): {
  isPeriodicTest: boolean;
  isProjectPeriod: boolean;
  isFinalPresentation: boolean;
} {
  return {
    isPeriodicTest: format === "periodic_test",
    isProjectPeriod: format === "project_period",
    isFinalPresentation: format === "final_presentation",
  };
}

/**
 * Lấy nhãn badge ngắn gọn để hiển thị trên thẻ buổi học ở danh sách buổi.
 */
export function getSessionFormatBadge(
  format: SessionFormat,
  sessionNumber?: number,
  totalSessions?: number
): { label: string; className: string } | null {
  const isFinalSession =
    Boolean(sessionNumber && totalSessions && sessionNumber === totalSessions) ||
    sessionNumber === 14;

  switch (format) {
    case "final_presentation":
      return {
        label: "🎤 Demo Day",
        className:
          "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
      };
    case "periodic_test":
      return {
        label: isFinalSession ? "📝 Thi cuối khóa" : "📝 Kiểm tra",
        className:
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      };
    case "project_period":
      return {
        label: "💻 SPCK",
        className:
          "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      };
    case "standard":
    default:
      return null;
  }
}

/**
 * Lọc danh sách buổi có thể áp nhận xét theo hình thức buổi học đang chọn.
 */
export function filterCopySessionsByFormat<T extends { format: SessionFormat }>(
  sessions: T[],
  format: SessionFormat
): T[] {
  return sessions.filter((s) => s.format === format);
}

