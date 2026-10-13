"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import { SafeImage } from "@/components/safe-image";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const BUTTON_STEP = 1.6;
const TAP_MAX_MOVE = 8;
const DOUBLE_TAP_MS = 300;

type View = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

const IDENTITY: View = { scale: 1, x: 0, y: 0 };

/**
 * Ảnh zoom TẠI CHỖ (không mở popup phụ): chạm đúp / Ctrl+cuộn / chụm 2 ngón / nút +−
 * để phóng, kéo để di chuyển khi đang phóng. Trang showcase khóa pinch-zoom của
 * trình duyệt (`usePreventZoom`) nên cử chỉ được tự xử lý bằng Pointer Events.
 *
 * Khi chưa zoom, cho phép cuộn dọc trang (`touch-action: pan-y`) để ảnh lớn
 * không "nuốt" thao tác cuộn; chỉ khi đang zoom mới chiếm hẳn cử chỉ.
 */
export function ZoomableImage({
  src,
  alt,
  onZoomChange,
}: {
  src: string;
  alt: string;
  onZoomChange?: (zoomed: boolean) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>(IDENTITY);
  const pointers = useRef<Map<number, Point>>(new Map());
  const pinchDistance = useRef<number | null>(null);
  const tap = useRef<{ time: number; x: number; y: number } | null>(null);
  const moved = useRef(0);
  const [view, setView] = useState<View>(IDENTITY);
  const [gesturing, setGesturing] = useState(false);

  const zoomed = view.scale > 1;

  const commit = useCallback((next: View) => {
    const frame = frameRef.current;
    const img = contentRef.current?.querySelector("img");
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
    let { x, y } = next;
    if (frame && img && scale > 1) {
      const maxX = Math.max(0, (img.offsetWidth * scale - frame.clientWidth) / 2);
      const maxY = Math.max(0, (img.offsetHeight * scale - frame.clientHeight) / 2);
      x = Math.min(maxX, Math.max(-maxX, x));
      y = Math.min(maxY, Math.max(-maxY, y));
    } else {
      x = 0;
      y = 0;
    }
    const clamped = scale > 1 ? { scale, x, y } : IDENTITY;
    viewRef.current = clamped;
    setView(clamped);
  }, []);

  // Đổi ảnh thì về trạng thái gốc.
  useEffect(() => {
    commit(IDENTITY);
  }, [src, commit]);

  useEffect(() => {
    onZoomChange?.(zoomed);
  }, [zoomed, onZoomChange]);

  // Điểm bấm tính theo tâm khung (transform-origin: center).
  const toCenter = useCallback((clientX: number, clientY: number): Point => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
  }, []);

  // Zoom sao cho điểm `p` đứng yên dưới ngón tay / con trỏ.
  const zoomAt = useCallback(
    (nextScale: number, p: Point) => {
      const v = viewRef.current;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      const ratio = scale / v.scale;
      commit({ scale, x: p.x - (p.x - v.x) * ratio, y: p.y - (p.y - v.y) * ratio });
    },
    [commit],
  );

  // Ctrl+cuộn (cũng là cử chỉ chụm trên touchpad). Cuộn thường vẫn cuộn trang.
  // Phải gắn thủ công vì React gắn `wheel` ở dạng passive, không preventDefault được.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomAt(viewRef.current.scale * Math.exp(-e.deltaY * 0.01), toCenter(e.clientX, e.clientY));
    }
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [zoomAt, toCenter]);

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGesturing(true);
    if (pointers.current.size === 1) moved.current = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
      tap.current = null;
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    moved.current += Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);

    if (pointers.current.size >= 2 && pinchDistance.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = toCenter((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAt(viewRef.current.scale * (distance / pinchDistance.current), mid);
      pinchDistance.current = distance;
      return;
    }

    if (viewRef.current.scale > 1) {
      const v = viewRef.current;
      commit({ ...v, x: v.x + (cur.x - prev.x), y: v.y + (cur.y - prev.y) });
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const wasTracked = pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = null;
    if (!wasTracked || e.type === "pointercancel") return;

    // Chỉ coi là "chạm" khi gần như không di chuyển và không phải cuối cử chỉ chụm.
    if (moved.current > TAP_MAX_MOVE || pointers.current.size > 0) {
      tap.current = null;
      return;
    }
    const now = Date.now();
    const last = tap.current;
    if (
      last &&
      now - last.time < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30
    ) {
      tap.current = null;
      if (viewRef.current.scale > 1) commit(IDENTITY);
      else zoomAt(DOUBLE_TAP_SCALE, toCenter(e.clientX, e.clientY));
    } else {
      tap.current = { time: now, x: e.clientX, y: e.clientY };
    }
  }

  function stepZoom(factor: number) {
    zoomAt(viewRef.current.scale * factor, { x: 0, y: 0 });
  }

  return (
    <div ref={frameRef} className="relative size-full overflow-hidden">
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: zoomed ? "none" : "pan-y" }}
        className={`absolute inset-0 select-none ${zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        title="Chạm đúp để phóng to"
      >
        <div
          ref={contentRef}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transition: gesturing ? "none" : "transform 150ms ease-out",
          }}
          className="flex size-full items-center justify-center p-2 sm:p-4 will-change-transform [&_img]:pointer-events-none [&_img]:select-none"
        >
          <SafeImage
            src={src}
            alt={alt}
            className="max-h-full max-w-full rounded-lg object-contain drop-shadow-xl"
          />
        </div>
      </div>

      {/* Nút điều khiển zoom - nằm NGOÀI lớp cử chỉ nên không bị nuốt thao tác bấm. */}
      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 flex items-center gap-1.5">
        {zoomed && (
          <span className="rounded-full bg-black/70 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-white border border-white/20 tabular-nums">
            {Math.round(view.scale * 100)}%
          </span>
        )}
        <ZoomButton label="Thu nhỏ" disabled={!zoomed} onClick={() => stepZoom(1 / BUTTON_STEP)}>
          <Minus className="size-4" />
        </ZoomButton>
        <ZoomButton
          label="Phóng to"
          disabled={view.scale >= MAX_SCALE}
          onClick={() => stepZoom(BUTTON_STEP)}
        >
          <Plus className="size-4" />
        </ZoomButton>
        {zoomed && (
          <ZoomButton label="Về kích thước gốc" onClick={() => commit(IDENTITY)}>
            <RotateCcw className="size-4" />
          </ZoomButton>
        )}
      </div>
    </div>
  );
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md border border-white/25 transition-colors hover:bg-black/90 disabled:opacity-40 disabled:cursor-default cursor-pointer"
    >
      {children}
    </button>
  );
}
