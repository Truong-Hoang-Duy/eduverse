"use client";

/**
 * Danh sách file chờ gửi AI — dùng chung cho cả 3 công cụ của khu Chấm bài.
 *
 * Hai kiểu dòng, quyết định bởi việc có truyền `onToggle` hay không:
 * - Có → ô tick (tab sản phẩm cuối khóa: GV soát rồi bỏ tick file không muốn gửi).
 * - Không → nút ✕ bỏ hẳn (hai tab kia: danh sách ngắn, bỏ là bỏ luôn).
 *
 * Khác biệt này là chủ ý: project là cả một thư mục nên GV cần soát trước khi
 * tiêu một lượt Gemini; bài tập lẻ thì không.
 */

import { Button } from "@/components/ui/button";
import { describeSkipped, formatBytes, type SkipTally } from "@/lib/submission-files";

interface Row {
  key: string;
  path: string;
  size: number;
}

export function SubmissionFileList<T extends Row>({
  items,
  skipped,
  summary,
  onClear,
  onRemove,
  isExcluded,
  onToggle,
}: {
  items: T[];
  skipped: SkipTally;
  /** Dòng tóm tắt bên trái, VD "12 file sẽ được chấm · 340 KB". */
  summary: string;
  onClear: () => void;
  /** Kiểu nút ✕. Bỏ qua nếu dùng `onToggle`. */
  onRemove?: (key: string) => void;
  isExcluded?: (item: T) => boolean;
  /** Kiểu ô tick. Có hàm này thì `onRemove` không được dùng. */
  onToggle?: (item: T) => void;
}) {
  if (items.length === 0) return null;

  const skippedCount =
    skipped.folder + skipped.junk + skipped.binary + skipped.image + skipped["too-big"];

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium">{summary}</p>
        {/* Nút thật (không phải chữ xám cỡ xs): đây là lối thoát khi GV lỡ chọn
            cả thư mục hàng chục file, mà lúc đó danh sách dài khiến chữ nhỏ càng
            chìm. Không hỏi ConfirmDialog vì danh sách chưa lưu ở đâu — chọn lại
            là xong (ngoại lệ có chủ ý, xem DECISIONS.md). */}
        <Button type="button" variant="destructive" size="sm" onClick={onClear}>
          ✕ Xóa hết {items.length} file
        </Button>
      </div>

      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {items.map((item) =>
          onToggle ? (
            <li key={item.key}>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!isExcluded?.(item)}
                  onChange={() => onToggle(item)}
                  className="size-3.5 shrink-0"
                />
                <span className="min-w-0 flex-1 truncate font-mono">{item.path}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatBytes(item.size)}
                </span>
              </label>
            </li>
          ) : (
            <li
              key={item.key}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="min-w-0 flex-1 truncate font-mono">{item.path}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatBytes(item.size)}
              </span>
              <button
                type="button"
                aria-label={`Bỏ file ${item.path}`}
                onClick={() => onRemove?.(item.key)}
                className="shrink-0 cursor-pointer px-1 text-muted-foreground transition-colors hover:text-destructive"
              >
                ✕
              </button>
            </li>
          )
        )}
      </ul>

      {skippedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Đã bỏ qua {describeSkipped(skipped)}.
        </p>
      )}
    </div>
  );
}
