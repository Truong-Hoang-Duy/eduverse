"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CourseChoice } from "./assignment-form";
import { DeleteAssignmentButton } from "./delete-assignment-button";
import { EditAssignmentTitleButton } from "./edit-assignment-title-button";
import { ViewSpecDialog } from "./view-spec-dialog";

export interface SavedAssignment {
  id: string;
  courseId: string;
  sessionNumber: number;
  title: string;
}

/**
 * Danh sách đề đã lưu, nhóm theo khóa + lọc theo khóa. Lọc bằng Select
 * 1-lựa-chọn client-side (KHÔNG qua URL searchParams) để nhất quán với
 * `StatusFilter`/`GroupFilter` và bộ lọc lớp ở gallery.
 */
export function SavedAssignments({
  courses,
  assignments,
}: {
  courses: CourseChoice[];
  assignments: SavedAssignment[];
}) {
  const [courseFilter, setCourseFilter] = useState("all");

  const visibleCourses =
    courseFilter === "all"
      ? courses
      : courses.filter((c) => c.id === courseFilter);

  return (
    <section className="space-y-4 border-t pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Đề bài đã lưu</h2>
          <p className="text-sm text-muted-foreground">
            Đề thuộc khóa học, mỗi buổi một đề
          </p>
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger
            size="sm"
            className="w-[240px]"
            aria-label="Lọc đề bài theo khóa học"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khóa ({assignments.length} đề)</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.name} (
                {assignments.filter((a) => a.courseId === c.id).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visibleCourses.map((course) => {
        const courseAssignments = assignments.filter(
          (a) => a.courseId === course.id
        );
        return (
          <div key={course.id} className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge className="rounded-md px-2.5 py-1 font-mono text-xs">
                {course.code}
              </Badge>
              <span className="text-sm font-medium">{course.name}</span>
            </div>
            {courseAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có đề bài nào.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {courseAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="group flex items-start gap-3 rounded-lg border bg-card p-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                      {a.sessionNumber}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {a.title}
                    </p>
                    {/* Trên điện thoại không có hover — nút luôn hiện, chỉ
                        mờ đi cho đỡ rối trên máy rộng. */}
                    <div className="flex shrink-0 items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <ViewSpecDialog
                        assignmentId={a.id}
                        sessionNumber={a.sessionNumber}
                        title={a.title}
                      />
                      <EditAssignmentTitleButton
                        assignmentId={a.id}
                        title={a.title}
                      />
                      <DeleteAssignmentButton
                        assignmentId={a.id}
                        title={a.title}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
