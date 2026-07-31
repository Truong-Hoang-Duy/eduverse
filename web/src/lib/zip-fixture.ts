/**
 * Dựng file ZIP hợp lệ trong bộ nhớ — CHỈ dùng cho test (`*.test.ts`), app không
 * import file này.
 *
 * Node không ghi được ZIP, mà test bộ đọc ZIP bằng chuỗi base64 dán cứng thì
 * không sửa/mở rộng được. Ở đây tự ghép header theo đúng đặc tả để mỗi ca test
 * dựng đúng cấu trúc nó cần (nén hoặc không, có extra field, thư mục...).
 */
import { deflateRawSync } from "node:zlib";

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;

export interface FixtureEntry {
  name: string;
  /** Bỏ trống + tên kết thúc bằng "/" để tạo mục thư mục. */
  content?: string;
  /** 0 = lưu thẳng, 8 = deflate. Mặc định deflate. */
  method?: 0 | 8;
  /** Nhồi thêm extra field CHỈ ở local header — bản thật hay lệch so với bảng mục lục. */
  localExtraBytes?: number;
  /** Ghi bytes rác thay vì dữ liệu nén thật (để test nhánh inflate lỗi). */
  corrupt?: boolean;
}

/** Ghép các entry thành một file ZIP. */
export function buildZip(entries: FixtureEntry[]): Uint8Array {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const raw = Buffer.from(entry.content ?? "", "utf8");
    const method = entry.method ?? 8;
    const body = entry.corrupt
      ? Buffer.from("khong phai du lieu nen", "utf8")
      : method === 0
        ? raw
        : deflateRawSync(raw);
    const localExtra = Buffer.alloc(entry.localExtraBytes ?? 0);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIGNATURE, 0);
    local.writeUInt16LE(20, 4); // version cần để mở
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(0, 14); // CRC — bộ đọc của ta không kiểm
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(localExtra.length, 28);

    const record = Buffer.alloc(46);
    record.writeUInt32LE(CENTRAL_SIGNATURE, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt16LE(method, 10);
    record.writeUInt32LE(0, 16);
    record.writeUInt32LE(body.length, 20);
    record.writeUInt32LE(raw.length, 24);
    record.writeUInt16LE(name.length, 28);
    // extra length ở bảng mục lục CỐ Ý để 0 dù local header có extra — bộ đọc
    // phải đọc lại độ dài tại local header, lấy theo số này là trỏ lệch.
    record.writeUInt16LE(0, 30);
    record.writeUInt32LE(offset, 42);

    chunks.push(local, name, localExtra, body);
    central.push(record, name);
    offset += 30 + name.length + localExtra.length + body.length;
  }

  const centralBuffer = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIGNATURE, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return new Uint8Array(
    Buffer.concat([...chunks, centralBuffer, eocd])
  );
}

/** File .docx tối thiểu: ZIP chứa `word/document.xml`. */
export function buildDocx(bodyXml: string): Uint8Array {
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${bodyXml}</w:body></w:document>`;
  return buildZip([
    { name: "docProps/app.xml", content: "<x/>" },
    { name: "word/document.xml", content: xml },
  ]);
}

/** Một đoạn văn `<w:p>` gồm các mẩu chữ `<w:t>`. */
export function paragraph(...inner: string[]): string {
  return `<w:p><w:r>${inner.join("")}</w:r></w:p>`;
}

export function text(value: string): string {
  return `<w:t xml:space="preserve">${value}</w:t>`;
}
