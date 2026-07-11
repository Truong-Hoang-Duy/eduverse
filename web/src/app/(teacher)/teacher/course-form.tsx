"use client";

import { useActionState } from "react";

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
import { createCourse } from "@/lib/actions/courses";
import type { ActionResult } from "@/lib/types";

export function CourseForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createCourse,
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tạo khóa học mới</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div className="space-y-1">
              <Label htmlFor="course-code">Mã *</Label>
              <Input
                id="course-code"
                name="code"
                placeholder="JSB"
                className="uppercase"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-name">Tên khóa học *</Label>
              <Input
                id="course-name"
                name="name"
                placeholder="JavaScript Basic"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="course-description">Mô tả</Label>
            <Input id="course-description" name="description" />
          </div>
          <FormMessage result={state} />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Đang tạo..." : "Tạo khóa học"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
