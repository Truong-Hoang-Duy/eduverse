"use client";

import { useEffect } from "react";

const STORAGE_KEY = "eduverse_ai_last_warmup";
// 10 phút (600_000 ms) — định kỳ dưới mốc 15 phút ngủ đông của Render
const WARMUP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Component vô hình chạy ngầm ở phía client để tự động đánh thức AI service (Render free).
 * Khi giáo viên mở dashboard hoặc vào trang lớp, component sẽ gửi tín hiệu khởi động ngầm
 * để khi giáo viên bấm "AI tạo nhận xét" hoặc chấm bài, AI đã sẵn sàng phản hồi ngay.
 */
export function AiWarmup() {
  useEffect(() => {
    try {
      const lastWarmup = sessionStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      if (!lastWarmup || now - Number(lastWarmup) > WARMUP_INTERVAL_MS) {
        sessionStorage.setItem(STORAGE_KEY, String(now));
        // Gọi API warmup ngầm, không ảnh hưởng đến trải nghiệm người dùng
        fetch("/api/ai-warmup", {
          method: "GET",
        }).catch(() => {
          // Bỏ qua lỗi ngầm
        });
      }
    } catch {
      // Tránh lỗi khi chạy trong môi trường bảo mật cao (chặn storage)
    }
  }, []);

  return null;
}
