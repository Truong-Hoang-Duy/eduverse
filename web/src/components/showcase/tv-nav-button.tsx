import type { ReactNode } from "react";

/**
 * Nút điều hướng cho các màn hình TV (QR, thuyết trình, tổng kết lớp) — pill
 * viền/đồng thau, cùng ngôn ngữ với `BigLink`/nút "Bạn tiếp →" trên trang phụ
 * huynh, KHÔNG dùng `Button` mặc định của app (ăn theo palette indigo, lạc
 * tông với "Bảng vàng"). To và dễ bấm bằng chuột trình chiếu, không phải ngón
 * tay, nên không cần cỡ 44px như trang điện thoại.
 */
export function TvNavButton({
  children,
  onClick,
  disabled,
  variant = "outline",
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "solid" | "outline" | "ghost";
  ariaLabel?: string;
}) {
  const variants: Record<typeof variant, string> = {
    solid: "bg-sc-brass text-sc-paper hover:opacity-90",
    outline:
      "border border-sc-brass/45 text-sc-brass hover:bg-sc-brass-soft",
    ghost: "text-sc-ink-soft hover:bg-sc-brass-soft hover:text-sc-ink",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-base font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sc-brass focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40 ${variants[variant]}`}
    >
      {children}
    </button>
  );
}
