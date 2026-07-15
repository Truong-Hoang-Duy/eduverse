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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateClass } from "@/lib/actions/classes";
import type { ActionResult } from "@/lib/types";

export interface CourseChoice {
  id: string;
  code: string;
  name: string;
}

export function EditClassDialog({
  classId,
  classCode,
  courseId,
  description,
  courses,
}: {
  classId: string;
  classCode: string;
  courseId: string;
  description: string | null;
  courses: CourseChoice[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateClass,
    {}
  );
  const [open, setOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courseId);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  const moved = selectedCourse !== courseId;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSelectedCourse(courseId);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          ✏️ Sửa lớp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa lớp {classCode}</DialogTitle>
          <DialogDescription>
            Đổi mã lớp hoặc chuyển lớp sang khóa học khác. Học viên đang học và
            nội dung buổi học không bị ảnh hưởng.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="id" value={classId} />
          <input type="hidden" name="course_id" value={selectedCourse} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Khóa học *</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn khóa học" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {moved && (
                <p className="text-xs text-muted-foreground">
                  Chuyển khóa: lớp sẽ chấm bài theo đề của khóa mới. Nhớ đổi mã
                  lớp cho khớp mã khóa mới.
                </p>
              )}
            </div>
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
            <Button type="submit" disabled={pending || !selectedCourse}>
              {pending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
