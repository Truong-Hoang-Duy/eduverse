"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Dropdown chọn nhiều mục, hiển thị các mục đã chọn dạng badge bấm để bỏ.
 *
 *  `onCreate` (tùy chọn): cho gõ câu MỚI ngay trong ô tìm kiếm — không khớp
 *  mục nào thì hiện dòng "➕ Thêm ..." (hoặc nhấn Enter). Gọn hơn một ô nhập
 *  riêng nằm bên dưới (yêu cầu user 2026-07-27). */
export function MultiSelect({
  options,
  selected,
  onChange,
  onCreate,
  placeholder = "Chọn...",
  emptyText,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  onCreate?: (label: string) => void;
  placeholder?: string;
  emptyText?: string;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim();
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  // Cho tạo mục mới khi có onCreate + đang gõ + không trùng KHÍT mục nào sẵn có.
  const canCreate =
    Boolean(onCreate) &&
    query.length > 0 &&
    !options.some((o) => o.label.toLowerCase() === query.toLowerCase());

  function toggle(label: string) {
    onChange(
      selected.includes(label)
        ? selected.filter((l) => l !== label)
        : [...selected, label]
    );
  }

  function handleCreate() {
    if (!canCreate) return;
    onCreate!(query);
    setSearch("");
  }

  // Không còn ô nhập riêng bên dưới, nên khi rỗng danh mục vẫn phải cho gõ mới.
  if (options.length === 0 && !onCreate) {
    return (
      <p className="text-xs text-muted-foreground">
        {emptyText ?? "Chưa có lựa chọn."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <DropdownMenu onOpenChange={(open) => !open && setSearch("")}>
        <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring">
          <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
            {selected.length === 0 ? placeholder : `Đã chọn ${selected.length}`}
          </span>
          <span className="text-xs text-muted-foreground">▾</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-72 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto"
        >
          <div className="p-1 pb-0">
            <Input
              autoFocus
              placeholder={onCreate ? "Tìm hoặc gõ câu mới rồi Enter..." : "Tìm kiếm..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              // Ngăn Radix bắt phím để gõ tìm kiếm không bị menu chặn/đóng;
              // Enter thì tạo mục mới (nếu đang gõ câu chưa có).
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && canCreate) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              className="mb-1"
            />
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={handleCreate}
              className="mb-1 flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
            >
              ➕ Thêm &quot;{query}&quot;
            </button>
          )}

          {filteredOptions.length === 0 && !canCreate ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Không tìm thấy lựa chọn phù hợp.
            </p>
          ) : (
            filteredOptions.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.id}
                checked={selected.includes(opt.label)}
                // Giữ menu mở để tick nhiều mục liên tiếp.
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggle(opt.label)}
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selected.length > 0 && (
        <div className="space-y-1.5">
          {/* Giới hạn chiều cao + cuộn: nhiều/ dài mấy cũng KHÔNG đẩy vỡ bố cục
              (trước đây badge tràn xuống làm bể layout — user phản ánh 2026-07-27). */}
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-md">
            {selected.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="h-auto max-w-full cursor-pointer gap-1 rounded-md font-normal whitespace-normal"
                onClick={() => toggle(label)}
                title="Bấm để bỏ chọn"
              >
                <span className="min-w-0 break-words">{label}</span>
                <span className="shrink-0 text-muted-foreground">✕</span>
              </Badge>
            ))}
          </div>
          {/* type="button": ô này nằm trong <form> nhận xét, thiếu là bấm thành submit. */}
          <button
            type="button"
            onClick={() => onChange([])}
            className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
          >
            ✕ Bỏ chọn tất cả ({selected.length})
          </button>
        </div>
      )}
    </div>
  );
}
