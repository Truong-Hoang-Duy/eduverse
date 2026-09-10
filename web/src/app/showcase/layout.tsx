import type { Viewport } from "next";

import { showcaseFontClass } from "@/components/showcase/fonts";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Bản sắc riêng của khu triển lãm phụ huynh — concept "Bảng vàng" (giấy khen +
 * bảng tin lớp học).
 *
 * Vì sao là layout riêng chứ không sửa layout gốc: font và bảng màu ở đây CHỈ
 * dành cho `/showcase`. Khu giáo viên/học viên vẫn giữ nguyên Be Vietnam Pro +
 * theme indigo. Class `.showcase-theme` (định nghĩa ở `globals.css`) khoanh vùng
 * toàn bộ biến `--sc-*`, nên không có gì rò ra ngoài.
 */
export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ touchAction: "manipulation" }}
      className={`${showcaseFontClass} showcase-theme showcase-surface min-h-dvh`}
    >
      {children}
    </div>
  );
}
