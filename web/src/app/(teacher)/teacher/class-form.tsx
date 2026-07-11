"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [classCode, setClassCode] = useState("");
  const [courseId, setCourseId] = useState("");

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mở lớp mới</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="course_id" value={courseId} />
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Khóa học *</Label>
            <Select value={courseId} onValueChange={handleCourseChange}>
              <SelectTrigger>
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
            <div className="space-y-1">
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
            <div className="space-y-1">
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
          <div className="space-y-1">
            <Label htmlFor="class-description">Mô tả</Label>
            <Input id="class-description" name="description" />
          </div>
          <FormMessage result={state} />
          <Button type="submit" size="sm" disabled={pending || !courseId}>
            {pending ? "Đang tạo..." : "Mở lớp"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
