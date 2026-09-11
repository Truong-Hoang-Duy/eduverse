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
import type { PriorReviewHistoryItem } from "@/lib/actions/reviews";

import {
  type CopySource,
  ReviewEditor,
  type ReviewOptionItem,
} from "./review-editor";
import {
  type ExistingReview,
  isHandled,
  type PriorSelection,
  reviewSignature,
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
  /** Xếp loại học lực CỦA LỚP NÀY, tích 1 lần ở bảng "Danh sách học viên" —
   *  chỉ đọc ở đây, không sửa được trong trang buổi học nữa. */
  academic_level: string | null;
}

/** Danh sách nhận xét từng học viên trong buổi + bộ lọc theo trạng thái —
 *  tách khỏi Server Component vì cần state client để lọc. */
export function ReviewList({
  sessionId,
  sessionTitle,
  sessionContent,
  sessionContext,
  isPeriodicTest,
  isProjectPeriod,
  isFinalPresentation,
  classCode,
  courseName,
  students,
  options,
  reviewByStudentId,
  priorCommentsByStudentId,
  priorSelectionsByStudentId,
  allPriorReviewsByStudentId,
  projectsByStudentId,
  combos,
}: {
  sessionId: string;
  sessionTitle: string;
  sessionContent: string;
  /** Bối cảnh buổi học GV gõ 1 lần (VD: hôm nay kiểm tra) — chỉ để AI tham
   *  khảo khi viết nhận xét, dùng chung cho mọi học viên trong buổi. */
  sessionContext: string;
  /** Buổi có kiểm tra định kỳ — bật thì nhận xét AI tách 2 phần (học tập /
   *  kiểm tra) và hiện thêm ô chọn "quá trình làm bài". */
  isPeriodicTest: boolean;
  /** Buổi có làm sản phẩm cuối khóa (SPCK, thường buổi 9-13) — bật thì hiện ô
   *  chọn "quan sát quá trình làm SPCK", giống cơ chế `isPeriodicTest`. */
  isProjectPeriod: boolean;
  /** Buổi thuyết trình sản phẩm cuối khóa & Tổng kết (Demo Day / Buổi 14). */
  isFinalPresentation?: boolean;
  classCode?: string;
  courseName?: string;
  students: StudentForReview[];
  options: ReviewOptionItem[];
  reviewByStudentId: Map<string, ExistingReview>;
  /** Nhận xét các buổi trước của từng học viên — cho AI tránh lặp lời văn. */
  priorCommentsByStudentId: Map<string, string[]>;
  /** Điểm mạnh/cải thiện các buổi trước của từng học viên — để copy sang. */
  priorSelectionsByStudentId: Map<string, PriorSelection[]>;
  /** Toàn bộ lịch sử nhận xét các buổi trước (1..13) để tổng kết khóa học. */
  allPriorReviewsByStudentId?: Map<string, PriorReviewHistoryItem[]>;
  /** Dự án sản phẩm cuối khóa của từng học viên. */
  projectsByStudentId?: Map<
    string,
    { id: string; name: string; description: string | null; features: string[] | null }
  >;
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
            // Chữ ký dữ liệu đã lưu nằm trong key — xem `reviewSignature`.
            key={`${student.id}:${reviewSignature(
              reviewByStudentId.get(student.id) ?? null
            )}`}
            sessionId={sessionId}
            sessionTitle={sessionTitle}
            sessionContent={sessionContent}
            sessionContext={sessionContext}
            isPeriodicTest={isPeriodicTest}
            isProjectPeriod={isProjectPeriod}
            isFinalPresentation={isFinalPresentation}
            classCode={classCode}
            courseName={courseName}
            project={projectsByStudentId?.get(student.id) ?? null}
            allPriorReviews={allPriorReviewsByStudentId?.get(student.id) ?? []}
            studentId={student.id}
            studentName={student.full_name}
            academicLevel={student.academic_level}
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
