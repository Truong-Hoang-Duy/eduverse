"use client";

/**
 * Vùng thả file dùng chung cho cả 3 công cụ AI của khu Chấm bài.
 *
 * Thao tác giống nhau ở cả 3 (user chốt 2026-07-31): bấm ĐÂU trong ô cũng mở hộp
 * thoại chọn file, kèm nút "Chọn cả thư mục" riêng. Trước đây tab sản phẩm cuối
 * khóa bắt phải bấm đúng nút — không có lý do nghiệp vụ nào, chỉ là viết sau nên
 * lệch.
 */

import type { ReactNode, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { SUBMISSION_ACCEPT } from "@/lib/file-check";

export interface DropzoneHandlers {
  dragging: boolean;
  reading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  folderInputRef: RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent<HTMLElement>) => void;
  onInputChange: (list: FileList | null, input: HTMLInputElement | null) => void;
  onDragEnter: (e: React.DragEvent<HTMLElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
}

export function SubmissionDropzone({
  handlers,
  idleIcon,
  idleLabel,
  hint,
  /** Bỏ `accept` khi tool nhận mọi đuôi (đường sản phẩm đọc chữ). */
  accept = SUBMISSION_ACCEPT,
}: {
  handlers: DropzoneHandlers;
  idleIcon: string;
  idleLabel: string;
  hint: ReactNode;
  accept?: string;
}) {
  const { dragging, reading, fileInputRef, folderInputRef } = handlers;

  return (
    <>
      {/* Dùng div + onClick chứ KHÔNG phải <label>: bên trong có nút "Chọn cả
          thư mục" riêng, nằm trong <label> thì bấm nút đó kích hoạt cả label. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handlers.onDragEnter}
        // Thiếu preventDefault ở dragOver là trình duyệt tự mở file thay vì thả.
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
        className={`space-y-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-accent/40 ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        } cursor-pointer`}
      >
        <p className="text-3xl leading-none" aria-hidden="true">
          {dragging ? "📥" : idleIcon}
        </p>
        <p className="text-base font-medium">
          {reading ? "Đang đọc file..." : idleLabel}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={reading}
          // Hộp thoại "Upload N files to this site?" là UI bảo mật của trình
          // duyệt khi đọc thư mục — KHÔNG sửa/bỏ được, chỉ báo trước bằng
          // tooltip cho GV đỡ giật mình.
          title="Trình duyệt sẽ hỏi xác nhận trước khi đọc thư mục — bấm Upload. File vẫn không được lưu lại ở đâu."
          // Chặn nổi bọt, nếu không ô ngoài cũng mở hộp thoại chọn FILE.
          onClick={(e) => {
            e.stopPropagation();
            folderInputRef.current?.click();
          }}
        >
          📁 Chọn cả thư mục
        </Button>
      </div>

      {/* Chữ "Choose Files / No file chosen" của input gốc do trình duyệt sinh,
          không đổi được sang tiếng Việt → ẩn input, để ô trên điều khiển. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={(e) => handlers.onInputChange(e.target.files, e.target)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      {/* webkitdirectory không có trong type của React → phải spread vào. */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => handlers.onInputChange(e.target.files, e.target)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <p className="text-xs text-muted-foreground">{hint}</p>
    </>
  );
}
