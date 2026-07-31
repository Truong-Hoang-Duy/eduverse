/**
 * Kiểm tra và hiển thị GỌN link Google Drive nộp bài của học viên.
 *
 * "Rút gọn" ở đây là rút gọn CÁCH HIỂN THỊ, không gọi dịch vụ tạo link ngắn bên
 * ngoài (user chốt 2026-07-30): link gốc vẫn lưu nguyên nên không bao giờ chết vì
 * dịch vụ thứ 3 ngừng hoạt động, và không thêm dependency nào.
 */

/** Độ dài tối đa của link khi hiển thị dạng chữ. */
const MAX_DISPLAY = 42;

/** Lý do link không dùng được, null nếu OK. */
export function driveUrlError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Chưa nhập đường dẫn.";
  if (value.length > 500) return "Đường dẫn quá dài (tối đa 500 ký tự).";

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Đường dẫn không hợp lệ — hãy dán đầy đủ, bắt đầu bằng https://";
  }

  // Chỉ cho http(s): chặn javascript:/data: dán vào rồi render thành link.
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Đường dẫn phải bắt đầu bằng https://";
  }
  return null;
}

/** Có phải link Google Drive/Docs thật không — chỉ để CẢNH BÁO, không chặn. */
export function looksLikeGoogleDrive(raw: string): boolean {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    return (
      host === "drive.google.com" ||
      host === "docs.google.com" ||
      host.endsWith(".google.com")
    );
  } catch {
    return false;
  }
}

/**
 * Dạng chữ ngắn để hiện trong bảng/thẻ: bỏ "https://www.", cắt giữa đường dẫn.
 * VD: `drive.google.com/drive/folders/1A2b…UvW`
 */
export function shortenDriveUrl(raw: string): string {
  const value = raw.trim();
  const bare = value.replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (bare.length <= MAX_DISPLAY) return bare;

  // Giữ tên miền + phần đuôi cho dễ nhận ra, ký tự "…" ở giữa.
  const keepEnd = 8;
  const keepStart = MAX_DISPLAY - keepEnd - 1;
  return `${bare.slice(0, keepStart)}…${bare.slice(-keepEnd)}`;
}
