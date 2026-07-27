"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewCombo } from "@/lib/actions/review-combos";

import {
  type CopySource,
  ReviewEditor,
  type ReviewOptionItem,
} from "./review-editor";
import {
  type ExistingReview,
  isHandled,
  type PriorSelection,
} from "./review-status";

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
  priorSelectionsByStudentId,
  combos,
}: {
  sessionId: string;
  sessionTitle: string;
  sessionContent: string;
  students: StudentForReview[];
  options: ReviewOptionItem[];
  reviewByStudentId: Map<string, ExistingReview>;
  /** Nhận xét các buổi trước của từng học viên — cho AI tránh lặp lời văn. */
  priorCommentsByStudentId: Map<string, string[]>;
  /** Điểm mạnh/cải thiện các buổi trước của từng học viên — để copy sang. */
  priorSelectionsByStudentId: Map<string, PriorSelection[]>;
  /** Bộ combo lưu sẵn của GV (dùng chung mọi học viên). */
  combos: ReviewCombo[];
}) {
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = students.filter((student) => {
    if (status === "all") return true;
    // "Đã hoàn thành" tính cả đánh vắng — buổi coi như xong với em đó.
    const done = isHandled(reviewByStudentId.get(student.id) ?? null);
    return status === "done" ? done : !done;
  });

  // Ứng viên "bạn cùng buổi": em KHÁC đã lưu điểm mạnh/cải thiện (không vắng).
  const classmateCandidates = students
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
    .filter((c): c is NonNullable<typeof c> => c !== null);

  /** Nguồn copy cho một em: bạn cùng buổi (trừ chính em) + buổi trước của em. */
  function copySourcesFor(studentId: string): CopySource[] {
    const mates: CopySource[] = classmateCandidates
      .filter((c) => c.id !== studentId)
      .map((c) => ({
        key: `mate:${c.id}`,
        group: "👥 Bạn cùng buổi",
        label: c.name,
        strengths: c.strengths,
        improvements: c.improvements,
      }));
    const priors: CopySource[] = (
      priorSelectionsByStudentId.get(studentId) ?? []
    ).map((p) => ({
      key: `prior:${p.sessionNumber}`,
      group: "📅 Buổi trước của em",
      label: `Buổi ${p.sessionNumber} (${p.strengths.length}+${p.improvements.length})`,
      strengths: p.strengths,
      improvements: p.improvements,
    }));
    return [...mates, ...priors];
  }

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
            copySources={copySourcesFor(student.id)}
            combos={combos}
          />
        ))
      )}
    </div>
  );
}
