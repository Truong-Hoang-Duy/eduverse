/**
 * Tính tương phản màu theo công thức WCAG 2.x.
 *
 * Có hàm này để bảng màu của trang triển lãm được kiểm bằng SỐ chứ không phải
 * bằng cảm giác: `contrast.test.ts` đọc thẳng hex từ `globals.css` rồi khẳng
 * định từng cặp chữ/nền đạt AA. Đổi một mã màu mà quên hậu quả là test đỏ ngay.
 */

/** Ngưỡng WCAG AA: chữ thường 4.5, chữ to (≥18.66px đậm / ≥24px) 3.0. */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

/** #rgb hoặc #rrggbb → [0-255, 0-255, 0-255]. Ném lỗi nếu không đọc được. */
export function parseHex(hex: string): [number, number, number] {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Mã màu không đọc được: ${hex}`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Độ sáng tương đối theo WCAG (đã tuyến tính hóa từng kênh sRGB). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Tỉ số tương phản giữa hai màu — đối xứng, luôn ≥ 1 và ≤ 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
