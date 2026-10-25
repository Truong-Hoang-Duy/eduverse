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

const ATTACHMENT_META_PREFIX = "<!--attachments:";
const ATTACHMENT_META_SUFFIX = "-->";

/**
 * Đóng gói danh sách file đính kèm vào trường instructions (fallback an toàn nếu DB chưa có cột riêng).
 */
export function encodeInstructionsWithAttachments(
  instructions?: string | null,
  attachmentPaths?: string[] | null
): string | null {
  const clean = removeAttachmentMeta(instructions ?? "");
  const paths = (attachmentPaths ?? []).filter(Boolean);
  if (paths.length === 0) {
    return clean || null;
  }
  const meta = `${ATTACHMENT_META_PREFIX}${JSON.stringify(paths)}${ATTACHMENT_META_SUFFIX}`;
  return clean ? `${clean}\n${meta}` : meta;
}

/**
 * Trích xuất danh sách file đính kèm: ưu tiên cột DB, nếu rỗng thì giải mã từ instructions.
 */
export function extractAttachmentPaths(
  instructions?: string | null,
  dbAttachmentPaths?: string[] | null
): string[] {
  if (Array.isArray(dbAttachmentPaths) && dbAttachmentPaths.length > 0) {
    return dbAttachmentPaths;
  }
  if (!instructions || typeof instructions !== "string") {
    return [];
  }
  const startIdx = instructions.indexOf(ATTACHMENT_META_PREFIX);
  if (startIdx === -1) return [];
  const endIdx = instructions.indexOf(ATTACHMENT_META_SUFFIX, startIdx);
  if (endIdx === -1) return [];
  try {
    const jsonStr = instructions.slice(
      startIdx + ATTACHMENT_META_PREFIX.length,
      endIdx
    );
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Làm sạch trường instructions khi hiển thị cho người dùng hoặc gửi sang AI
 * (loại bỏ phần metadata kỹ thuật của attachments).
 */
export function cleanInstructionsForDisplay(
  instructions?: string | null
): string {
  if (!instructions || typeof instructions !== "string") return "";
  return removeAttachmentMeta(instructions);
}

function removeAttachmentMeta(text: string): string {
  return text.replace(/<!--attachments:[\s\S]*?-->/g, "").trim();
}

/**
 * Kiểm tra tiêu đề đề bài có chứa từ khóa 'checkpoint' hoặc 'checkpoints' (không phân biệt hoa thường).
 * Các đề bài thỏa mãn điều kiện này được phép tạo link công khai cho học viên xem đề trực tiếp không cần đăng nhập.
 */
export function isCheckpointAssignment(
  title: string | null | undefined
): boolean {
  if (!title || typeof title !== "string") return false;
  return /(?:checkpoint|check\s+point)/i.test(title);
}
