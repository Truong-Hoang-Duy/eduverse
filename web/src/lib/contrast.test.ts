import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AA_NORMAL, contrastRatio, parseHex, relativeLuminance } from "./contrast";

/**
 * Bảng màu của trang triển lãm phụ huynh phải đạt WCAG AA ở CẢ HAI mode.
 *
 * Test đọc thẳng hex từ `globals.css` chứ không chép lại vào đây: chép là sớm
 * muộn cũng lệch, rồi test xanh trong khi trang thật thì chữ chìm vào nền.
 */
const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Rút các biến `--sc-*` trong một khối selector. */
function paletteOf(selector: string): Record<string, string> {
  const start = CSS.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Không tìm thấy khối CSS "${selector}"`);
  const end = CSS.indexOf("\n}", start);
  const block = CSS.slice(start, end);

  const colors: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(
    /--sc-([a-z-]+):\s*(#[0-9a-fA-F]{3,6});/g
  )) {
    colors[name] = value;
  }
  return colors;
}

const LIGHT = paletteOf(".showcase-theme");
const DARK = paletteOf(".dark .showcase-theme");

/** Cặp chữ/nền phải đọc được. Tên để thông báo lỗi nói rõ chỗ nào hỏng. */
const PAIRS: [string, string, string][] = [
  ["chữ chính trên nền giấy", "ink", "paper"],
  ["chữ chính trên thẻ", "ink", "raised"],
  ["chữ phụ trên nền giấy", "ink-soft", "paper"],
  ["chữ phụ trên thẻ", "ink-soft", "raised"],
  ["đồng thau trên nền giấy", "brass", "paper"],
  ["đồng thau trên thẻ (và chữ trên nút đồng thau)", "brass", "raised"],
  ["đất nung trên nền giấy", "terracotta", "paper"],
  ["đất nung trên thẻ", "terracotta", "raised"],
];

describe("Bảng màu trang triển lãm — chế độ SÁNG", () => {
  it("should declare every colour the theme needs", () => {
    for (const key of [
      "paper",
      "raised",
      "ink",
      "ink-soft",
      "brass",
      "brass-soft",
      "terracotta",
      "line",
    ]) {
      expect(LIGHT[key], `thiếu --sc-${key}`).toBeTruthy();
    }
  });

  it.each(PAIRS)("should pass WCAG AA for %s", (_label, fg, bg) => {
    expect(contrastRatio(LIGHT[fg], LIGHT[bg])).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("should keep the feature pills readable", () => {
    // Pill "chức năng" ở mode sáng: nền đồng thau nhạt, chữ mực.
    expect(contrastRatio(LIGHT.ink, LIGHT["brass-soft"])).toBeGreaterThanOrEqual(
      AA_NORMAL
    );
  });
});

describe("Bảng màu trang triển lãm — chế độ TỐI", () => {
  it.each(PAIRS)("should pass WCAG AA for %s", (_label, fg, bg) => {
    expect(contrastRatio(DARK[fg], DARK[bg])).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("should keep the feature pills readable", () => {
    // Ở mode tối pill đảo vai: nền là mảng đồng thau tối, chữ là đồng thau sáng.
    expect(contrastRatio(DARK.brass, DARK["brass-soft"])).toBeGreaterThanOrEqual(
      AA_NORMAL
    );
  });

  it("should stay a warm charcoal, never pure black", () => {
    // Cả hai mode cùng một hệ thống, chỉ khác độ sáng — nền tối phải còn hơi ấm.
    const [r, , b] = parseHex(DARK.paper);
    expect(r, "kênh đỏ phải nhỉnh hơn kênh xanh dương").toBeGreaterThan(b);
    expect(relativeLuminance(DARK.paper)).toBeGreaterThan(0);
  });
});

describe("contrastRatio", () => {
  it("should give 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("should give 1 for a colour against itself", () => {
    expect(contrastRatio("#8a5e10", "#8a5e10")).toBeCloseTo(1, 5);
  });

  it("should not care which colour comes first", () => {
    expect(contrastRatio("#241c14", "#faf6ee")).toBeCloseTo(
      contrastRatio("#faf6ee", "#241c14"),
      5
    );
  });

  it("should expand shorthand hex", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
  });

  it("should reject a value that is not a colour", () => {
    expect(() => parseHex("brass")).toThrow();
  });
});
