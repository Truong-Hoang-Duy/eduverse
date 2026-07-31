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
  type GradingMode,
  type QuizResult,
} from "@/lib/actions/grading";
import { toGradeCopyText } from "@/lib/grading-copy-text";
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
  // Buổi 5/9 (lâu lâu 14) có cả lý thuyết lẫn thực hành. Chọn mỗi lần chấm chứ
  // KHÔNG lưu vào đề (user chốt 2026-07-31): khỏi migration, và cùng một đề vẫn
  // chấm riêng từng phần được khi cần.
  const [mode, setMode] = useState<GradingMode>("practice");
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

        const res = await gradeFiles({ assignmentId, files: packed.files!, mode });
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
    await navigator.clipboard.writeText(
      toGradeCopyText(grade, selectedAssignment?.title ?? "")
    );
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
        <Label>Chấm phần nào</Label>
        <ModePicker mode={mode} onChange={setMode} />
        <p className="text-xs text-muted-foreground">
          {mode === "practice"
            ? "Chấm code như bình thường — dùng cho hầu hết các buổi."
            : "Đáp án trắc nghiệm lấy từ chính file đề bài, không cần nhập thêm. Bài làm của em nằm ở file nào cũng được (Word, ảnh chụp giấy, hoặc lẫn trong thư mục code)."}
        </p>
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
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Hai điểm ĐỨNG RIÊNG, không gộp: đúng hết trắc nghiệm mà code sai
                thì một điểm chung sẽ che mất vấn đề (user chốt 2026-07-31). */}
            {grade.quiz && grade.quiz.cau_hoi.length > 0 && (
              <ScoreCard
                label="LÝ THUYẾT"
                value={`${grade.quiz.so_dung}/${grade.quiz.tong_so}`}
                unit="câu đúng"
                tone={scoreColor(
                  Math.round((grade.quiz.so_dung / grade.quiz.tong_so) * 100)
                )}
              />
            )}
            {grade.score !== null && (
              <ScoreCard
                label="THỰC HÀNH"
                value={String(grade.score)}
                unit="/100"
                tone={scoreColor(grade.score)}
              />
            )}
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "✓ Đã copy" : "📋 Copy gửi học viên"}
            </Button>
          </div>

          {grade.quiz && <QuizReport quiz={grade.quiz} />}

          {grade.bullets.length > 0 && (
            <section className="space-y-1">
              {grade.quiz && (
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">
                  THỰC HÀNH
                </h3>
              )}
              <ul className="space-y-1.5">
                {grade.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const MODES: { value: GradingMode; label: string }[] = [
  { value: "practice", label: "Thực hành" },
  { value: "quiz", label: "Trắc nghiệm" },
  { value: "both", label: "Cả hai" },
];

function ModePicker({
  mode,
  onChange,
}: {
  mode: GradingMode;
  onChange: (next: GradingMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Chấm phần nào"
      className="flex gap-1 rounded-lg bg-muted p-1"
    >
      {MODES.map((item) => (
        <button
          key={item.value}
          type="button"
          role="radio"
          aria-checked={mode === item.value}
          onClick={() => onChange(item.value)}
          className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === item.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ScoreCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 px-5 py-3 text-center">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold ${tone}`}>
        {value}
        <span className="ml-1 text-base font-normal text-muted-foreground">
          {unit}
        </span>
      </p>
    </div>
  );
}

function QuizReport({ quiz }: { quiz: QuizResult }) {
  // ai-service trả 0 câu khi KHÔNG tìm thấy bài làm trắc nghiệm (nó được dặn
  // thà báo không thấy còn hơn bịa). Phải nói rõ, đừng để GV tưởng em sai hết.
  if (quiz.cau_hoi.length === 0) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
        ⚠️ Không tìm thấy bài làm trắc nghiệm trong các file đã nạp. Hãy kiểm tra
        em đã gửi phần đáp án chưa, hoặc ảnh chụp có đọc được không.
      </p>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">
        TRẮC NGHIỆM
      </h3>
      <ul className="flex flex-wrap gap-1.5">
        {quiz.cau_hoi.map((answer) => (
          <li
            key={answer.cau}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              answer.dung
                ? "bg-green-600/10 text-green-700 dark:text-green-400"
                : "bg-destructive/10 text-destructive"
            }`}
            title={
              answer.dung
                ? `Câu ${answer.cau}: đúng`
                : `Câu ${answer.cau}: em chọn ${answer.em_chon || "(bỏ trống)"}, đáp án đúng ${answer.dap_an_dung}`
            }
          >
            {answer.dung ? "✓" : "✕"} {answer.cau}
          </li>
        ))}
      </ul>
      {quiz.cau_hoi.some((a) => !a.dung) && (
        <ul className="space-y-1.5">
          {quiz.cau_hoi
            .filter((a) => !a.dung)
            .map((answer) => (
              <li key={answer.cau} className="text-sm">
                <span className="font-medium">Câu {answer.cau}:</span>{" "}
                {answer.em_chon ? `em chọn ${answer.em_chon}` : "em bỏ trống"}
                {answer.dap_an_dung && ` — đáp án đúng là ${answer.dap_an_dung}`}
                {answer.giai_thich && (
                  <span className="text-muted-foreground">
                    . {answer.giai_thich}
                  </span>
                )}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
