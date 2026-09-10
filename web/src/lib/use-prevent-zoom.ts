"use client";

import { useEffect } from "react";

/**
 * Ngăn chặn zoom in / zoom out trên thiết bị di động.
 *
 * Mặc định trên iOS Safari và Android Chrome:
 * 1. Cử chỉ pinch-to-zoom (chụm/mở 2 ngón tay) sẽ phóng to cả trang web làm tràn
 *    màn hình, phá vỡ layout, các thanh điều hướng và nút bấm bị đẩy ra ngoài.
 * 2. Thao tác chạm đúp (double-tap) có thể vô tình kích hoạt zoom.
 * 3. Khi người dùng bấm vào ô input/textarea có cỡ chữ nhỏ hơn 16px (text-sm = 14px),
 *    iOS Safari sẽ TỰ ĐỘNG phóng to trang web để focus, và giữ nguyên độ phóng to đó
 *    kể cả sau khi nhập xong, làm bể hoàn toàn giao diện.
 *
 * Hook này thực hiện các lớp bảo vệ khi `active === true`:
 * 1. Cập nhật thẻ `<meta name="viewport">` thành `maximum-scale=1.0, user-scalable=no`
 *    và khôi phục lại giá trị ban đầu khi unmount.
 * 2. Chặn cử chỉ pinch-to-zoom: chặn sự kiện cảm ứng đa điểm (`touchmove` với > 1 ngón tay).
 * 3. Chặn cử chỉ zoom WebKit/Safari (`gesturestart`, `gesturechange`, `gestureend`).
 * 4. Chặn double-tap zoom (`touchend` liên tiếp < 300ms ngoài các phần tử tương tác).
 */
export function usePreventZoom(active: boolean = true) {
  useEffect(() => {
    if (!active || typeof window === "undefined" || typeof document === "undefined") {
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

    // Chặn pinch-to-zoom bằng 2 ngón tay
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Chặn cử chỉ zoom đặc thù của Safari / iOS
    const onGesture = (e: Event) => {
      e.preventDefault();
    };

    // Chặn double-tap to zoom
    let lastTouchEnd = 0;
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        const target = e.target as HTMLElement | null;
        // Không chặn nếu đang bấm vào nút bấm, link hoặc ô nhập liệu
        const isInteractive = target?.closest(
          "button, a, input, select, textarea, [role='button'], [role='tab']"
        );
        if (!isInteractive) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("gesturestart", onGesture, { passive: false });
    document.addEventListener("gesturechange", onGesture, { passive: false });
    document.addEventListener("gestureend", onGesture, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });

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
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [active]);
}

/**
 * Phiên bản dùng khi mở popup/modal (giữ tương thích ngược cho dialog).
 */
export function usePreventZoomWhenOpen(isOpen: boolean) {
  usePreventZoom(isOpen);
}
