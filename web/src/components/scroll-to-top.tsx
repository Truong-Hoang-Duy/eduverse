"use client";

import { useEffect, useState } from "react";

/** Nút nổi góc dưới-phải: cuộn xuống một đoạn mới hiện, bấm về đầu trang.
 *  Đặt trong AppShell nên có ở mọi trang đã đăng nhập. Trang cuộn theo window
 *  (AppShell là flex-col cao tối thiểu màn hình) nên dùng window.scrollTo. */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Lên đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed right-4 bottom-4 z-50 flex size-11 items-center justify-center rounded-full border bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6"
    >
      <span aria-hidden className="text-lg leading-none">
        ↑
      </span>
    </button>
  );
}
