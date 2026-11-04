import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // File bài làm (PDF/ảnh) gửi qua Server Action; mặc định chỉ 1MB.
      bodySizeLimit: "10mb",
    },
    // Giữ cache trang trên trình duyệt (Client Router Cache) để khi bấm chuyển
    // qua lại giữa các tab/lớp/buổi học sẽ hiện ra tức thì (0ms) như React SPA.
    // Các thao tác thêm/sửa/xóa đều gọi revalidatePath nên vẫn cập nhật ngay.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
