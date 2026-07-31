import { describe, expect, it } from "vitest";

import { docxToText } from "./docx-text";
import { buildDocx, buildZip, paragraph, text } from "./zip-fixture";

/**
 * Bản TS này chạy song song với `docx_to_text` bên `ai-service/app/storage.py`
 * (một bản cho việc XEM đề trên web, một cho việc AI CHẤM). Sửa luật trích chữ ở
 * đây thì xem lại bên kia — hai bên phải ra cùng kết quả.
 */
describe("docxToText", () => {
  it("should keep each paragraph on its own line", () => {
    const docx = buildDocx(
      paragraph(text("Đề bài buổi 3")) + paragraph(text("Yêu cầu: vẽ tam giác"))
    );

    expect(docxToText(docx)).toBe("Đề bài buổi 3\nYêu cầu: vẽ tam giác");
  });

  it("should join runs inside one paragraph without adding spaces", () => {
    // Word cắt một câu thành nhiều `<w:t>` khi đổi định dạng giữa câu.
    const docx = buildDocx(paragraph(text("vòng lặp "), text("for")));

    expect(docxToText(docx)).toBe("vòng lặp for");
  });

  it("should turn w:tab into a tab and w:br into a newline", () => {
    const docx = buildDocx(
      paragraph(text("Cột A"), "<w:tab/>", text("Cột B")) +
        paragraph(text("Dòng 1"), "<w:br/>", text("Dòng 2"))
    );

    expect(docxToText(docx)).toBe("Cột A\tCột B\nDòng 1\nDòng 2");
  });

  it("should decode XML entities without decoding twice", () => {
    const docx = buildDocx(
      paragraph(text("a &lt; b &amp;&amp; b &gt; 0")) +
        paragraph(text("&amp;lt; phải giữ nguyên"))
    );

    expect(docxToText(docx)).toBe("a < b && b > 0\n&lt; phải giữ nguyên");
  });

  it("should decode numeric character references", () => {
    const docx = buildDocx(paragraph(text("&#65;&#x42;")));

    expect(docxToText(docx)).toBe("AB");
  });

  it("should keep spaces inside the text but trim the whole document", () => {
    // `xml:space="preserve"` giữ khoảng trắng bên trong; còn khoảng trắng ở hai
    // ĐẦU toàn văn bản thì `docxToText` cắt (`.trim()`).
    const docx = buildDocx(paragraph(text("  giữ khoảng trắng  "), text("|")));

    expect(docxToText(docx)).toBe("giữ khoảng trắng  |");
  });

  it("should return null when the file is not a zip", () => {
    expect(docxToText(new TextEncoder().encode("không phải docx"))).toBeNull();
  });

  it("should return null when word/document.xml is missing", () => {
    // .docx đổi tên từ file zip khác — không có phần thân văn bản.
    const zip = buildZip([{ name: "readme.txt", content: "x" }]);

    expect(docxToText(zip)).toBeNull();
  });

  it("should return null when the document holds no text", () => {
    // Bài làm chỉ là ảnh chụp dán vào Word → nơi gọi phải cho tải file về.
    const docx = buildDocx("<w:p><w:r><w:drawing/></w:r></w:p>");

    expect(docxToText(docx)).toBeNull();
  });

  it("should return null when the xml is malformed", () => {
    const zip = buildZip([{ name: "word/document.xml", content: "<w:document" }]);

    expect(docxToText(zip)).toBeNull();
  });
});
