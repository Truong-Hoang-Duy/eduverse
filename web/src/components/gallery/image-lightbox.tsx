"use client";

import { useCallback, useEffect, useRef } from "react";
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

  const touchStartX = useRef<number | null>(null);
  const lastNavTime = useRef<number>(0);

  const navigateSafe = useCallback(
    (newIndex: number) => {
      const now = Date.now();
      if (now - lastNavTime.current < 200) return;
      lastNavTime.current = now;
      onNavigate(newIndex);
    },
    [onNavigate]
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      } else if (
        (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") &&
        images.length > 1 &&
        currentIndex !== null
      ) {
        e.preventDefault();
        e.stopPropagation();
        navigateSafe((currentIndex - 1 + images.length) % images.length);
      } else if (
        (e.key === "ArrowRight" || e.key === "d" || e.key === "D") &&
        images.length > 1 &&
        currentIndex !== null
      ) {
        e.preventDefault();
        e.stopPropagation();
        navigateSafe((currentIndex + 1) % images.length);
      }
    }

    // Bắt sự kiện ở Capture Phase để chạy trước khi Radix Dialog ở window/document bắt được
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, currentIndex, images.length, onClose, navigateSafe]);

  if (!isOpen || !currentImage || typeof document === "undefined") {
    return null;
  }

  const hasMultiple = images.length > 1;

  const stopPointer = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  const handlePrev = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    if (currentIndex !== null) {
      navigateSafe((currentIndex - 1 + images.length) % images.length);
    }
  };

  const handleNext = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    if (currentIndex !== null) {
      navigateSafe((currentIndex + 1) % images.length);
    }
  };

  const handleClose = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    onClose();
  };

  const handleSelectThumbnail = (e: React.SyntheticEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    navigateSafe(idx);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || currentIndex === null || !hasMultiple) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Vuốt sang trái -> Ảnh tiếp theo
        navigateSafe((currentIndex + 1) % images.length);
      } else {
        // Vuốt sang phải -> Ảnh trước
        navigateSafe((currentIndex - 1 + images.length) % images.length);
      }
    }
    touchStartX.current = null;
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
      data-lightbox-overlay="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={stopPointer}
      onMouseDown={stopPointer}
    >
      {/* 1. Backdrop nền tối toàn màn hình: Bấm vào vùng ngoài khung ảnh sẽ đóng phóng to và trở về modal dự án */}
      <div
        className="absolute inset-0 bg-black/92 backdrop-blur-md cursor-pointer transition-opacity"
        aria-label="Bấm ra ngoài để đóng xem ảnh và về lại dự án"
        title="Bấm ra ngoài để về lại dự án (ESC)"
        onPointerDown={stopPointer}
        onClick={handleClose}
      />

      {/* 2. Thanh công cụ phía trên */}
      <div
        className="absolute top-4 inset-x-4 flex items-center justify-between z-40 max-w-6xl mx-auto pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={stopPointer}
      >
        <div className="flex items-center gap-2">
          {hasMultiple && currentIndex !== null && (
            <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/20 shadow-xs">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-md border border-white/20 transition-all hover:bg-black/90 hover:text-white shadow-xs"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span>Mở ảnh gốc</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* Nút X đóng ở góc phải trên: Đóng phóng to và về lại xem chi tiết dự án */}
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={handleClose}
          aria-label="Đóng xem ảnh và về lại xem dự án"
          title="Đóng (ESC)"
          className="flex size-10 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md border border-white/25 transition-all hover:bg-black/95 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* 3. Nút lùi (ảnh trước - ◀ ở mép trái màn hình) */}
      {hasMultiple && currentIndex !== null && (
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={handlePrev}
          aria-label="Ảnh trước"
          title="Ảnh trước (← hoặc A)"
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-40 flex size-12 sm:size-14 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md border border-white/30 transition-all hover:bg-black/95 hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
        >
          <ChevronLeft className="size-7 sm:size-8" />
        </button>
      )}

      {/* 4. Khung ảnh chính phóng to */}
      <div
        className="relative max-h-[76vh] sm:max-h-[80vh] max-w-[88vw] flex items-center justify-center pointer-events-auto z-10"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={stopPointer}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={currentImage}
          src={currentImage}
          alt={`Ảnh sản phẩm ${currentIndex !== null ? currentIndex + 1 : ""}`}
          className="max-h-[76vh] sm:max-h-[80vh] max-w-[88vw] rounded-xl object-contain shadow-2xl border border-white/15 transition-all animate-in fade-in zoom-in-95 duration-150"
        />
      </div>

      {/* 5. Nút tiến (ảnh tiếp theo - ▶ ở mép phải màn hình) */}
      {hasMultiple && currentIndex !== null && (
        <button
          type="button"
          onPointerDown={stopPointer}
          onClick={handleNext}
          aria-label="Ảnh tiếp theo"
          title="Ảnh tiếp theo (→ hoặc D)"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex size-12 sm:size-14 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md border border-white/30 transition-all hover:bg-black/95 hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
        >
          <ChevronRight className="size-7 sm:size-8" />
        </button>
      )}

      {/* 6. Dải thumbnail thu nhỏ ở đáy màn hình Lightbox */}
      {hasMultiple && (
        <div
          className="absolute bottom-4 inset-x-4 flex justify-center items-center z-40 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={stopPointer}
        >
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 max-w-[92vw] overflow-x-auto scrollbar-none shadow-2xl">
            {images.map((url, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={url + idx}
                  type="button"
                  onPointerDown={stopPointer}
                  onClick={(e) => handleSelectThumbnail(e, idx)}
                  className={`group relative size-11 sm:size-13 shrink-0 rounded-lg overflow-hidden transition-all cursor-pointer ${
                    isCurrent
                      ? "ring-2 ring-white scale-105 opacity-100 shadow-lg"
                      : "opacity-45 hover:opacity-85 hover:scale-102 border border-white/20"
                  }`}
                  aria-label={`Xem ảnh ${idx + 1}`}
                  title={`Ảnh ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-0.5 rounded-xs bg-black/80 px-1 py-0.2 text-[9px] font-bold text-white leading-none">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
