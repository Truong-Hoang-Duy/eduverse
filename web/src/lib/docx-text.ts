/**
 * Trích chữ từ file Word .docx — chỉ chạy SERVER (qua `zip.ts` dùng `node:zlib`),
 * đừng import vào client component.
 *
 * .docx là file ZIP chứa `word/document.xml`. ai-service có bản Python tương
 * đương (`docx_to_text` trong `app/storage.py`) dùng cho đường AI chấm bài —
 * sửa luật trích chữ ở một bên nhớ xem bên kia.
 */
import { readZipEntry } from "@/lib/zip";

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
