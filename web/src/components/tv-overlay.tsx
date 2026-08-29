"use client";

import { useEffect, type ReactNode } from "react";

/** Gọi TRONG click handler (cần user activation); trình duyệt từ chối cũng không sao. */
export function enterBrowserFullscreen(): void {
  document.documentElement.requestFullscreen?.().catch(() => {});
}

export function exitBrowserFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
}

/** Overlay chiếu TV toàn màn hình: nền app, Esc để thoát (Esc cũng thoát
 *  fullscreen trình duyệt nên hai trạng thái tự đồng bộ).
 *
 *  `fullBleed`: bỏ khung `max-w-screen-2xl p-8` cuộn dọc mặc định, trả nguyên
 *  viewport cho children tự vẽ nền/bố cục — dùng cho các màn thiết kế như MỘT
 *  SLIDE khít khung hình (VD trang QR, thuyết trình sản phẩm), không phải
 *  trang cuộn thông thường. */
export function TvOverlay({
  onClose,
  fullBleed = false,
  children,
}: {
  onClose: () => void;
  fullBleed?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Khóa cuộn trang nền trong lúc chiếu: overlay là `fixed` nên trang bên dưới
  // vẫn cuộn được, để lộ thanh cuộn chạy dọc giữa buổi lễ — trông như màn chiếu
  // bị lỗi. `position: fixed` (chứ không chỉ `overflow: hidden`) vì Safari/iOS
  // bỏ qua `overflow` trên body; đổi lại phải tự nhớ vị trí cũ và trả về đúng
  // chỗ khi thoát, nếu không giáo viên bị ném về đầu trang lớp.
  useEffect(() => {
    const y = window.scrollY;
    const saved = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = saved.position;
      document.body.style.top = saved.top;
      document.body.style.width = saved.width;
      document.body.style.overflow = saved.overflow;
      window.scrollTo(0, y);
    };
  }, []);

  if (fullBleed) {
    return <div className="fixed inset-0 z-50 overflow-hidden">{children}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto max-w-screen-2xl space-y-6 p-8">{children}</div>
    </div>
  );
}
