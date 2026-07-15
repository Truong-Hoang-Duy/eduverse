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
import { createCourse } from "@/lib/actions/courses";
import type { ActionResult } from "@/lib/types";

export function CourseForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createCourse,
    {}
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">+ Tạo khóa học</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo khóa học mới</DialogTitle>
          <DialogDescription>
            Khóa học là chương trình dạy (VD: JSB — JavaScript Basic), sau đó mở
            lớp thuộc khóa này
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <div className="space-y-3">
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="course-code">Mã *</Label>
                <Input
                  id="course-code"
                  name="code"
                  placeholder="JSB"
                  className="uppercase"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="course-name">Tên khóa học *</Label>
                <Input
                  id="course-name"
                  name="name"
                  placeholder="JavaScript Basic"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-description">Mô tả</Label>
              <Input id="course-description" name="description" />
            </div>
            <FormMessage result={state} />
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Đang tạo..." : "Tạo khóa học"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
