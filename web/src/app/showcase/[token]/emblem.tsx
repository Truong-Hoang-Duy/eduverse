/**
 * Motif "chữ ký" của trang triển lãm — TRIỆN TỐT NGHIỆP.
 *
 * Phát triển từ icon mũ tốt nghiệp của app (`src/app/icon.svg`) thành một con
 * dấu tròn có viền khía, dùng lại ở ba cỡ để buộc cả trang vào một mạch:
 *   - lớn  → crest đầu trang (thay emoji 🎓),
 *   - vừa  → vòng triện quanh avatar từng em,
 *   - nhỏ  → con dấu "ĐÃ NHẬN XÉT" đóng nghiêng lên thẻ.
 *
 * Toàn bộ vẽ bằng inline SVG `currentColor` nên tự đổi theo `--sc-brass` của
 * từng mode, không cần hai bộ file ảnh. KHÔNG dùng emoji ở đây: emoji mỗi hệ
 * điều hành một kiểu, phá ngay bản sắc vừa dựng.
 */

/** Mũ tốt nghiệp — hình gốc lấy từ icon app, đặt vừa khung 64×64. */
function CapGlyph() {
  return (
    <g
      transform="translate(12 13.9) scale(1.25)"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 7 5 12.5 16 18l11-5.5L16 7Z" />
      <path d="M9 14.5V19c0 1.4 3.1 2.8 7 2.8s7-1.4 7-2.8v-4.5" />
      <path d="M27 12.5v5.5" />
    </g>
  );
}

/**
 * Con triện tròn. `withRibbon` thả thêm hai dải ruy băng bên dưới — chỉ dùng cho
 * bản lớn ở đầu trang, các cỡ nhỏ để trần cho gọn.
 */
export function GraduationSeal({
  size = 64,
  withRibbon = false,
  className,
}: {
  size?: number;
  withRibbon?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 78"
      width={size}
      height={(size * 78) / 64}
      className={className}
      role="img"
      aria-label="Triện tốt nghiệp"
    >
      {withRibbon && (
        <g fill="currentColor" opacity="0.85">
          <path d="M22 52 18 76l7-5 6 4 1-23z" />
          <path d="M42 52 46 76l-7-5-6 4-1-23z" />
        </g>
      )}
      <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* Viền khía của con dấu: nét đứt dày, không phải đường liền cho có. */}
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="1.5 4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="1" />
      <CapGlyph />
    </svg>
  );
}

/** Vòng triện khía quanh avatar — cùng ngôn ngữ nét với con dấu lớn. */
export function SealRing({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <circle cx="32" cy="32" r="31" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle
        cx="32"
        cy="32"
        r="27.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="1.5 4"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

/** Ngôi sao chấm điểm — nét đồng thau, đặc khi đã chọn. */
export function StarIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 1 : 1.6}
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M12 3.2l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.6l6.1-.8z" />
    </svg>
  );
}

/** Tim — accent đất nung, đặc khi đã thả. */
export function HeartIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M12 20.3s-7.5-4.6-7.5-9.6a4.3 4.3 0 0 1 7.5-2.9 4.3 4.3 0 0 1 7.5 2.9c0 5-7.5 9.6-7.5 9.6Z" />
    </svg>
  );
}

/** Dấu tick trước mỗi chức năng — đọc như một mục thành tích trên bằng khen. */
export function CheckMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="m3 8.5 3.5 3.5L13 4.5" />
    </svg>
  );
}

export function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M6.5 6.5 4.9 4.9M19.1 19.1l-1.6-1.6M17.5 6.5l1.6-1.6M4.9 19.1l1.6-1.6" />
    </svg>
  );
}

export function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M20 14.4A8.5 8.5 0 0 1 9.6 4a8.5 8.5 0 1 0 10.4 10.4Z" />
    </svg>
  );
}
