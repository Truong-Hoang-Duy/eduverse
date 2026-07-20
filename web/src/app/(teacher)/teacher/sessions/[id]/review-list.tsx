"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  isReviewed,
  ReviewEditor,
  type ExistingReview,
  type ReviewOptionItem,
} from "./review-editor";

type StatusFilter = "all" | "done" | "pending";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "Tất cả",
  done: "Đã hoàn thành",
  pending: "Chưa hoàn thành",
};

export interface StudentForReview {
  id: string;
  full_name: string;
}

/** Danh sách nhận xét từng học viên trong buổi + bộ lọc theo trạng thái —
 *  tách khỏi Server Component vì cần state client để lọc. */
export function ReviewList({
  sessionId,
  sessionTitle,
  sessionContent,
  students,
  options,
  reviewByStudentId,
}: {
  sessionId: string;
  sessionTitle: string;
  sessionContent: string;
  students: StudentForReview[];
  options: ReviewOptionItem[];
  reviewByStudentId: Map<string, ExistingReview>;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = students.filter((student) => {
    if (status === "all") return true;
    const done = isReviewed(reviewByStudentId.get(student.id) ?? null);
    return status === "done" ? done : !done;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger size="sm" className="w-[170px]" aria-label="Lọc theo trạng thái">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => (
              <SelectItem key={key} value={key}>
                {STATUS_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Không có học viên nào khớp bộ lọc.
        </p>
      ) : (
        filtered.map((student) => (
          <ReviewEditor
            key={student.id}
            sessionId={sessionId}
            sessionTitle={sessionTitle}
            sessionContent={sessionContent}
            studentId={student.id}
            studentName={student.full_name}
            options={options}
            existing={reviewByStudentId.get(student.id) ?? null}
          />
        ))
      )}
    </div>
  );
}
