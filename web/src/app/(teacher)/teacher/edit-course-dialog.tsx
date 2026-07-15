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
import { updateCourse } from "@/lib/actions/courses";
import type { ActionResult } from "@/lib/types";

export function EditCourseDialog({
  courseId,
  code,
  name,
  description,
}: {
  courseId: string;
  code: string;
  name: string;
  description: string | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateCourse,
    {}
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Sửa khóa ${code}`}
          className="rounded p-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ✏️
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa khóa học {code}</DialogTitle>
          <DialogDescription>
            Đổi mã khóa không làm đổi mã các lớp đã mở (VD lớp JSB01 vẫn giữ tên
            cũ) — sửa từng lớp nếu muốn.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="id" value={courseId} />
          <div className="space-y-3">
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-course-code">Mã *</Label>
                <Input
                  id="edit-course-code"
                  name="code"
                  defaultValue={code}
                  className="uppercase"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-course-name">Tên khóa học *</Label>
                <Input
                  id="edit-course-name"
                  name="name"
                  defaultValue={name}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-course-description">Mô tả</Label>
              <Input
                id="edit-course-description"
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
