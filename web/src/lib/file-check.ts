/**
 * Phát hiện file bị phần mềm bảo mật (DLP) của doanh nghiệp mã hóa: trình duyệt
 * không được giải mã nên đọc ra bytes rác, upload lên là hỏng. Chặn sớm ở client
 * để báo cho người dùng ngay thay vì để AI trả lỗi khó hiểu.
 */
const ENCRYPTED_MARKERS = ["SECURE FILE", "This file is encrypted"];

const MAGIC: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
};

/**
 * Nhận diện dấu vết DLP trong vài trăm byte đầu. Tách riêng khỏi
 * `checkFileReadable` để phía server (đọc file từ Storage, không có object File)
 * dùng lại được cùng một luật.
 */
export function looksEncrypted(head: Uint8Array): boolean {
  const asText = new TextDecoder("latin1").decode(head.slice(0, 512));
  return ENCRYPTED_MARKERS.some((m) => asText.includes(m));
}

/** Trả về thông báo lỗi tiếng Việt nếu file không đọc được, null nếu OK. */
export async function checkFileReadable(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());

  if (looksEncrypted(head)) {
    return `File "${file.name}" đang bị phần mềm bảo mật của công ty mã hóa nên trình duyệt không đọc được nội dung thật. Hãy lưu file sang thư mục không bị mã hóa (VD Desktop cá nhân) hoặc dùng file .txt/.md, rồi thử lại.`;
  }

  const expected = MAGIC[file.type];
  if (expected && !expected.every((b, i) => head[i] === b)) {
    return `File "${file.name}" không phải ${file.type} hợp lệ — file có thể bị hỏng hoặc bị mã hóa. Hãy thử file khác.`;
  }

  return null;
}
