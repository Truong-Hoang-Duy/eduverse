"use client";

import { useEffect } from "react";

/**
 * Ngăn chặn zoom in / zoom out trên thiết bị di động khi popup/modal đang mở.
 *
 * Mặc định trên iOS Safari và Android Chrome, cử chỉ pinch-to-zoom (2 ngón tay),
 * chạm đúp (double-tap), hoặc zoom khi mở modal sẽ làm hỏng tỉ lệ hiển thị (phá
 * vỡ layout fixed của dialog, khiến nút bấm và nội dung bị tràn ra ngoài màn hình).
 *
 * Hook này thực hiện 3 lớp bảo vệ khi `isOpen === true`:
 * 1. Cập nhật thẻ `<meta name="viewport">` thành `maximum-scale=1.0, user-scalable=no`
 *    và khôi phục lại giá trị ban đầu khi đóng popup.
 * 2. Chặn các sự kiện cảm ứng đa điểm (`touchmove` với > 1 ngón tay).
 * 3. Chặn các sự kiện cử chỉ của WebKit/Safari (`gesturestart`, `gesturechange`, `gestureend`).
 */
export function usePreventZoomWhenOpen(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    let viewportMeta = document.querySelector('meta[name="viewport"]');
    const originalContent = viewportMeta?.getAttribute("content") ?? null;
    const lockedContent =
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";

    if (viewportMeta) {
      viewportMeta.setAttribute("content", lockedContent);
    } else {
      viewportMeta = document.createElement("meta");
      viewportMeta.setAttribute("name", "viewport");
      viewportMeta.setAttribute("content", lockedContent);
      document.head.appendChild(viewportMeta);
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const onGesture = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("gesturestart", onGesture, { passive: false });
    document.addEventListener("gesturechange", onGesture, { passive: false });
    document.addEventListener("gestureend", onGesture, { passive: false });

    return () => {
      if (viewportMeta) {
        if (originalContent !== null) {
          viewportMeta.setAttribute("content", originalContent);
        } else {
          viewportMeta.setAttribute("content", "width=device-width, initial-scale=1.0");
        }
      }
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("gesturestart", onGesture);
      document.removeEventListener("gesturechange", onGesture);
      document.removeEventListener("gestureend", onGesture);
    };
  }, [isOpen]);
}
