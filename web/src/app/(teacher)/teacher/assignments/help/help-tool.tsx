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
import { Textarea } from "@/components/ui/textarea";
import { extractZipForGrading } from "@/lib/actions/grading";
import { helpStudent, type StudentHelp } from "@/lib/actions/student-help";
import { toStudentHelpText } from "@/lib/student-help-text";
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

import { AssignmentForm } from "../assignment-form";
import type { AssignmentChoice, CourseChoice } from "../grading-tool";
import { ViewSpecDialog } from "../view-spec-dialog";

/** Giống tab bài tập: giữ ảnh (em hay chụp màn hình code) và cả PDF/Word. */
const FILTER: FilterOptions = { keepImages: true, keepDocuments: true };

export function HelpTool({
  courses,
  assignments,
}: {
  courses: CourseChoice[];
  assignments: AssignmentChoice[];
}) {
  const [courseId, setCourseId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [question, setQuestion] = useState("");
  const [help, setHelp] = useState<StudentHelp | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startHelp] = useTransition();

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
    hasResult: help !== null,
    onItemsChanged: () => {
      setHelp(null);
      setCopied(false);
    },
  });

  const courseAssignments = assignments.filter((a) => a.courseId === courseId);
  const selectedAssignment = assignments.find((a) => a.id === assignmentId);
  const warning = budgetWarning(picker.items, GRADING_BUDGET);

  function handleCourseChange(id: string) {
    setCourseId(id);
    setAssignmentId("");
    setHelp(null);
    picker.setError("");
  }

  function handleHelp() {
    picker.setError("");
    setHelp(null);
    setCopied(false);
    startHelp(async () => {
      try {
        const packed = await toGradeInputFiles(picker.items);
        if (packed.error) {
          picker.setError(packed.error);
          return;
        }

        const res = await helpStudent({
          assignmentId,
          files: packed.files!,
          question,
        });
        if (res.error) picker.setError(res.error);
        else setHelp(res.help ?? null);
      } catch (err) {
        picker.setError(
          err instanceof Error ? err.message : "Có lỗi khi đọc file."
        );
      }
    });
  }

  async function handleCopy() {
    if (!help) return;
    await navigator.clipboard.writeText(
      toStudentHelpText(help, selectedAssignment?.title ?? "")
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const canHelp = Boolean(assignmentId) && !pending && !picker.reading;

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
            <Label>Đề bài em đang làm *</Label>
            {selectedAssignment ? (
              <ViewSpecDialog
                assignmentId={selectedAssignment.id}
                sessionNumber={selectedAssignment.sessionNumber}
                title={selectedAssignment.title}
                variant="link"
              />
            ) : courseId && courseAssignments.length === 0 ? (
              <AssignmentForm
                courses={courses}
                defaultCourseId={courseId}
                defaultSessionNumber={1}
                existingAssignments={assignments}
                trigger={
                  <button
                    type="button"
                    className="cursor-pointer text-xs text-primary hover:underline"
                  >
                    + Tạo đề mới cho khóa này
                  </button>
                }
              />
            ) : null}
          </div>
          <Select
            value={assignmentId}
            onValueChange={(id) => {
              setAssignmentId(id);
              setHelp(null);
              picker.setError("");
            }}
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
        <Label htmlFor="student-question">Em hỏi gì (tùy chọn)</Label>
        <Textarea
          id="student-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder="Chép câu em nhắn vào đây, VD: em chạy không ra kết quả, không biết sai chỗ nào ạ"
        />
        <p className="text-xs text-muted-foreground">
          Có câu hỏi cụ thể thì gợi ý sẽ trúng hơn nhiều so với để AI tự đoán.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Bài em đang làm dở (tùy chọn)</Label>
        <SubmissionDropzone
          handlers={picker.dropzone}
          idleIcon="🖼️"
          idleLabel="Bấm hoặc kéo thả code, ảnh chụp màn hình, cả thư mục hoặc .zip"
          hint="Bỏ trống cũng được — khi đó AI chỉ dựa vào đề bài để chỉ em cách bắt đầu. File em gửi KHÔNG được lưu lại ở đâu."
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
        summary={`${picker.items.length} file AI sẽ xem · ${formatBytes(
          picker.items.reduce((sum, f) => sum + f.size, 0)
        )}`}
        onClear={picker.clear}
        onRemove={picker.remove}
      />

      <div className="flex items-center gap-3">
        <Button onClick={handleHelp} disabled={!canHelp}>
          {pending
            ? "AI đang xem..."
            : picker.items.length > 0
              ? "💡 Xem bài em đang dở"
              : "💡 Gợi ý cách làm"}
        </Button>
      </div>

      {picker.error && <p className="text-sm text-destructive">{picker.error}</p>}

      {help && (
        <HelpResult
          help={help}
          title={selectedAssignment?.title ?? ""}
          onCopy={handleCopy}
          copied={copied}
        />
      )}
    </div>
  );
}

/** Hiện đúng thứ tự sẽ được copy, để GV đọc lướt là biết em nhận được gì. */
function HelpResult({
  help,
  title,
  onCopy,
  copied,
}: {
  help: StudentHelp;
  title: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const canSua = help.can_sua.filter((line) => line.trim());
  const cacBuoc = help.cac_buoc.filter((line) => line.trim());
  const dangODau = help.dang_o_dau.trim();

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Gợi ý gửi cho em</p>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {copied ? "✓ Đã copy" : "📋 Copy để dán cho em"}
        </Button>
      </div>

      {title && <p className="text-sm text-muted-foreground">Đề bài: {title}</p>}

      {dangODau && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">
            EM ĐANG LÀM ĐẾN ĐÂU
          </h3>
          <p className="text-sm">{dangODau}</p>
        </section>
      )}

      {canSua.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">
            CẦN SỬA
          </h3>
          <ol className="space-y-1.5">
            {canSua.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
                <span className="whitespace-pre-wrap">{line}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {cacBuoc.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">
            {dangODau ? "LÀM GÌ TIẾP" : "CÁC BƯỚC LÀM BÀI"}
          </h3>
          <ol className="space-y-1.5">
            {cacBuoc.map((line, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
                <span className="whitespace-pre-wrap">{line}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
