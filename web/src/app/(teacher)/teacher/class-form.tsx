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
import { createClass } from "@/lib/actions/classes";
import type { ActionResult } from "@/lib/types";

export interface CourseOption {
  id: string;
  code: string;
  name: string;
  /** Mã lớp gợi ý kế tiếp, VD JSB03 */
  suggestedCode: string;
}

export function ClassForm({ courses }: { courses: CourseOption[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createClass,
    {}
  );
  const [open, setOpen] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [courseId, setCourseId] = useState("");

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setClassCode("");
      setCourseId("");
    }
  }, [state.success]);

  function handleCourseChange(id: string) {
    setCourseId(id);
    const course = courses.find((c) => c.id === id);
    if (course) {
      setClassCode(course.suggestedCode);
    }
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Mở lớp mới</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mở lớp mới</DialogTitle>
          <DialogDescription>
            Chọn khóa học, mã lớp sẽ được gợi ý tự động theo số thứ tự tiếp theo
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="course_id" value={courseId} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Khóa học *</Label>
              <Select value={courseId} onValueChange={handleCourseChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn khóa học" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="class-code">Mã lớp *</Label>
                <Input
                  id="class-code"
                  name="class_code"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  placeholder="JSB01"
                  className="uppercase"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total-sessions">Số buổi *</Label>
                <Input
                  id="total-sessions"
                  name="total_sessions"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={12}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-description">Mô tả</Label>
              <Input id="class-description" name="description" />
            </div>
            <FormMessage result={state} />
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending || !courseId}>
              {pending ? "Đang tạo..." : "Mở lớp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
