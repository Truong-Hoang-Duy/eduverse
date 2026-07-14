"use client";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Dropdown chọn nhiều mục, hiển thị các mục đã chọn dạng badge bấm để bỏ. */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Chọn...",
  emptyText,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  function toggle(label: string) {
    onChange(
      selected.includes(label)
        ? selected.filter((l) => l !== label)
        : [...selected, label]
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {emptyText ?? "Chưa có lựa chọn."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring">
          <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
            {selected.length === 0 ? placeholder : `Đã chọn ${selected.length}`}
          </span>
          <span className="text-xs text-muted-foreground">▾</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-64 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto"
        >
          {options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.id}
              checked={selected.includes(opt.label)}
              // Giữ menu mở để tick nhiều mục liên tiếp.
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggle(opt.label)}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className="cursor-pointer gap-1 rounded-md font-normal"
              onClick={() => toggle(label)}
              title="Bấm để bỏ chọn"
            >
              {label}
              <span className="text-muted-foreground">✕</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
