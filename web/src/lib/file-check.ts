/**
 * Phát hiện file bị phần mềm bảo mật (DLP) của doanh nghiệp mã hóa: trình duyệt
 * không được giải mã nên đọc ra bytes rác, upload lên là hỏng. Chặn sớm ở client
 * để báo cho người dùng ngay thay vì để AI trả lỗi khó hiểu.
 */
const ENCRYPTED_MARKERS = ["SECURE FILE", "This file is encrypted"];

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MAGIC: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/gif": [0x47, 0x49, 0x46, 0x38],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  // .docx là file ZIP — DLP mã hóa thì chữ ký PK biến mất, bắt được ngay ở đây.
  [DOCX_MIME]: [0x50, 0x4b, 0x03, 0x04],
};

/**
 * Đuôi file bài làm KHÔNG chấm được. Chủ trương là "mở thoải mái": mọi đuôi code
 * đều cho qua (ai-service decode ra text cho Gemini đọc), chỉ chặn thứ chắc chắn
 * vô nghĩa — file nén, file thực thi, media, và Office nhị phân đời cũ.
 * ⚠️ ai-service có bản đối chiếu ở `ai-service/app/storage.py` — sửa một bên
 * nhớ xem bên kia.
 */
const BLOCKED_EXTENSIONS: Record<string, string> = {
  doc: 'File "{name}" là Word đời cũ (.doc) — định dạng này không trích được chữ. Hãy mở bằng Word rồi "Lưu thành" .docx (hoặc .pdf) và thử lại.',
  xls: 'File "{name}" là Excel đời cũ (.xls) — hãy lưu lại thành .pdf rồi thử lại.',
  ppt: 'File "{name}" là PowerPoint đời cũ (.ppt) — hãy lưu lại thành .pdf rồi thử lại.',
};

const ARCHIVE_OR_BINARY = [
  "zip", "rar", "7z", "tar", "gz", "exe", "msi", "dll", "iso",
  "mp3", "mp4", "avi", "mov", "mkv", "wav",
];

/** Đuôi gợi ý cho thuộc tính `accept` — chỉ là lọc UX, kéo thả vẫn kiểm lại. */
export const SUBMISSION_ACCEPT = [
  ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".html", ".htm", ".css",
  ".scss", ".json", ".xml", ".yml", ".yaml", ".java", ".c", ".h", ".cpp", ".hpp",
  ".cs", ".php", ".rb", ".go", ".rs", ".kt", ".swift", ".dart", ".lua", ".r",
  ".sql", ".sh", ".bat", ".ipynb", ".vue", ".svelte", ".md", ".txt", ".csv",
  ".docx", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp",
].join(",");

/**
 * Lý do KHÔNG nhận file bài làm này, null nếu nhận được. Cần cho kéo thả vì
 * `accept` của input chỉ lọc hộp thoại chọn file, không lọc thứ được thả vào.
 */
export function unsupportedSubmissionReason(name: string): string | null {
  const parts = name.split(".");
  if (parts.length < 2 || !parts[parts.length - 1]) {
    return `"${name}" không rõ định dạng — hãy thả từng file có đuôi cụ thể (VD .py, .html), không thả cả thư mục.`;
  }

  const ext = parts[parts.length - 1].toLowerCase();
  const blocked = BLOCKED_EXTENSIONS[ext];
  if (blocked) {
    return blocked.replace("{name}", name);
  }
  if (ARCHIVE_OR_BINARY.includes(ext)) {
    return `File "${name}" (.${ext}) không phải bài làm đọc được — hãy giải nén và thả từng file code vào.`;
  }
  return null;
}

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
