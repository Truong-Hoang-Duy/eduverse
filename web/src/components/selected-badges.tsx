"use client";

import { Badge } from "@/components/ui/badge";

/** Danh sách badge cho các mục ĐÃ CHỌN, bấm ✕ để bỏ chọn (không xóa khỏi danh
 *  mục — khác `MultiSelect.onDelete`). Dùng khi không còn ô tìm-tích riêng,
 *  chỉ còn nguồn thêm mục là combo áp nhanh (yêu cầu user 2026-08-28: bỏ
 *  MultiSelect khỏi Điểm mạnh/Cần cải thiện). */
export function SelectedBadges({
  selected,
  onChange,
  emptyText,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
}) {
  function remove(label: string) {
    onChange(selected.filter((l) => l !== label));
  }

  if (selected.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {emptyText ?? "Chưa chọn — áp một bộ combo bên trên."}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-md">
        {selected.map((label) => (
          <Badge
            key={label}
            variant="secondary"
            className="h-auto max-w-full cursor-pointer gap-1 rounded-md font-normal whitespace-normal"
            onClick={() => remove(label)}
            title="Bấm để bỏ chọn"
          >
            <span className="min-w-0 break-words">{label}</span>
            <span className="shrink-0 text-muted-foreground">✕</span>
          </Badge>
        ))}
      </div>
      {/* type="button": nằm trong <form> nhận xét, thiếu là bấm thành submit. */}
      <button
        type="button"
        onClick={() => onChange([])}
        className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
      >
        ✕ Bỏ chọn tất cả ({selected.length})
      </button>
    </div>
  );
}
