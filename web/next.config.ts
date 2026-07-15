import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // File bài làm (PDF/ảnh) gửi qua Server Action; mặc định chỉ 1MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
