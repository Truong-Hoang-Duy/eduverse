import { describe, expect, it } from "vitest";

import { zaloMarkupToHtml, zaloMarkupToPlainText } from "./zalo-format";

describe("zaloMarkupToHtml", () => {
  it("should convert **bold** and _italic_ markup", () => {
    expect(zaloMarkupToHtml("**Kính gửi Quý Phụ huynh,**")).toBe(
      "<div><b>Kính gửi Quý Phụ huynh,</b></div>"
    );
    expect(zaloMarkupToHtml("_Trân trọng,_")).toBe("<div><i>Trân trọng,</i></div>");
  });

  it("should turn lines starting with '- ' into bullet lines prefixed with '• '", () => {
    const input = "Kiến thức đã học:\n- Vòng lặp for\n- Vòng lặp while";
    expect(zaloMarkupToHtml(input)).toBe(
      "<div>Kiến thức đã học:<br>• Vòng lặp for<br>• Vòng lặp while</div>"
    );
  });

  it("should join every line with <br> inside a single <div>, never <p> or <li>", () => {
    const html = zaloMarkupToHtml("Dòng 1\n\nDòng 2");
    expect(html).not.toContain("<p>");
    expect(html).not.toContain("<li>");
    expect(html).not.toContain("<ul>");
  });

  it("should keep a blank line as a visible gap instead of a collapsible empty <br><br>", () => {
    // "<br><br>" (2 <br> liên tiếp không nội dung) bị Zalo gộp mất khi dán —
    // dòng trống phải có nội dung vô hình ("&nbsp;") để không bị gộp.
    expect(zaloMarkupToHtml("Dòng 1\n\nDòng 2")).toBe(
      "<div>Dòng 1<br>&nbsp;<br>Dòng 2</div>"
    );
  });

  it("should never emit a color style — Zalo has no color formatting", () => {
    const html = zaloMarkupToHtml("**Kiến thức đã học:**\n- Vòng lặp for");
    expect(html).not.toContain("color");
    expect(html).not.toContain("style=");
  });

  it("should collapse a doubled bullet marker into a single bullet", () => {
    // Mẫu GV gõ "- {tom_tat}" + AI đã tự thêm "- " cho từng kiến thức.
    expect(zaloMarkupToHtml("- - Vòng lặp for")).toBe("<div>• Vòng lặp for</div>");
  });

  it("should apply bold that opens and closes on different lines", () => {
    // Ca thật của GV: mở "**" ở lời chào, đóng mãi 2 đoạn sau.
    const input = "**Kính gửi Quý Phụ huynh,\n\nThầy Duy xin thông tin như sau:**";
    const html = zaloMarkupToHtml(input);
    expect(html).not.toContain("**");
    expect(html).toBe(
      "<div><b>Kính gửi Quý Phụ huynh,<br>&nbsp;<br>" +
        "Thầy Duy xin thông tin như sau:</b></div>"
    );
  });

  it("should apply bold+italic that both span two lines", () => {
    const html = zaloMarkupToHtml("**_Trân trọng,\nThầy Duy_**");
    expect(html).not.toContain("**");
    expect(html).not.toContain("_");
    expect(html).toBe("<div><b><i>Trân trọng,<br>Thầy Duy</i></b></div>");
  });

  it("should let one tag span the <br> instead of closing and reopening it", () => {
    // Đóng thẻ cuối mỗi dòng rồi mở lại ("</b><br><b>") khiến Zalo coi mỗi cụm
    // là một KHỐI riêng và chèn thêm dòng trống — chữ ký bị tách đôi.
    const html = zaloMarkupToHtml("**dòng 1\ndòng 2**");
    expect(html).toBe("<div><b>dòng 1<br>dòng 2</b></div>");
    expect(html).not.toContain("</b><br><b>");
  });

  it("should not treat underscores inside a word as italic markers", () => {
    expect(zaloMarkupToHtml("bien_the_khac")).toBe("<div>bien_the_khac</div>");
  });

  it("should escape HTML special characters in raw text", () => {
    expect(zaloMarkupToHtml("if (a < b && b > c)")).toBe(
      "<div>if (a &lt; b &amp;&amp; b &gt; c)</div>"
    );
  });
});

describe("zaloMarkupToPlainText", () => {
  it("should strip ** and _ markers but keep the text", () => {
    expect(zaloMarkupToPlainText("**Kính gửi Quý Phụ huynh,**")).toBe(
      "Kính gửi Quý Phụ huynh,"
    );
    expect(zaloMarkupToPlainText("_Trân trọng,_")).toBe("Trân trọng,");
  });

  it("should normalize '- ' bullet lines to '• '", () => {
    const input = "- Vòng lặp for\n- Vòng lặp while";
    expect(zaloMarkupToPlainText(input)).toBe("• Vòng lặp for\n• Vòng lặp while");
  });

  it("should leave plain lines without markup untouched", () => {
    expect(zaloMarkupToPlainText("Lớp JSB01 — Buổi 13")).toBe("Lớp JSB01 — Buổi 13");
  });
});
