"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

export interface EducationalToastProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

/**
 * Hook quản lý trạng thái hiển thị thông báo nổi sư phạm (Educational Toast).
 */
export function useEducationalToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const hideToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return { toastMessage, showToast, hideToast };
}

/**
 * Thông báo nổi (Toast) thân thiện khi phát hiện từ ngữ chưa phù hợp chuẩn mực sư phạm.
 * Nổi ở vị trí trên cùng màn hình, thiết kế thanh lịch, có nút tắt và tự biến mất sau 4.5s.
 */
export function EducationalToast({
  message,
  onClose,
  duration = 4500,
}: EducationalToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="educational-toast"
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] w-[92vw] max-w-md pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-card/95 p-3.5 sm:p-4 shadow-[0_12px_40px_-8px_rgba(245,158,11,0.35)] backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10">
            {/* Thanh gradient trên cùng tạo điểm nhấn */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 animate-pulse" />

            <div className="flex items-start gap-3">
              {/* Huy hiệu mầm xanh sư phạm */}
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-2xs border border-amber-500/30">
                <span className="text-lg leading-none" role="img" aria-label="Mầm xanh">
                  🌱
                </span>
              </div>

              {/* Nội dung thông điệp */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Nhắc nhở thân thiện
                  </h4>
                  <Sparkles className="size-3 text-amber-500" />
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-foreground font-medium">
                  {message}
                </p>
              </div>

              {/* Nút đóng nhanh */}
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 -mr-1 -mt-1 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                aria-label="Đóng thông báo"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
