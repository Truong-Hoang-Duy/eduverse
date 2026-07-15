import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";

// Be Vietnam Pro: sans-serif hiện đại, thiết kế riêng cho dấu tiếng Việt nên
// các dấu (ắ, ệ, ỡ...) cân đối, không bị chồng lên chữ như font Latin thường.
// Tên biến PHẢI là --font-sans để khớp @theme trong globals.css.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Mono chỉ dùng cho mã lớp/mã khóa (ASCII) nên không cần subset vietnamese.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eduverse",
  description: "Dashboard quản lý học viên cho lớp học lập trình",
};

// Chạy TRƯỚC khi paint để tránh nháy trắng khi đang ở chế độ tối.
const THEME_SCRIPT = `
try {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
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
