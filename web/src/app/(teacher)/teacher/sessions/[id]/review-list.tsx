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
  type CopySource,
  type ExistingReview,
  isHandled,
  ReviewEditor,
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
  priorCommentsByStudentId,
}: {
  sessionId: string;
  sessionTitle: string;
  sessionContent: string;
  students: StudentForReview[];
  options: ReviewOptionItem[];
  reviewByStudentId: Map<string, ExistingReview>;
  /** Nhận xét các buổi trước của từng học viên — cho AI tránh lặp lời văn. */
  priorCommentsByStudentId: Map<string, string[]>;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = students.filter((student) => {
    if (status === "all") return true;
    // "Đã hoàn thành" tính cả đánh vắng — buổi coi như xong với em đó.
    const done = isHandled(reviewByStudentId.get(student.id) ?? null);
    return status === "done" ? done : !done;
  });

  // Nguồn copy cho từng editor: các bạn KHÁC đã có điểm mạnh/cải thiện lưu sẵn
  // (dữ liệu đã lưu — GV phải Lưu bạn đó trước rồi mới copy sang được).
  const copySources: CopySource[] = students
    .map((student) => {
      const review = reviewByStudentId.get(student.id);
      return review &&
        !review.is_absent &&
        (review.strengths.length > 0 || review.improvements.length > 0)
        ? {
            id: student.id,
            name: student.full_name,
            strengths: review.strengths,
            improvements: review.improvements,
          }
        : null;
    })
    .filter((s): s is CopySource => s !== null);

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
            priorComments={priorCommentsByStudentId.get(student.id) ?? []}
            copySources={copySources.filter((s) => s.id !== student.id)}
          />
        ))
      )}
    </div>
  );
}
