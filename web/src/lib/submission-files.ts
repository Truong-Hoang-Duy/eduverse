/**
 * Thu thập file bài làm của học viên cho việc nhận xét SẢN PHẨM CUỐI KHÓA — nơi
 * đầu vào là cả một thư mục (hoặc file .zip) chứ không phải vài file lẻ.
 *
 * Chạy được ở CẢ client (đọc thư mục do GV chọn) và server (giải nén .zip) nên
 * KHÔNG được import `node:*` vào đây.
 *
 * Nguồn DUY NHẤT cho: luật lọc rác, ngân sách dung lượng, và cách dựng cây thư
 * mục. Sửa luật ở đây là cả hai đường (folder + zip) đổi theo.
 */

/** Một file đã đọc thành chữ, sẵn sàng gửi AI. */
export interface SubmissionFile {
  /** Đường dẫn tương đối trong thư mục gốc: "bai-cuoi-khoa/js/app.js". */
  path: string;
  content: string;
  /** Số byte gốc — dùng để tính ngân sách, không phải độ dài chuỗi. */
  size: number;
}

/** Vì sao một file bị bỏ, để báo cho GV biết hệ thống bỏ đúng thứ đáng bỏ. */
export type SkipReason = "folder" | "junk" | "binary" | "image" | "too-big";

export interface SkipTally {
  folder: number;
  junk: number;
  binary: number;
  image: number;
  "too-big": number;
}

export interface Budget {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
}

/** Sản phẩm cuối khóa: toàn file chữ, nên siết chặt. */
export const PROJECT_BUDGET: Budget = {
  maxFiles: 30,
  /** Code người viết hiếm khi quá 200KB; to hơn gần như luôn là file sinh tự động. */
  maxFileBytes: 200 * 1024,
  /**
   * Tổng 2MB — dưới xa trần `bodySizeLimit: "10mb"` của Server Action
   * (`web/next.config.ts`), đã chừa cho base64 (+33%) và các field khác.
   */
  maxTotalBytes: 2 * 1024 * 1024,
};

/**
 * Bài tập hàng ngày: nới hơn vì bài làm có thể là ảnh chụp code hoặc PDF scan.
 * Tổng 6MB → base64 thành ~8MB, vẫn dưới trần 10MB.
 */
export const GRADING_BUDGET: Budget = {
  maxFiles: 30,
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalBytes: 6 * 1024 * 1024,
};

/**
 * Thư mục sinh tự động / của công cụ. Bỏ theo TÊN THƯ MỤC nên `node_modules` vài
 * trăm MB không bao giờ bị đọc vào RAM.
 */
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".svn", ".hg",
  "dist", "build", "out", ".next", ".nuxt", ".cache",
  "__pycache__", ".venv", "venv", "env",
  "vendor", "target", "bin", "obj",
  ".idea", ".vscode", ".gradle",
]);

/** File rác / sinh tự động — không phải thứ học viên viết ra. */
const SKIP_FILES = new Set([
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "composer.lock",
  "poetry.lock", "gemfile.lock", ".ds_store", "thumbs.db", "desktop.ini",
]);

const SKIP_SUFFIXES = [".min.js", ".min.css", ".map", ".pyc", ".class", ".o"];

/**
 * Ảnh BỊ BỎ khi nhận xét sản phẩm: trong một project chúng gần như luôn là asset
 * (logo, background) — không nhận xét được mà ngốn ngân sách rất nhanh. Khác với
 * chấm bài tập lẻ, nơi ảnh có thể CHÍNH LÀ bài làm (ảnh chụp code) nên phải giữ.
 */
const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif",
]);

/** Nhị phân không đọc thành chữ được. */
const BINARY_EXTENSIONS = new Set([
  "zip", "rar", "7z", "tar", "gz", "exe", "msi", "dll", "iso", "so", "dylib",
  "mp3", "mp4", "avi", "mov", "mkv", "wav", "ogg", "webm",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "ttf", "otf", "woff", "woff2", "eot",
  "db", "sqlite", "sqlite3", "psd", "ai", "fig",
]);

function extensionOf(path: string): string {
  const base = path.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export interface FilterOptions {
  /**
   * Tab bài tập hàng ngày GIỮ ảnh (ảnh chụp code có thể CHÍNH LÀ bài làm); tab
   * sản phẩm cuối khóa BỎ ảnh (trong project ảnh chỉ là asset, ngốn token).
   * Khác nhau là chủ ý — đừng "sửa cho nhất quán".
   */
  keepImages?: boolean;
  /** Giữ PDF/Word — bài tập hàng ngày đọc được, sản phẩm cuối khóa thì không. */
  keepDocuments?: boolean;
}

const DOCUMENT_EXTENSIONS = new Set(["pdf", "docx"]);

/**
 * Lý do bỏ file này, null nếu giữ. Xét theo TÊN nên gọi được trước khi đọc/giải
 * nén nội dung.
 */
export function skipReasonFor(
  path: string,
  options: FilterOptions = {}
): SkipReason | null {
  const segments = path.split("/").filter(Boolean);
  const base = (segments.pop() ?? "").toLowerCase();

  if (segments.some((dir) => SKIP_DIRS.has(dir))) return "folder";
  // File ẩn cấu hình (.env, .gitignore) không phải bài làm — nhưng .htaccess thì
  // giữ vì có bài web dùng thật.
  if (base.startsWith(".") && base !== ".htaccess") return "junk";
  if (SKIP_FILES.has(base)) return "junk";
  if (SKIP_SUFFIXES.some((suffix) => base.endsWith(suffix))) return "junk";

  const ext = extensionOf(base);
  if (IMAGE_EXTENSIONS.has(ext)) {
    return options.keepImages ? null : "image";
  }
  if (DOCUMENT_EXTENSIONS.has(ext)) {
    return options.keepDocuments ? null : "binary";
  }
  if (BINARY_EXTENSIONS.has(ext)) return "binary";

  return null;
}

export function emptyTally(): SkipTally {
  return { folder: 0, junk: 0, binary: 0, image: 0, "too-big": 0 };
}

/**
 * Bỏ đoạn thư mục gốc chung để đường dẫn hiển thị gọn và AI đọc dễ. Generic vì
 * dùng cho cả `SubmissionFile` (sản phẩm, có `content`) lẫn file nhị phân chờ
 * chấm (bài tập, chỉ có base64).
 */
export function stripCommonRoot<T extends { path: string }>(files: T[]): T[] {
  if (files.length < 2) return files;

  const firstRoot = files[0].path.split("/")[0];
  const shared = files.every(
    (f) => f.path.startsWith(`${firstRoot}/`) && f.path.includes("/")
  );
  if (!shared) return files;

  return files.map((f) => ({ ...f, path: f.path.slice(firstRoot.length + 1) }));
}

/** Tổng số byte của danh sách — dùng cho cả cảnh báo UI và guard server. */
export function totalBytes(files: SubmissionFile[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
}

/** Lời cảnh báo tiếng Việt nếu vượt ngân sách, null nếu ổn. */
export function budgetWarning(
  files: { size: number }[],
  budget: Budget
): string | null {
  if (files.length > budget.maxFiles) {
    return `Có ${files.length} file, quá ${budget.maxFiles} file — hãy bỏ bớt file không cần.`;
  }
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > budget.maxTotalBytes) {
    return `Tổng ${formatBytes(total)}, quá ${formatBytes(budget.maxTotalBytes)} — hãy bỏ bớt file lớn.`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Mô tả ngắn những gì đã bị bỏ, để GV yên tâm là không mất bài. */
export function describeSkipped(tally: SkipTally): string {
  const parts: string[] = [];
  if (tally.folder) parts.push(`${tally.folder} file trong thư mục sinh tự động`);
  if (tally.junk) parts.push(`${tally.junk} file rác/cấu hình`);
  if (tally.image) parts.push(`${tally.image} ảnh`);
  if (tally.binary) parts.push(`${tally.binary} file nhị phân`);
  if (tally["too-big"]) parts.push(`${tally["too-big"]} file quá lớn`);
  return parts.join(", ");
}
