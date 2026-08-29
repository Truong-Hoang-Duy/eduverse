import { Dancing_Script, Playfair_Display } from "next/font/google";

/**
 * Font riêng của khu triển lãm phụ huynh, khai ở MỘT chỗ.
 *
 * Vì sao là module riêng chứ không nằm trong `layout.tsx`: popup của Radix được
 * portal ra thẳng `<body>`, tức NGOÀI cây DOM của layout, nên nó không thừa kế
 * được biến `--font-*`. Trang (Server Component) phải truyền chuỗi class này
 * xuống để gắn thêm lên popup. Gọi `Playfair_Display()` hai lần ở hai file là
 * tải hai lần — nên cả layout lẫn trang cùng import từ đây.
 */

// Serif tương phản cao — chất "in trên bằng khen". Có subset `vietnamese` nên
// dấu tiếng Việt dựng đúng, không phải chắp vá từ font dự phòng.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Chữ viết tay dùng ĐÚNG MỘT CHỖ: tên giáo viên ở chân trang, như chữ ký dưới
// giấy khen. Dùng rộng hơn là rơi vào sến ngay.
const dancing = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin", "vietnamese"],
  weight: ["600"],
  display: "swap",
});

export const showcaseFontClass = `${playfair.variable} ${dancing.variable}`;
