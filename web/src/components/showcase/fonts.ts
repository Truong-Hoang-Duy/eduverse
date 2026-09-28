import localFont from "next/font/local";

/**
 * Font riêng của khu triển lãm phụ huynh, khai ở MỘT chỗ.
 * Dùng font local trong source để hoạt động 100% offline và loại bỏ hoàn toàn lỗi Turbopack font.
 */

// Serif tương phản cao — chất "in trên bằng khen".
const playfair = localFont({
  src: "../../app/fonts/PlayfairDisplay-Variable.ttf",
  variable: "--font-playfair",
  display: "swap",
});

// Chữ viết tay dùng ĐÚNG MỘT CHỖ: tên giáo viên ở chân trang
const dancing = localFont({
  src: "../../app/fonts/DancingScript-Variable.ttf",
  variable: "--font-dancing",
  display: "swap",
});

export const showcaseFontClass = `${playfair.variable} ${dancing.variable}`;
