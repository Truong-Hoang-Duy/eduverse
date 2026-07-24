"use client";

import { useActionState, useEffect, useState } from "react";

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
import type { ActionResult } from "@/lib/types";

/**
 * Nút hành động vận hành: hỏi xác nhận trong popup rồi chạy, và HIỆN KẾT QUẢ.
 *
 * Khác `ConfirmDialog` dùng chung ở chỗ hiện kết quả: các thao tác ở đây chạy
 * hàng loạt và có thể xong một phần ("đã xóa 3/5, 2 cái vướng khóa ngoại"), nên
 * đóng popup im lặng là giấu mất thông tin quan trọng nhất.
 */
export function OpsActionButton({
  label,
  title,
  description,
  confirmLabel,
  action,
  disabled,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    {}
  );
  const [open, setOpen] = useState(false);

  // Chạy xong (dù thành công hay lỗi) thì đóng popup, kết quả hiện dưới nút.
  useEffect(() => {
    if (state.error || state.success) setOpen(false);
  }, [state]);

  return (
    <div className="space-y-1.5">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            {label}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form action={formAction}>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Đang xử lý…" : confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <FormMessage result={state} />
    </div>
  );
}
