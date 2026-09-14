"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ReviewCombo } from "@/lib/actions/review-combos";
import type { PriorReviewHistoryItem } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

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

export interface StudentForReview {
  id: string;
  full_name: string;
  /** Xếp loại học lực CỦA LỚP NÀY, tích 1 lần ở bảng "Danh sách học viên" —
   *  chỉ đọc ở đây, không sửa được trong trang buổi học nữa. */
  academic_level: string | null;
}

/** Danh sách nhận xét từng học viên trong buổi + bộ lọc theo trạng thái + thanh tiến độ trực quan. */
export function ReviewList({
  sessionId,
  sessionNumber,
  sessionTitle,
  sessionContent,
  sessionContext,
  isPeriodicTest,
  isProjectPeriod,
  isFinalPresentation,
  isFinalSession,
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
  sessionNumber?: number;
  sessionTitle: string;
  sessionContent: string;
  sessionContext: string;
  isPeriodicTest: boolean;
  isProjectPeriod: boolean;
  isFinalPresentation?: boolean;
  isFinalSession?: boolean;
  classCode?: string;
  courseName?: string;
  students: StudentForReview[];
  options: ReviewOptionItem[];
  reviewByStudentId: Map<string, ExistingReview>;
  priorCommentsByStudentId: Map<string, string[]>;
  priorSelectionsByStudentId: Map<string, PriorSelection[]>;
  allPriorReviewsByStudentId?: Map<string, PriorReviewHistoryItem[]>;
  projectsByStudentId?: Map<
    string,
    { id: string; name: string; description: string | null; features: string[] | null }
  >;
  combos: ReviewCombo[];
}) {
  const [status, setStatus] = useState<StatusFilter>("all");

  const totalCount = students.length;
  const doneCount = students.filter((s) =>
    isHandled(reviewByStudentId.get(s.id) ?? null)
  ).length;
  const pendingCount = totalCount - doneCount;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Map số thứ tự cố định theo danh sách lớp
  const studentIndexMap = new Map<string, number>();
  students.forEach((s, idx) => {
    studentIndexMap.set(s.id, idx + 1);
  });

  const filtered = students.filter((student) => {
    if (status === "all") return true;
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

  function handleExpandAll(open: boolean) {
    const detailsEls = document.querySelectorAll<HTMLDetailsElement>("details.review-editor-item");
    detailsEls.forEach((el) => {
      el.open = open;
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar thông minh: Thống kê tiến độ + Tabs lọc 1 chạm + Thao tác Bung/Thu gọn */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 sm:px-4 border border-slate-300 dark:border-slate-700 shadow-2xs">
        {/* Khối tiến độ */}
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Tiến độ nhận xét:
              </span>
              <span className="text-xs font-bold text-primary">
                {doneCount}/{totalCount} học viên ({percent}%)
              </span>
              {percent === 100 && totalCount > 0 && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  ✓ Hoàn thành
                </span>
              )}
            </div>
            {/* Thanh Progress Bar trực quan */}
            <div className="h-1.5 w-32 sm:w-44 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ lọc Tabs Pills 1 chạm */}
          <div className="flex items-center gap-1 bg-background/90 dark:bg-background/40 p-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setStatus("all")}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer select-none",
                status === "all"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              Tất cả ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatus("done")}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer flex items-center gap-1 select-none",
                status === "done"
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span>✓</span> Đã xong ({doneCount})
            </button>
            <button
              type="button"
              onClick={() => setStatus("pending")}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer flex items-center gap-1 select-none",
                status === "pending"
                  ? "bg-amber-600 text-white font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <span>⏳</span> Chưa xong ({pendingCount})
            </button>
          </div>

          {/* Thao tác Bung / Thu gọn tất cả */}
          <div className="flex items-center gap-1 border-l border-border/50 pl-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleExpandAll(true)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title="Bung mở tất cả thẻ nhận xét"
            >
              📂 Mở hết
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleExpandAll(false)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title="Thu gọn tất cả thẻ nhận xét"
            >
              📁 Thu gọn
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground bg-muted/10">
          Không có học viên nào khớp bộ lọc &ldquo;
          {status === "done"
            ? "Đã hoàn thành"
            : status === "pending"
            ? "Chưa hoàn thành"
            : "Tất cả"}
          &rdquo;.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => {
            const studentIndex = studentIndexMap.get(student.id) ?? 1;
            return (
              <ReviewEditor
                // Chữ ký dữ liệu đã lưu nằm trong key — xem `reviewSignature`.
                key={`${student.id}:${reviewSignature(
                  reviewByStudentId.get(student.id) ?? null
                )}`}
                index={studentIndex}
                sessionId={sessionId}
                sessionNumber={sessionNumber}
                sessionTitle={sessionTitle}
                sessionContent={sessionContent}
                sessionContext={sessionContext}
                isPeriodicTest={isPeriodicTest}
                isProjectPeriod={isProjectPeriod}
                isFinalPresentation={isFinalPresentation}
                isFinalSession={isFinalSession}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
