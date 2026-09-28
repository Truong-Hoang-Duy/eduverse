"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";

export function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  images: string[];
  currentIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const isOpen = currentIndex !== null && currentIndex >= 0 && currentIndex < images.length;
  const currentImage = isOpen && currentIndex !== null ? images[currentIndex] : null;

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        // Ngăn các listener khác ở document (như Radix Dialog) bắt được phím Escape
        e.stopImmediatePropagation();
        onClose();
      } else if (e.key === "ArrowLeft" && images.length > 1 && currentIndex !== null) {
        e.preventDefault();
        e.stopPropagation();
        onNavigate((currentIndex - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight" && images.length > 1 && currentIndex !== null) {
        e.preventDefault();
        e.stopPropagation();
        onNavigate((currentIndex + 1) % images.length);
      }
    }

    // Bắt sự kiện ở Capture Phase để chạy trước khi Radix Dialog ở window/document bắt được
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen || !currentImage || typeof document === "undefined") {
    return null;
  }

  const hasMultiple = images.length > 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
      data-lightbox-overlay="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none animate-in fade-in duration-200"
      onPointerDown={(e) => {
        // CỰC KỲ QUAN TRỌNG: Ngăn pointerdown nổi lên document để Radix Dialog bên dưới không tự đóng
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        // Bấm ra ngoài ảnh chỉ đóng lightbox và trở về popup nội dung hiện tại
        e.stopPropagation();
        onClose();
      }}
    >
      {/* Thanh công cụ phía trên */}
      <div
        className="absolute top-4 inset-x-4 flex items-center justify-between z-10 max-w-6xl mx-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {hasMultiple && currentIndex !== null && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/20 shadow-xs">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-md border border-white/20 transition-all hover:bg-white/25 hover:text-white shadow-xs"
          >
            <span>Mở ảnh gốc</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* Nút X đóng ở góc phải trên */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Đóng xem ảnh"
          title="Đóng (ESC)"
          className="flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md border border-white/25 transition-all hover:bg-white/30 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Nút lùi (ảnh trước) */}
      {hasMultiple && currentIndex !== null && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((currentIndex - 1 + images.length) % images.length);
          }}
          aria-label="Ảnh trước"
          title="Ảnh trước (←)"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex size-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md border border-white/25 transition-all hover:bg-white/30 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
        >
          <ChevronLeft className="size-7" />
        </button>
      )}

      {/* Ảnh chính hiển thị phóng to */}
      <div
        className="relative max-h-[85vh] max-w-[90vw] flex items-center justify-center pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt={`Ảnh sản phẩm ${currentIndex !== null ? currentIndex + 1 : ""}`}
          className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl border border-white/15 transition-all"
        />
      </div>

      {/* Nút tiến (ảnh tiếp theo) */}
      {hasMultiple && currentIndex !== null && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((currentIndex + 1) % images.length);
          }}
          aria-label="Ảnh tiếp theo"
          title="Ảnh tiếp theo (→)"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex size-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md border border-white/25 transition-all hover:bg-white/30 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
        >
          <ChevronRight className="size-7" />
        </button>
      )}
    </div>,
    document.body
  );
}
