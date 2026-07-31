"use client";

import { useState, useTransition } from "react";

import { SubmissionDropzone } from "@/components/submission/submission-dropzone";
import { SubmissionFileList } from "@/components/submission/submission-file-list";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  extractZipForGrading,
  gradeFiles,
  type GradeResult,
} from "@/lib/actions/grading";
import {
  attachmentFromZipEntry,
  attachmentsFromPicked,
  fileToBase64,
  toGradeInputFiles,
  type Attachment,
} from "@/lib/submission-attachment";
import {
  budgetWarning,
  emptyTally,
  formatBytes,
  GRADING_BUDGET,
  type FilterOptions,
} from "@/lib/submission-files";
import { useSubmissionPicker } from "@/lib/use-submission-picker";

import type { CourseChoice } from "./assignment-form";
import { ViewSpecDialog } from "./view-spec-dialog";

export type { CourseChoice };

export interface AssignmentChoice {
  id: string;
  courseId: string;
  courseCode: string;
  sessionNumber: number;
  title: string;
}

/** Bài tập hàng ngày giữ cả ảnh và PDF/Word — ảnh chụp code có thể LÀ bài làm. */
const FILTER: FilterOptions = { keepImages: true, keepDocuments: true };

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-destructive";
}

export function GradingTool({
  courses,
  assignments,
}: {
  courses: CourseChoice[];
  assignments: AssignmentChoice[];
}) {
  const [courseId, setCourseId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startGrade] = useTransition();

  const picker = useSubmissionPicker<Attachment>({
    filter: FILTER,
    budget: GRADING_BUDGET,
    toItems: (picked) => attachmentsFromPicked(picked),
    unzip: async (zip) => {
      const res = await extractZipForGrading({ zipB64: await fileToBase64(zip) });
      return {
        items: (res.files ?? []).map(attachmentFromZipEntry),
        skipped: res.skipped ?? emptyTally(),
        error: res.error,
      };
    },
    hasResult: grade !== null,
    onItemsChanged: () => {
      setGrade(null);
      setCopied(false);
    },
  });

  const courseAssignments = assignments.filter((a) => a.courseId === courseId);
  const selectedAssignment = assignments.find((a) => a.id === assignmentId);
  const warning = budgetWarning(picker.items, GRADING_BUDGET);

  function handleCourseChange(id: string) {
    setCourseId(id);
    setAssignmentId("");
    setGrade(null);
    picker.setError("");
  }

  function handleGrade() {
    picker.setError("");
    setGrade(null);
    setCopied(false);
    startGrade(async () => {
      try {
        const packed = await toGradeInputFiles(picker.items);
        if (packed.error) {
          picker.setError(packed.error);
          return;
        }

        const res = await gradeFiles({ assignmentId, files: packed.files! });
        if (res.error) picker.setError(res.error);
        else setGrade(res.grade ?? null);
      } catch (err) {
        picker.setError(
          err instanceof Error ? err.message : "Có lỗi khi đọc file."
        );
      }
    });
  }

  async function handleCopy() {
    if (!grade) return;
    const text = [
      `Điểm: ${grade.score}/100`,
      "",
      ...grade.bullets.map((b) => `- ${b}`),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const canGrade =
    Boolean(assignmentId) && picker.items.length > 0 && !pending && !picker.reading;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Khóa học *</Label>
          <Select value={courseId} onValueChange={handleCourseChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn khóa" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>Đề bài *</Label>
            {selectedAssignment && (
              <ViewSpecDialog
                assignmentId={selectedAssignment.id}
                sessionNumber={selectedAssignment.sessionNumber}
                title={selectedAssignment.title}
                variant="link"
              />
            )}
          </div>
          <Select
            value={assignmentId}
            onValueChange={setAssignmentId}
            disabled={!courseId}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !courseId
                    ? "Chọn khóa trước"
                    : courseAssignments.length === 0
                      ? "Khóa này chưa có đề"
                      : "Chọn đề"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {courseAssignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  Buổi {a.sessionNumber} — {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        {/* Ràng buộc "một học sinh" nằm ở nhãn để không phải thêm dòng mô tả
            trong vùng thả. Không gắn htmlFor: vùng thả bên dưới mới là cái trỏ
            vào input, gắn cả hai chỗ thì bấm tiêu đề cũng mở hộp thoại. */}
        <Label>File bài làm (của một học sinh) *</Label>
        <SubmissionDropzone
          handlers={picker.dropzone}
          idleIcon="📄"
          idleLabel="Bấm hoặc kéo thả file, cả thư mục, hoặc file .zip vào đây"
          hint="Thả cả thư mục hoặc .zip đều được — tự bỏ qua node_modules, .git và file rác bên trong. File bài làm KHÔNG được lưu lại ở đâu."
        />
      </div>

      {picker.notice && (
        <p className="rounded-lg border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700 dark:text-green-400">
          ✓ {picker.notice}
        </p>
      )}

      {warning && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ {warning}
        </p>
      )}

      <SubmissionFileList
        items={picker.items}
        skipped={picker.skipped}
        summary={`${picker.items.length} file sẽ được chấm · ${formatBytes(
          picker.items.reduce((sum, f) => sum + f.size, 0)
        )}`}
        onClear={picker.clear}
        onRemove={picker.remove}
      />

      <div className="flex items-center gap-3">
        <Button onClick={handleGrade} disabled={!canGrade}>
          {pending ? "AI đang chấm..." : "✨ Chấm bài"}
        </Button>
      </div>

      {picker.error && <p className="text-sm text-destructive">{picker.error}</p>}

      {grade && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-lg border bg-muted/40 px-5 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">ĐIỂM</p>
              <p className={`text-3xl font-bold ${scoreColor(grade.score)}`}>
                {grade.score}
                <span className="text-base font-normal text-muted-foreground">
                  /100
                </span>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "✓ Đã copy" : "📋 Copy kết quả"}
            </Button>
          </div>
          <ul className="space-y-1.5">
            {grade.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-muted-foreground">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
