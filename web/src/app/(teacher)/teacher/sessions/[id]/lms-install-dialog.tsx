"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EXTENSION_PATH = "d:\\Project\\Eduverse\\extensions\\codeluma-lms-bridge";

/**
 * Hướng dẫn cài 1 lần duy nhất tiện ích mở rộng Chrome `CodeLuma → MindX LMS`
 * khi giáo viên bấm "Gửi sang LMS" mà trình duyệt chưa bật tiện ích.
 */
export function LmsInstallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copiedPath, setCopiedPath] = useState(false);

  async function handleCopyPath() {
    try {
      await navigator.clipboard.writeText(EXTENSION_PATH);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span>🚀</span> Cài tiện ích kết nối MindX LMS (1 lần duy nhất)
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Vì trình duyệt chặn 2 trang web khác tên miền tự điền ô cho nhau, bạn chỉ cần cài
            tiện ích nội bộ đi kèm dự án (30 giây) để bấm 1 nút là điền tự động cho cả 14 buổi.
            Tiện ích chỉ điền trên giao diện và <strong>không bao giờ tự bấm Save</strong>.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-2.5 text-xs text-foreground list-decimal pl-4 leading-relaxed">
          <li>
            Mở tab mới trên Chrome/Edge và truy cập{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              chrome://extensions/
            </code>
          </li>
          <li>
            Bật công tắc <strong>Developer mode</strong> (Chế độ dành cho nhà phát triển) ở góc trên
            bên phải.
          </li>
          <li>
            Bấm <strong>Load unpacked</strong> (Tải tiện ích đã giải nén) và chọn thư mục:
            <div className="mt-1.5 flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-[11px]">
                {EXTENSION_PATH}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPath}
                className="h-6 px-2 text-[11px] shrink-0 cursor-pointer"
              >
                {copiedPath ? "✓ Đã chép" : "Chép đường dẫn"}
              </Button>
            </div>
          </li>
          <li>
            Tải lại (<strong>F5</strong>) cả trang <strong>CodeLuma</strong> và tab{" "}
            <strong>MindX LMS</strong> đang mở, sau đó bấm lại <strong>🚀 Gửi sang LMS</strong>.
          </li>
        </ol>

        <DialogFooter>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs cursor-pointer"
          >
            Đã hiểu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
