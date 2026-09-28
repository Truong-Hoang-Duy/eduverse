import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Be Vietnam Pro: sans-serif hiện đại, thiết kế riêng cho dấu tiếng Việt nên
// các dấu (ắ, ệ, ỡ...) cân đối, không bị chồng lên chữ như font Latin thường.
// Tải trực tiếp từ source local để 100% offline, loại bỏ triệt để lỗi mạng/Turbopack.
const beVietnamPro = localFont({
  src: [
    {
      path: "./fonts/BeVietnamPro-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/BeVietnamPro-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/BeVietnamPro-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/BeVietnamPro-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

// Mono dùng cho mã lớp/mã khóa
const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.ttf",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eduverse",
  description: "Dashboard quản lý học viên cho lớp học lập trình",
};

// Chạy TRƯỚC khi paint để tránh nháy trắng khi đang ở chế độ tối.
//
// `/showcase` (trang phụ huynh) cố tình KHÔNG ăn theo `prefers-color-scheme`:
// phụ huynh mở link lần đầu giữa buổi lễ, điện thoại để chế độ tối là trang
// "Bảng vàng" ra tối om trong khi bản sắc của nó là giấy khen nền ngà (user
// chốt 2026-09-04). Chỉ vào tối khi người xem TỰ bấm nút đổi (lưu 'theme').
const THEME_SCRIPT = `
try {
  var t = localStorage.getItem('theme');
  var showcase = location.pathname.indexOf('/showcase') === 0;
  if (t === 'dark' || (!t && !showcase && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: script theme bên dưới (và các extension như
    // Grammarly) sửa attribute của <html> trước khi React hydrate.
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body
        className={`${beVietnamPro.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
