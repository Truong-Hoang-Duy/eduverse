"use client";

import { useActionState, useState } from "react";

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
import { duplicateClass } from "@/lib/actions/classes";
import type { ActionResult } from "@/lib/types";

interface CourseChoice {
  id: string;
  code: string;
  name: string;
}

interface MemberChoice {
  id: string;
  fullName: string;
}

export function DuplicateClassDialog({
  sourceClassId,
  sourceClassCode,
  courseId,
  description,
  totalSessions,
  courses,
  students,
}: {
  sourceClassId: string;
  sourceClassCode: string;
  courseId: string;
  description: string | null;
  totalSessions: number;
  courses: CourseChoice[];
  students: MemberChoice[];
}) {
  // Không cần đóng dialog khi thành công: action redirect sang lớp mới.
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    duplicateClass,
    {}
  );
  const [open, setOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courseId);
  // Mặc định chọn HẾT thành viên — sao chép thường giữ nguyên nhóm.
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(students.map((s) => s.id))
  );

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allPicked = picked.size === students.length && students.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSelectedCourse(courseId);
          setPicked(new Set(students.map((s) => s.id)));
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          ⧉ Sao chép lớp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sao chép lớp {sourceClassCode}</DialogTitle>
          <DialogDescription>
            Tạo lớp mới giữ nguyên {totalSessions} buổi và nội dung giáo án, chép
            các thành viên được chọn. Nhận xét học viên KHÔNG được chép — lớp mới
            bắt đầu trống.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="source_class_id" value={sourceClassId} />
          <input type="hidden" name="course_id" value={selectedCourse} />
          {[...picked].map((id) => (
            <input key={id} type="hidden" name="student_ids" value={id} />
          ))}
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dup-class-code">Mã lớp mới *</Label>
              <Input
                id="dup-class-code"
                name="class_code"
                defaultValue={sourceClassCode}
                className="uppercase"
                required
              />
              <p className="text-xs text-muted-foreground">
                Phải khác mã lớp cũ, VD: {sourceClassCode} → tăng số thứ tự.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dup-class-description">Mô tả</Label>
              <Input
                id="dup-class-description"
                name="description"
                defaultValue={description ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Thành viên chép sang ({picked.size}/{students.length})</Label>
                {students.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      setPicked(
                        allPicked ? new Set() : new Set(students.map((s) => s.id))
                      )
                    }
                  >
                    {allPicked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                )}
              </div>
              {students.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Lớp nguồn chưa có học viên nào — lớp mới sẽ trống người, thêm sau.
                </p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {students.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={picked.has(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                      {s.fullName}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <FormMessage result={state} />
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending || !selectedCourse}>
              {pending ? "Đang sao chép..." : "Sao chép lớp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
