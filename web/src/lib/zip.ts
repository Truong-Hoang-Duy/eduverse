/**
 * Đọc file ZIP — chỉ chạy SERVER (dùng `node:zlib`), đừng import vào client
 * component.
 *
 * Node không có sẵn thư viện ZIP nhưng có `inflateRawSync`, phần còn lại chỉ là
 * đọc bảng mục lục của ZIP → KHÔNG cần thêm dependency (jszip/adm-zip).
 * Dùng cho 2 việc: lấy `word/document.xml` trong .docx (`docx-text.ts`) và giải
 * nén cả bài làm học viên (`actions/project-review.ts`).
 *
 * ai-service có bản Python tương đương cho đường AI chấm bài (`app/storage.py`)
 * — sửa luật đọc file ở một bên nhớ xem bên kia.
 */
import { inflateRawSync } from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50; // "PK\x05\x06" — cuối bảng mục lục
const CENTRAL_SIGNATURE = 0x02014b50; // "PK\x01\x02" — một mục trong bảng
const EOCD_MIN_SIZE = 22;

const STORED = 0;
const DEFLATE = 8;

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

interface CentralEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
  /** Vị trí mục kế tiếp trong bảng mục lục. */
  next: number;
}

/** Vị trí EOCD (nằm cuối file, cách đuôi tối đa 22 byte + 64KB comment). */
function findEndOfCentralDirectory(bytes: Uint8Array, view: DataView): number {
  const earliest = Math.max(0, bytes.length - (EOCD_MIN_SIZE + 0xffff));
  for (let i = bytes.length - EOCD_MIN_SIZE; i >= earliest; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) return i;
  }
  return -1;
}

function readCentralEntry(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  decoder: TextDecoder
): CentralEntry | null {
  if (offset + 46 > bytes.length) return null;
  if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) return null;

  const nameLength = view.getUint16(offset + 28, true);
  const extraLength = view.getUint16(offset + 30, true);
  const commentLength = view.getUint16(offset + 32, true);

  return {
    name: decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)),
    method: view.getUint16(offset + 10, true),
    compressedSize: view.getUint32(offset + 20, true),
    localOffset: view.getUint32(offset + 42, true),
    next: offset + 46 + nameLength + extraLength + commentLength,
  };
}

/** Bung dữ liệu của một mục; null nếu nén kiểu Word/WinRAR không dùng. */
function inflateEntry(
  bytes: Uint8Array,
  view: DataView,
  entry: CentralEntry
): Uint8Array | null {
  if (entry.localOffset + 30 > bytes.length) return null;

  // Độ dài tên/extra ở local header có thể KHÁC bảng mục lục — phải đọc lại tại
  // chỗ, lấy theo số của bảng mục lục là trỏ lệch vào giữa dữ liệu.
  const localNameLength = view.getUint16(entry.localOffset + 26, true);
  const localExtraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + localNameLength + localExtraLength;
  const raw = bytes.subarray(start, start + entry.compressedSize);

  if (entry.method === STORED) return raw;
  if (entry.method === DEFLATE) return new Uint8Array(inflateRawSync(raw));
  return null; // bzip2/lzma — Word và các trình nén phổ thông không xuất kiểu này
}

/** Lấy nội dung MỘT file trong ZIP; null nếu không có hoặc nén kiểu lạ. */
export function readZipEntry(
  bytes: Uint8Array,
  wanted: string
): Uint8Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(bytes, view);
  if (eocd < 0) return null;

  const total = view.getUint16(eocd + 10, true);
  const decoder = new TextDecoder();
  let offset = view.getUint32(eocd + 16, true);

  for (let i = 0; i < total; i++) {
    const entry = readCentralEntry(bytes, view, offset, decoder);
    if (!entry) return null;
    if (entry.name === wanted) return inflateEntry(bytes, view, entry);
    offset = entry.next;
  }

  return null;
}

/**
 * Liệt kê MỌI file trong ZIP (bỏ thư mục — tên kết thúc bằng "/"). Mục nén kiểu
 * lạ bị bỏ qua chứ không làm hỏng cả lượt đọc: bài của học viên lẫn một file
 * hỏng thì vẫn nhận xét được phần còn lại.
 *
 * `keep` lọc theo TÊN trước khi bung dữ liệu — nhờ vậy `node_modules` vài trăm
 * MB không bao giờ bị giải nén vào RAM.
 */
export function listZipEntries(
  bytes: Uint8Array,
  keep?: (name: string) => boolean
): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(bytes, view);
  if (eocd < 0) return [];

  const total = view.getUint16(eocd + 10, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let offset = view.getUint32(eocd + 16, true);

  for (let i = 0; i < total; i++) {
    const entry = readCentralEntry(bytes, view, offset, decoder);
    if (!entry) break;
    offset = entry.next;

    if (entry.name.endsWith("/")) continue;
    if (keep && !keep(entry.name)) continue;

    try {
      const data = inflateEntry(bytes, view, entry);
      if (data) entries.push({ name: entry.name, data });
    } catch {
      // inflate hỏng riêng mục này — bỏ qua, đọc tiếp mục sau.
    }
  }

  return entries;
}
