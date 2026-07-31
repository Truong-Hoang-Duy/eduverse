"use client";

import { useRef, useState, useTransition } from "react";

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
import {
  extractZipForGrading,
  type GradeInputFile,
} from "@/lib/actions/grading";
import { helpStudent, type StudentHelp } from "@/lib/actions/student-help";
import {
  checkFileReadable,
  SUBMISSION_ACCEPT,
  unsupportedSubmissionReason,
} from "@/lib/file-check";
import {
  pickedFromDrop,
  pickedFromInput,
  type PickedFile,
} from "@/lib/read-dropped-files";
import { toStudentHelpText } from "@/lib/student-help-text";
import {
  budgetWarning,
  describeSkipped,
  emptyTally,
  formatBytes,
  GRADING_BUDGET,
  skipReasonFor,
  stripCommonRoot,
  type SkipTally,
} from "@/lib/submission-files";

import type { AssignmentChoice, CourseChoice } from "../grading-tool";
import { ViewSpecDialog } from "../view-spec-dialog";

/** Giống tab bài tập: giữ ảnh (em hay chụp màn hình code) và cả PDF/Word. */
const FILTER: Parameters<typeof skipReasonFor>[1] = {
  keepImages: true,
  keepDocuments: true,
};

interface Attachment {
  key: string;
  path: string;
  size: number;
  file: File | null;
  contentB64: string | null;
  mimeType: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error(`Không đọc được file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

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
  const [files, setFiles] = useState<Attachment[]>([]);
  const [skipped, setSkipped] = useState<SkipTally>(emptyTally());
  const [help, setHelp] = useState<StudentHelp | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startHelp] = useTransition();
  const [reading, startReading] = useTransition();
  const [dragging, setDragging] = useState(false);

  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const courseAssignments = assignments.filter((a) => a.courseId === courseId);
  const selectedAssignment = assignments.find((a) => a.id === assignmentId);
  const warning = budgetWarning(files, GRADING_BUDGET);

  function resetResult() {
    setHelp(null);
    setError("");
    setCopied(false);
  }

  function handleCourseChange(id: string) {
    setCourseId(id);
    setAssignmentId("");
    resetResult();
  }

  function addAttachments(
    incoming: Attachment[],
    tally: SkipTally,
    source: string,
    startFresh: boolean
  ) {
    let added = 0;
    setFiles((prev) => {
      const base = startFresh ? [] : prev;
      const seen = new Set(base.map((a) => a.key));
      const fresh = incoming.filter((a) => !seen.has(a.key));
      added = fresh.length;
      return [...base, ...fresh];
    });
    setSkipped((prev) => {
      const next = startFresh ? emptyTally() : { ...prev };
      for (const key of Object.keys(tally) as (keyof SkipTally)[]) {
        next[key] += tally[key];
      }
      return next;
    });

    const bytes = incoming.reduce((sum, a) => sum + a.size, 0);
    setNotice(
      `${startFresh ? "Đã bỏ bài trước. " : ""}Đã nạp ${added} file (${formatBytes(bytes)}) từ ${source}.`
    );
  }

  function loadZip(zip: File, startFresh: boolean) {
    startReading(async () => {
      try {
        const res = await extractZipForGrading({
          zipB64: await fileToBase64(zip),
        });
        if (res.error) {
          setError(res.error);
          return;
        }
        addAttachments(
          (res.files ?? []).map((f) => ({
            key: `zip:${f.name}:${f.size}`,
            path: f.name,
            size: f.size,
            file: null,
            contentB64: f.contentB64,
            mimeType: f.mimeType,
          })),
          res.skipped ?? emptyTally(),
          `file nén "${zip.name}"`,
          startFresh
        );
      } catch {
        setError("Không đọc được file .zip này.");
      }
    });
  }

  function loadPicked(picked: PickedFile[]) {
    // Đã có gợi ý trên màn hình nghĩa là lượt trước xong rồi — nạp tiếp là sang
    // em khác (hoặc bài khác). Cùng luật với tab bài tập hàng ngày.
    const startFresh = help !== null;

    resetResult();
    setNotice("");

    if (picked.length === 0) {
      setError("Không tìm thấy file nào trong thứ vừa chọn.");
      return;
    }

    const root = picked.find((p) => p.path.includes("/"))?.path.split("/")[0];
    const source = root ? `thư mục "${root}"` : "file đã chọn";

    if (picked.length === 1 && picked[0].path.toLowerCase().endsWith(".zip")) {
      loadZip(picked[0].file, startFresh);
      return;
    }

    const loud: string[] = [];
    const tally = emptyTally();
    const kept: PickedFile[] = [];

    for (const item of picked) {
      const complaint = unsupportedSubmissionReason(item.path);
      if (complaint) {
        loud.push(complaint);
        continue;
      }
      const reason = skipReasonFor(item.path, FILTER);
      if (reason) {
        tally[reason] += 1;
        continue;
      }
      if (item.file.size > GRADING_BUDGET.maxFileBytes) {
        tally["too-big"] += 1;
        continue;
      }
      kept.push(item);
    }

    if (loud.length > 0) {
      setError(
        loud.length === 1
          ? loud[0]
          : `${loud[0]} (và ${loud.length - 1} file khác bị loại)`
      );
    }

    addAttachments(stripCommonRoot(kept.map(toAttachment)), tally, source, startFresh);
  }

  async function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);

    // PHẢI gom entry đồng bộ: dataTransfer.items bị xóa ngay khi handler trả về.
    const entries = Array.from(e.dataTransfer.items).map((item) =>
      item.webkitGetAsEntry()
    );
    const plainFiles = Array.from(e.dataTransfer.files);

    loadPicked(await pickedFromDrop(entries, plainFiles, FILTER));
  }

  function handleInput(list: FileList | null, input: HTMLInputElement | null) {
    loadPicked(pickedFromInput(Array.from(list ?? []), FILTER));
    if (input) input.value = "";
  }

  function handleHelp() {
    setError("");
    setHelp(null);
    setCopied(false);
    startHelp(async () => {
      try {
        const payload: GradeInputFile[] = [];
        for (const attachment of files) {
          if (attachment.file) {
            const unreadable = await checkFileReadable(attachment.file);
            if (unreadable) {
              setError(unreadable);
              return;
            }
          }
          payload.push({
            name: attachment.path,
            mimeType: attachment.mimeType,
            contentB64:
              attachment.contentB64 ?? (await fileToBase64(attachment.file!)),
            size: attachment.size,
          });
        }

        const res = await helpStudent({ assignmentId, files: payload, question });
        if (res.error) setError(res.error);
        else setHelp(res.help ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi khi đọc file.");
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

  const canHelp = Boolean(assignmentId) && !pending && !reading;

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
            onValueChange={(id) => {
              setAssignmentId(id);
              resetResult();
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

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) setDragging(false);
          }}
          onDrop={handleDrop}
          className={`space-y-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-accent/40 ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          } cursor-pointer`}
        >
          <p className="text-3xl leading-none" aria-hidden="true">
            {dragging ? "📥" : "🖼️"}
          </p>
          <p className="text-base font-medium">
            {reading
              ? "Đang đọc file..."
              : "Bấm hoặc kéo thả code, ảnh chụp màn hình, cả thư mục hoặc .zip"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reading}
            title="Trình duyệt sẽ hỏi xác nhận trước khi đọc thư mục — bấm Upload. File vẫn không được lưu lại ở đâu."
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
          >
            📁 Chọn cả thư mục
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUBMISSION_ACCEPT}
          onChange={(e) => handleInput(e.target.files, e.target)}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
          onChange={(e) => handleInput(e.target.files, e.target)}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />

        <p className="text-xs text-muted-foreground">
          Bỏ trống cũng được — khi đó AI chỉ dựa vào đề bài để chỉ em cách bắt
          đầu. File em gửi KHÔNG được lưu lại ở đâu.
        </p>
      </div>

      {notice && (
        <p className="rounded-lg border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700 dark:text-green-400">
          ✓ {notice}
        </p>
      )}

      {warning && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ {warning}
        </p>
      )}

      {files.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">
              {files.length} file AI sẽ xem ·{" "}
              {formatBytes(files.reduce((sum, f) => sum + f.size, 0))}
            </p>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setFiles([]);
                setSkipped(emptyTally());
                setNotice("");
                resetResult();
              }}
            >
              ✕ Xóa hết {files.length} file
            </Button>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {files.map((f) => (
              <li
                key={f.key}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate font-mono">{f.path}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatBytes(f.size)}
                </span>
                <button
                  type="button"
                  aria-label={`Bỏ file ${f.path}`}
                  onClick={() => {
                    setFiles((prev) => prev.filter((a) => a.key !== f.key));
                    resetResult();
                  }}
                  className="shrink-0 cursor-pointer px-1 text-muted-foreground transition-colors hover:text-destructive"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {skipped.folder + skipped.junk + skipped.binary + skipped["too-big"] > 0 && (
            <p className="text-xs text-muted-foreground">
              Đã bỏ qua {describeSkipped(skipped)}.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleHelp} disabled={!canHelp}>
          {pending
            ? "AI đang xem..."
            : files.length > 0
              ? "💡 Xem bài em đang dở"
              : "💡 Gợi ý cách làm"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {help && <HelpResult help={help} title={selectedAssignment?.title ?? ""} onCopy={handleCopy} copied={copied} />}
    </div>
  );
}

function toAttachment({ file, path }: PickedFile): Attachment {
  return {
    key: `${path}:${file.size}:${file.lastModified}`,
    path,
    size: file.size,
    file,
    contentB64: null,
    mimeType: file.type,
  };
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

      {title && (
        <p className="text-sm text-muted-foreground">Đề bài: {title}</p>
      )}

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
