"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getNextSessionNumber } from "@/lib/assignment-utils";

import { AssignmentForm, type CourseChoice } from "./assignment-form";
import { DeleteAssignmentButton } from "./delete-assignment-button";
import { EditAssignmentTitleButton } from "./edit-assignment-title-button";
import { ViewSpecDialog } from "./view-spec-dialog";

export interface SavedAssignment {
  id: string;
  courseId: string;
  sessionNumber: number;
  title: string;
  attachmentCount?: number;
  attachmentNames?: string[];
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
        <div className="flex flex-wrap items-center gap-2">
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger
              size="sm"
              className="w-[220px]"
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
          <AssignmentForm
            courses={courses}
            defaultCourseId={courseFilter !== "all" ? courseFilter : undefined}
            existingAssignments={assignments}
            trigger={
              <Button size="sm" className="gap-1.5 shadow-xs">
                <span>+</span>
                <span>Thêm đề bài mới</span>
              </Button>
            }
          />
        </div>
      </div>

      {visibleCourses.map((course) => {
        const courseAssignments = assignments.filter(
          (a) => a.courseId === course.id
        );
        const nextSession = getNextSessionNumber(
          courseAssignments.map((a) => a.sessionNumber)
        );

        return (
          <div key={course.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Badge className="rounded-md px-2.5 py-1 font-mono text-xs">
                  {course.code}
                </Badge>
                <span className="text-sm font-medium">{course.name}</span>
                {courseAssignments.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({courseAssignments.length} đề)
                  </span>
                )}
              </div>
              <AssignmentForm
                courses={courses}
                defaultCourseId={course.id}
                defaultSessionNumber={nextSession}
                existingAssignments={assignments}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    + Thêm đề
                  </Button>
                }
              />
            </div>
            {courseAssignments.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3 sm:px-4">
                <p className="text-sm text-muted-foreground">
                  Chưa có đề bài nào cho khóa {course.code}.
                </p>
                <AssignmentForm
                  courses={courses}
                  defaultCourseId={course.id}
                  defaultSessionNumber={1}
                  existingAssignments={assignments}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-medium"
                    >
                      + Thêm đề buổi 1
                    </Button>
                  }
                />
              </div>
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
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium">
                        {a.title}
                      </p>
                      {a.attachmentCount != null && a.attachmentCount > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="inline-flex items-center gap-1 rounded bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                            title={a.attachmentNames?.join(", ")}
                          >
                            <span>📎</span>
                            <span>{a.attachmentCount} tệp dữ liệu</span>
                          </span>
                        </div>
                      )}
                    </div>
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
                <AssignmentForm
                  courses={courses}
                  defaultCourseId={course.id}
                  defaultSessionNumber={nextSession}
                  existingAssignments={assignments}
                  trigger={
                    <button
                      type="button"
                      className="group flex min-h-[58px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-3 text-sm font-medium text-muted-foreground transition-all hover:border-primary/60 hover:bg-muted/40 hover:text-foreground"
                    >
                      <span className="flex size-7 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-xs font-semibold group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                        +
                      </span>
                      <span>Thêm đề buổi {nextSession}</span>
                    </button>
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
