"use client";

import { useActionState, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createReviewCombo,
  deleteReviewCombo,
  type ReviewCombo,
} from "@/lib/actions/review-combos";
import type { ActionResult } from "@/lib/types";

/**
 * Thanh "bộ combo" cho một ô nhận xét: áp bộ lưu sẵn (1 chạm), lưu lựa chọn
 * hiện tại thành bộ mới, và quản lý (xóa) bộ. Combos dùng chung mọi học viên
 * nên truyền từ trang xuống; áp bộ = GỘP vào lựa chọn hiện tại (không ghi đè).
 */
export function ComboBar({
  combos,
  currentStrengths,
  currentImprovements,
  onApply,
}: {
  combos: ReviewCombo[];
  currentStrengths: string[];
  currentImprovements: string[];
  onApply: (strengths: string[], improvements: string[]) => void;
}) {
  const [saveState, saveAction, saving] = useActionState<ActionResult, FormData>(
    createReviewCombo,
    {}
  );
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  // Lưu bộ xong thì đóng dialog.
  useEffect(() => {
    if (saveState.success) setSaveOpen(false);
  }, [saveState]);

  function applyByName(id: string) {
    const combo = combos.find((c) => c.id === id);
    if (combo) onApply(combo.strengths, combo.improvements);
  }

  const canSave = currentStrengths.length > 0 || currentImprovements.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {combos.length > 0 && (
        <Select value="" onValueChange={applyByName}>
          <SelectTrigger
            size="sm"
            className="h-7 w-[170px] text-xs"
            aria-label="Áp dụng bộ combo lưu sẵn"
          >
            <SelectValue placeholder="⚡ Áp dụng bộ combo..." />
          </SelectTrigger>
          <SelectContent>
            {combos.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.strengths.length}+{c.improvements.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Lưu lựa chọn hiện tại thành bộ mới. */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!canSave}
            title={
              canSave
                ? "Lưu điểm mạnh/cải thiện đang chọn thành một bộ dùng lại"
                : "Chọn ít nhất một điểm mạnh hoặc cần cải thiện trước"
            }
          >
            💾 Lưu bộ
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lưu thành bộ combo</DialogTitle>
            <DialogDescription>
              Lưu {currentStrengths.length} điểm mạnh + {currentImprovements.length}{" "}
              cần cải thiện đang chọn thành một bộ để lần sau áp cả bộ 1 chạm.
            </DialogDescription>
          </DialogHeader>
          {/* key theo saveOpen: mở lại dialog thì form (ô tên) reset sạch. */}
          <form key={String(saveOpen)} action={saveAction} className="space-y-3">
            {currentStrengths.map((s) => (
              <input key={`s-${s}`} type="hidden" name="strengths" value={s} />
            ))}
            {currentImprovements.map((s) => (
              <input key={`i-${s}`} type="hidden" name="improvements" value={s} />
            ))}
            <Input
              name="name"
              placeholder="Tên bộ (VD: Buổi ôn tập, HS chăm chỉ...)"
              maxLength={60}
              autoFocus
              required
            />
            <FormMessage result={saveState} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSaveOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu bộ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {combos.length > 0 && (
        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
            >
              ⚙️ Quản lý bộ
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Quản lý bộ combo</DialogTitle>
              <DialogDescription>
                Xóa các bộ không còn dùng. Xóa bộ KHÔNG ảnh hưởng nhận xét đã lưu.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2">
              {combos.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({c.strengths.length} mạnh + {c.improvements.length} cải thiện)
                    </span>
                  </span>
                  <ConfirmDialog
                    trigger={
                      <Button type="button" variant="ghost" size="sm">
                        Xóa
                      </Button>
                    }
                    title={`Xóa bộ "${c.name}"?`}
                    description="Bộ combo này sẽ bị xóa vĩnh viễn. Nhận xét đã lưu của học viên không bị ảnh hưởng."
                    confirmLabel="Xóa bộ"
                    action={deleteReviewCombo}
                    fields={{ id: c.id }}
                  />
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
