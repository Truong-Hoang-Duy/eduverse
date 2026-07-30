/**
 * Trích chữ từ file Word .docx — chỉ chạy SERVER (dùng `node:zlib`), đừng import
 * vào client component.
 *
 * .docx là file ZIP chứa `word/document.xml`. Node không có sẵn thư viện đọc ZIP,
 * nhưng có `inflateRawSync` — phần còn lại chỉ là đọc bảng mục lục của ZIP, nên
 * KHÔNG cần thêm dependency (jszip/mammoth). ai-service có bản Python tương đương
 * (`docx_to_text` trong `app/storage.py`) dùng cho đường AI chấm bài — sửa luật
 * trích chữ ở một bên nhớ xem bên kia.
 */
import { inflateRawSync } from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50; // "PK\x05\x06" — cuối bảng mục lục
const CENTRAL_SIGNATURE = 0x02014b50; // "PK\x01\x02" — một mục trong bảng
const EOCD_MIN_SIZE = 22;

/** Lấy nội dung một file trong ZIP; null nếu không có hoặc nén kiểu lạ. */
function readZipEntry(bytes: Uint8Array, wanted: string): Uint8Array | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // EOCD nằm ở cuối file, cách đuôi tối đa 22 byte + 64KB comment.
  let eocd = -1;
  const earliest = Math.max(0, bytes.length - (EOCD_MIN_SIZE + 0xffff));
  for (let i = bytes.length - EOCD_MIN_SIZE; i >= earliest; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const total = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();

  for (let i = 0; i < total; i++) {
    if (offset + 46 > bytes.length) return null;
    if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) return null;

    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength)
    );

    if (name === wanted) {
      if (localOffset + 30 > bytes.length) return null;
      // Độ dài tên/extra ở local header có thể KHÁC bảng mục lục — phải đọc lại
      // tại chỗ, lấy theo số của bảng mục lục là trỏ lệch vào giữa dữ liệu.
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const raw = bytes.subarray(start, start + compressedSize);

      if (method === 0) return raw; // lưu thẳng, không nén
      if (method === 8) return new Uint8Array(inflateRawSync(raw)); // deflate
      return null; // bzip2/lzma — Word không xuất kiểu này
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return null;
}

/** `<w:p>` = một đoạn văn; `<w:t>` = một mẩu chữ trong đoạn. */
const PARAGRAPH_RE = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
const INLINE_RE = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(tab|br|cr)\b[^>]*>/g;

function decodeXmlEntities(raw: string): string {
  return (
    raw
      .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
        String.fromCodePoint(parseInt(hex, 16))
      )
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      // &amp; sau cùng, nếu không "&amp;lt;" bị giải hai lần thành "<".
      .replace(/&amp;/g, "&")
  );
}

/**
 * Trả về chữ trong file .docx, hoặc null nếu không đọc được (file hỏng, bị DLP
 * mã hóa, hay bài chỉ có ảnh) — nơi gọi tự quyết định cách xử lý khi null.
 */
export function docxToText(bytes: Uint8Array): string | null {
  let xmlBytes: Uint8Array | null = null;
  try {
    xmlBytes = readZipEntry(bytes, "word/document.xml");
  } catch {
    return null; // inflate hỏng giữa đường
  }
  if (!xmlBytes) return null;

  const xml = new TextDecoder().decode(xmlBytes);
  const paragraphs: string[] = [];

  for (const [, inner] of xml.matchAll(PARAGRAPH_RE)) {
    let line = "";
    for (const match of inner.matchAll(INLINE_RE)) {
      if (match[1] !== undefined) line += decodeXmlEntities(match[1]);
      else if (match[2] === "tab") line += "\t";
      else line += "\n"; // br / cr
    }
    paragraphs.push(line);
  }

  const text = paragraphs.join("\n").trim();
  return text || null;
}
