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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateClass } from "@/lib/actions/classes";
import type { ActionResult } from "@/lib/types";

export function EditClassDialog({
  classId,
  classCode,
  description,
}: {
  classId: string;
  classCode: string;
  description: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateClass,
    {}
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          ✏️ Sửa lớp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa lớp {classCode}</DialogTitle>
          <DialogDescription>
            Đổi mã lớp thì học viên đăng ký mới sẽ chọn theo mã mới; các em đã
            trong lớp không bị ảnh hưởng.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="id" value={classId} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-class-code">Mã lớp *</Label>
              <Input
                id="edit-class-code"
                name="class_code"
                defaultValue={classCode}
                className="uppercase"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-class-description">Mô tả</Label>
              <Input
                id="edit-class-description"
                name="description"
                defaultValue={description ?? ""}
              />
            </div>
            <FormMessage result={state} />
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
