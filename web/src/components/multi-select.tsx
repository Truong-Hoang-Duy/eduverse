"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SKILL_GROUPS, type SkillGroupOption } from "@/lib/skill-groups";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  label: string;
  skill_group?: string;
}

/** Dropdown chọn nhiều mục, hiển thị các mục đã chọn dạng badge bấm để bỏ.
 *
 *  Hỗ trợ hiển thị chia theo nhóm kỹ năng dạng đóng/mở (accordion) bên trong
 *  dropdown giống trang Cài đặt khi `grouped` bật (hoặc khi options có `skill_group`).
 *
 *  `onCreate` (tùy chọn): cho gõ câu MỚI ngay trong ô tìm kiếm — không khớp
 *  mục nào thì hiện dòng "➕ Thêm ..." (hoặc nhấn Enter).
 *
 *  `onEdit` (tùy chọn): thêm nút ✏️ trên từng mục để chỉnh sửa nội dung lựa chọn
 *  ngay trong danh mục dùng chung.
 *
 *  `onDelete` (tùy chọn): thêm dấu ✕ trên từng mục để xóa khỏi DANH MỤC dùng
 *  chung (khác dấu ✕ trên badge đã chọn — cái đó chỉ bỏ chọn). */
export function MultiSelect({
  options,
  selected,
  onChange,
  onCreate,
  onEdit,
  onDelete,
  groups,
  grouped,
  placeholder = "Chọn...",
  emptyText,
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  onCreate?: (label: string, skillGroup?: string) => void;
  onEdit?: (id: string, newLabel: string, oldLabel: string) => void;
  onDelete?: (id: string) => void;
  groups?: SkillGroupOption[];
  grouped?: boolean;
  placeholder?: string;
  emptyText?: string;
}) {
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<
    { id: string; label: string } | null
  >(null);
  const [pendingEdit, setPendingEdit] = useState<
    { id: string; label: string } | null
  >(null);
  const [editValue, setEditValue] = useState("");
  const query = search.trim();

  const filteredOptions = useMemo(
    () =>
      options.filter((opt) =>
        opt.label.toLowerCase().includes(query.toLowerCase())
      ),
    [options, query]
  );

  // Tự động bật chế độ chia nhóm đóng/mở nếu prop `grouped` được truyền hoặc
  // danh sách options có phân nhóm kỹ năng (không phải tất cả đều rỗng/other).
  const isGrouped = useMemo(() => {
    if (grouped !== undefined) return grouped;
    return options.some(
      (o) => Boolean(o.skill_group) && o.skill_group !== "other"
    );
  }, [grouped, options]);

  const resolvedGroups = useMemo<SkillGroupOption[]>(() => {
    const base: SkillGroupOption[] = groups ? [...groups] : [...SKILL_GROUPS];
    const known = new Set(base.map((g) => g.value));
    for (const opt of options) {
      if (opt.skill_group && !known.has(opt.skill_group)) {
        known.add(opt.skill_group);
        base.push({ value: opt.skill_group, label: "📌 Khác" });
      }
    }
    return base;
  }, [groups, options]);

  // Gom các lựa chọn đã lọc theo từng nhóm kỹ năng
  const groupedSections = useMemo(() => {
    if (!isGrouped) return [];
    const byGroup = new Map<string, MultiSelectOption[]>();
    for (const g of resolvedGroups) {
      byGroup.set(g.value, []);
    }
    for (const opt of filteredOptions) {
      const key =
        opt.skill_group && byGroup.has(opt.skill_group)
          ? opt.skill_group
          : "other";
      const list = byGroup.get(key) ?? [];
      list.push(opt);
      byGroup.set(key, list);
    }
    return resolvedGroups
      .map((group) => ({
        group,
        items: byGroup.get(group.value) ?? [],
      }))
      .filter((sec) => sec.items.length > 0);
  }, [isGrouped, resolvedGroups, filteredOptions]);

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

  function toggleGroup(groupValue: string) {
    setOpenGroups((prev) => ({
      ...prev,
      [groupValue]: !prev[groupValue],
    }));
  }

  const allGroupsExpanded =
    groupedSections.length > 0 &&
    groupedSections.every((sec) => Boolean(openGroups[sec.group.value]));

  function toggleAllGroups() {
    if (allGroupsExpanded) {
      setOpenGroups({});
    } else {
      const next: Record<string, boolean> = {};
      for (const sec of groupedSections) {
        next[sec.group.value] = true;
      }
      setOpenGroups(next);
    }
  }

  function handleCreate() {
    if (!canCreate) return;
    const activeGroup = Object.entries(openGroups).find(([, v]) => v)?.[0];
    onCreate!(query, activeGroup);
    setSearch("");
  }

  function handleConfirmEdit() {
    const trimmed = editValue.trim();
    if (!pendingEdit || !trimmed) return;
    onEdit?.(pendingEdit.id, trimmed, pendingEdit.label);
    if (selected.includes(pendingEdit.label) && trimmed !== pendingEdit.label) {
      onChange(
        selected.map((l) => (l === pendingEdit.label ? trimmed : l))
      );
    }
    setPendingEdit(null);
  }

  function renderOptionItem(opt: MultiSelectOption) {
    return (
      <DropdownMenuCheckboxItem
        key={opt.id}
        checked={selected.includes(opt.label)}
        // Giữ menu mở để tick nhiều mục liên tiếp.
        onSelect={(e) => e.preventDefault()}
        onCheckedChange={() => toggle(opt.label)}
      >
        <span className="min-w-0 flex-1 break-words whitespace-normal">
          {opt.label}
        </span>
        {onEdit && (
          <button
            type="button"
            aria-label={`Sửa "${opt.label}" trong danh mục`}
            title="Chỉnh sửa lựa chọn này"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPendingEdit({ id: opt.id, label: opt.label });
              setEditValue(opt.label);
            }}
            className="ml-1 shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label={`Xóa "${opt.label}" khỏi danh mục`}
            title="Xóa lựa chọn này"
            // Không để việc bấm ✕ lan lên thành tick/bỏ tick mục.
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPendingDelete({ id: opt.id, label: opt.label });
            }}
            className="ml-0.5 shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive cursor-pointer"
          >
            ✕
          </button>
        )}
      </DropdownMenuCheckboxItem>
    );
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
        <DropdownMenuTrigger className="flex w-full cursor-pointer items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring">
          <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
            {selected.length === 0 ? placeholder : `Đã chọn ${selected.length}`}
          </span>
          <span className="text-xs text-muted-foreground">▾</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-96 w-(--radix-dropdown-menu-trigger-width) min-w-[min(22rem,90vw)] max-w-[min(28rem,92vw)] overflow-y-auto p-1.5"
        >
          <div className="sticky top-0 z-10 bg-popover pb-1.5 space-y-1">
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
              className="h-8 text-xs"
            />
            {isGrouped && groupedSections.length > 1 && query.length === 0 && (
              <div className="flex items-center justify-between px-1 pt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {groupedSections.length} nhóm kỹ năng (bấm tên nhóm để mở/đóng)
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleAllGroups();
                  }}
                  className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
                >
                  {allGroupsExpanded ? "Thu gọn tất cả" : "Mở tất cả"}
                </button>
              </div>
            )}
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={handleCreate}
              className="mb-1.5 flex w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2.5 py-1.5 text-left text-xs font-medium text-primary hover:bg-primary/10"
            >
              ➕ Thêm &quot;{query}&quot;
            </button>
          )}

          {filteredOptions.length === 0 && !canCreate ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Không tìm thấy lựa chọn phù hợp.
            </p>
          ) : isGrouped ? (
            <div className="space-y-1.5">
              {groupedSections.map(({ group, items }) => {
                const isExpanded =
                  query.length > 0 || Boolean(openGroups[group.value]);
                const selectedInGroup = items.filter((it) =>
                  selected.includes(it.label)
                ).length;

                return (
                  <div
                    key={group.value}
                    className="rounded-lg border bg-card overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleGroup(group.value);
                      }}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted/50"
                    >
                      <span className="truncate">{group.label}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {selectedInGroup > 0 && (
                          <Badge
                            variant="default"
                            className="rounded-md px-1.5 py-0 text-[10px] font-semibold"
                          >
                            ✓ {selectedInGroup}
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className="rounded-md px-1.5 py-0 text-[10px] font-normal"
                        >
                          {items.length}
                        </Badge>
                        <span
                          className={cn(
                            "text-[10px] text-muted-foreground transition-transform duration-150",
                            isExpanded && "rotate-180"
                          )}
                        >
                          ▼
                        </span>
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-background/60 p-1">
                        {items.map((opt) => renderOptionItem(opt))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            filteredOptions.map((opt) => renderOptionItem(opt))
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

      {/* Hộp thoại sửa lựa chọn dựng NGOÀI DropdownMenu */}
      <Dialog
        open={pendingEdit !== null}
        onOpenChange={(open) => !open && setPendingEdit(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa lựa chọn nhận xét</DialogTitle>
            <DialogDescription>
              Cập nhật nội dung của lựa chọn trong danh mục nhận xét dùng chung.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && editValue.trim()) {
                  e.preventDefault();
                  handleConfirmEdit();
                }
              }}
              placeholder="Nhập nội dung nhận xét..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingEdit(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={!editValue.trim()}
              onClick={handleConfirmEdit}
            >
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dựng NGOÀI DropdownMenu, xem ghi chú `onDelete` ở đầu file. */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa lựa chọn này?</DialogTitle>
            <DialogDescription>
              &quot;{pendingDelete?.label}&quot; sẽ không còn hiện trong danh
              mục này nữa. Các lựa chọn đã tick trước đó không bị ảnh hưởng.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingDelete) onDelete?.(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
