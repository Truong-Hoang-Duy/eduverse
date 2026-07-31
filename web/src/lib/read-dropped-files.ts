/**
 * Đọc file/thư mục người dùng chọn hoặc kéo thả — dùng API của TRÌNH DUYỆT
 * (`webkitGetAsEntry`, `webkitRelativePath`), chỉ import từ client component.
 *
 * Luật lọc rác và ngân sách KHÔNG nằm ở đây mà ở `submission-files.ts` để đường
 * .zip (giải nén phía server) dùng chung cùng một luật.
 */
import {
  emptyTally,
  skipReasonFor,
  type FilterOptions,
  type SkipTally,
  type SubmissionFile,
} from "@/lib/submission-files";

/** File kèm đường dẫn tương đối, chưa đọc nội dung. */
export interface PickedFile {
  file: File;
  path: string;
}

/** Chặn thư mục lồng quá sâu — vòng lặp symlink sẽ đọc vô tận. */
const MAX_DEPTH = 12;

function readEntriesBatch(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });
}

function readFileOf(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function walkEntry(
  entry: FileSystemEntry,
  prefix: string,
  depth: number,
  options: FilterOptions,
  out: PickedFile[]
): Promise<void> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;

  if (entry.isFile) {
    // Lọc theo tên TRƯỚC khi đọc file — thư mục node_modules không bị mở ra.
    if (skipReasonFor(path, options)) return;
    try {
      out.push({ file: await readFileOf(entry as FileSystemFileEntry), path });
    } catch {
      // File bị khóa/xóa giữa lúc đọc — bỏ qua, phần còn lại vẫn nhận xét được.
    }
    return;
  }

  if (!entry.isDirectory || depth >= MAX_DEPTH) return;
  // Bỏ cả nhánh node_modules/.git ngay từ tên thư mục.
  if (skipReasonFor(`${path}/x`) === "folder") return;

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries trả về TỪNG LÔ (Chrome 100 mục/lô) — phải gọi tới khi rỗng, đọc
  // một lần là mất file của thư mục lớn mà không báo lỗi gì.
  for (;;) {
    const batch = await readEntriesBatch(reader);
    if (batch.length === 0) break;
    for (const child of batch) {
      await walkEntry(child, path, depth + 1, options, out);
    }
  }
}

/**
 * Lấy file từ một lần kéo thả. `entries` PHẢI được gom đồng bộ trong chính
 * handler `onDrop` (`items[i].webkitGetAsEntry()`) — `dataTransfer.items` bị xóa
 * ngay khi handler trả về, `await` trước khi gom là mất sạch dữ liệu.
 */
export async function pickedFromDrop(
  entries: (FileSystemEntry | null)[],
  plainFiles: File[],
  options: FilterOptions = {}
): Promise<PickedFile[]> {
  const usable = entries.filter((e): e is FileSystemEntry => e !== null);

  // Trình duyệt không cho đọc entry (hoặc thả từ nguồn lạ) → lùi về danh sách
  // file phẳng, mất cấu trúc thư mục nhưng vẫn nhận xét được.
  if (usable.length === 0) {
    return plainFiles.map((file) => ({ file, path: file.name }));
  }

  const out: PickedFile[] = [];
  for (const entry of usable) {
    await walkEntry(entry, "", 0, options, out);
  }
  return out;
}

/** Lấy file từ `<input type="file">` — có `webkitdirectory` thì giữ đường dẫn. */
export function pickedFromInput(
  files: File[],
  options: FilterOptions = {}
): PickedFile[] {
  return files
    .map((file) => ({ file, path: file.webkitRelativePath || file.name }))
    .filter((picked) => !skipReasonFor(picked.path, options));
}

/**
 * Đọc nội dung đã lọc thành chữ.
 *
 * CHỈ đọc — lọc theo tên và ngân sách đã do `useSubmissionPicker` làm trước đó
 * (trước đây hàm này tự lọc lấy, nên luật lọc bị chẻ làm hai nơi). Cái duy nhất
 * còn đếm ở đây là file mở ra mới biết hỏng: lọc theo tên không thể bắt được.
 */
export async function readPickedAsText(
  picked: PickedFile[]
): Promise<{ items: SubmissionFile[]; skipped: SkipTally }> {
  const skipped = emptyTally();
  const items: SubmissionFile[] = [];

  for (const { file, path } of picked) {
    try {
      items.push({ path, content: await file.text(), size: file.size });
    } catch {
      skipped.junk += 1;
    }
  }

  return { items, skipped };
}
