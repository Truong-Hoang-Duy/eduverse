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
 *  fullscreen trình duyệt nên hai trạng thái tự đồng bộ). */
export function TvOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto max-w-screen-2xl space-y-6 p-8">{children}</div>
    </div>
  );
}
