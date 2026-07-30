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
import {
  extractZipForGrading,
  gradeFiles,
  type GradeInputFile,
  type GradeResult,
} from "@/lib/actions/grading";
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
const FILTER: Parameters<typeof skipReasonFor>[1] = {
  keepImages: true,
  keepDocuments: true,
};

/**
 * Một file chờ chấm. Lấy từ máy thì còn `file` gốc (base64 hóa lúc bấm Chấm);
 * lấy từ .zip thì server đã giải nén sẵn nên chỉ có `contentB64`.
 */
interface Attachment {
  key: string;
  /** Đường dẫn tương đối nếu đến từ thư mục/zip — AI đọc để hiểu bố cục. */
  path: string;
  size: number;
  file: File | null;
  contentB64: string | null;
  mimeType: string;
}

/** Đọc File thành base64 (bỏ phần "data:...;base64," ở đầu). */
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

function attachmentFromPicked({ file, path }: PickedFile): Attachment {
  return {
    key: `${path}:${file.size}:${file.lastModified}`,
    path,
    size: file.size,
    file,
    contentB64: null,
    mimeType: file.type,
  };
}

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
  const [files, setFiles] = useState<Attachment[]>([]);
  const [skipped, setSkipped] = useState<SkipTally>(emptyTally());
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startGrade] = useTransition();
  const [reading, startReading] = useTransition();
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave bắn cả khi con trỏ đi qua phần tử con → đếm độ sâu, chứ
  // set/unset theo từng event thì viền highlight nháy liên tục.
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const courseAssignments = assignments.filter((a) => a.courseId === courseId);
  const selectedAssignment = assignments.find((a) => a.id === assignmentId);
  const warning = budgetWarning(files, GRADING_BUDGET);

  function handleCourseChange(id: string) {
    setCourseId(id);
    setAssignmentId("");
    setGrade(null);
    setError("");
  }

  /** Thêm dồn (không ghi đè) để kéo thả nhiều lượt/nhiều thư mục khác nhau được. */
  function addAttachments(incoming: Attachment[], tally: SkipTally) {
    setFiles((prev) => {
      const seen = new Set(prev.map((a) => a.key));
      return [...prev, ...incoming.filter((a) => !seen.has(a.key))];
    });
    setSkipped((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(tally) as (keyof SkipTally)[]) {
        next[key] += tally[key];
      }
      return next;
    });
  }

  /** Một file .zip → server giải nén (giữ cả ảnh/PDF, khác đường sản phẩm). */
  function loadZip(zip: File) {
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
          res.skipped ?? emptyTally()
        );
      } catch {
        setError("Không đọc được file .zip này.");
      }
    });
  }

  function loadPicked(picked: PickedFile[]) {
    setGrade(null);
    setError("");

    if (picked.length === 0) {
      setError("Không tìm thấy file bài làm nào trong thứ vừa chọn.");
      return;
    }

    // Đúng một file .zip thì giải nén; còn lại nhận trực tiếp.
    if (picked.length === 1 && picked[0].path.toLowerCase().endsWith(".zip")) {
      loadZip(picked[0].file);
      return;
    }

    // Lỗi ĐÁNG GIẢI THÍCH (Word đời cũ, .rar) báo to; rác trong thư mục
    // (node_modules, lock file...) bỏ im lặng rồi tổng kết một dòng.
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

    // Bỏ đoạn thư mục gốc chung để đường dẫn gọn và AI đọc dễ.
    addAttachments(stripCommonRoot(kept.map(attachmentFromPicked)), tally);
  }

  async function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);

    // PHẢI gom entry đồng bộ ở đây: dataTransfer.items bị xóa ngay khi handler
    // trả về, `await` trước khi gom là mất sạch dữ liệu.
    const entries = Array.from(e.dataTransfer.items).map((item) =>
      item.webkitGetAsEntry()
    );
    const plainFiles = Array.from(e.dataTransfer.files);

    loadPicked(await pickedFromDrop(entries, plainFiles, FILTER));
  }

  function handleInput(list: FileList | null, input: HTMLInputElement | null) {
    loadPicked(pickedFromInput(Array.from(list ?? []), FILTER));
    // Dọn input để chọn LẠI đúng file vừa xóa vẫn kích hoạt onChange.
    if (input) input.value = "";
  }

  function removeFile(key: string) {
    setFiles((prev) => prev.filter((a) => a.key !== key));
    setGrade(null);
  }

  function handleGrade() {
    setError("");
    setGrade(null);
    setCopied(false);
    startGrade(async () => {
      try {
        const payload: GradeInputFile[] = [];
        for (const attachment of files) {
          if (attachment.file) {
            // Chặn sớm file bị DLP mã hóa — gửi lên AI cũng chỉ nhận bytes rác.
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

        const res = await gradeFiles({ assignmentId, files: payload });
        if (res.error) setError(res.error);
        else setGrade(res.grade ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi khi đọc file.");
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
    Boolean(assignmentId) && files.length > 0 && !pending && !reading;

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
        {/* Không gắn htmlFor: vùng thả bên dưới mới là cái trỏ vào input, gắn cả
            hai chỗ thì bấm tiêu đề cũng mở hộp thoại chọn file. Ràng buộc "một
            học sinh" nằm ở đây để không phải thêm dòng mô tả trong vùng thả. */}
        <Label>File bài làm (của một học sinh) *</Label>

        {/* Cả vùng thả là một <label> trỏ vào input → bấm ĐÂU trong ô cũng mở
            được hộp thoại chọn file, không cần onClick thủ công (làm vậy sẽ bắn
            2 lần khi bấm đúng nút giữa). Nội dung bên trong dùng <span> vì <p>
            không hợp lệ trong <label>. */}
        {/* Bấm ĐÂU trong ô cũng mở hộp thoại chọn file. Dùng div + onClick (không
            phải <label>) vì bên trong có nút "Chọn thư mục" riêng — nằm trong
            <label> thì bấm nút đó sẽ kích hoạt cả label. */}
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
          // Thiếu preventDefault ở dragOver là trình duyệt tự mở file thay vì thả.
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) setDragging(false);
          }}
          onDrop={handleDrop}
          className={`space-y-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-accent/40 ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          } cursor-pointer`}
        >
          <p className="text-3xl leading-none" aria-hidden="true">
            {dragging ? "📥" : "📄"}
          </p>
          <p className="text-base font-medium">
            {reading
              ? "Đang đọc file..."
              : "Bấm hoặc kéo thả file, cả thư mục, hoặc file .zip vào đây"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reading}
            // Chặn nổi bọt, nếu không ô ngoài cũng mở hộp thoại chọn FILE.
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
          >
            📁 Chọn cả thư mục
          </Button>
        </div>

        {/* Chữ "Choose Files / No file chosen" của input gốc do trình duyệt sinh,
            không đổi được sang tiếng Việt → ẩn input, để ô trên điều khiển. */}
        <input
          id="submission-files"
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUBMISSION_ACCEPT}
          onChange={(e) => handleInput(e.target.files, e.target)}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        {/* webkitdirectory không có trong type của React → phải spread vào. */}
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
          Thả cả thư mục hoặc .zip đều được — tự bỏ qua node_modules, .git và file
          rác bên trong. File bài làm KHÔNG được lưu lại ở đâu.
        </p>
      </div>

      {warning && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ {warning}
        </p>
      )}

      {files.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">
              {files.length} file sẽ được chấm ·{" "}
              {formatBytes(files.reduce((sum, f) => sum + f.size, 0))}
            </p>
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setSkipped(emptyTally());
                setGrade(null);
              }}
              className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              ✕ Xóa hết
            </button>
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
                  onClick={() => removeFile(f.key)}
                  className="shrink-0 cursor-pointer px-1 text-muted-foreground transition-colors hover:text-destructive"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          {skipped.folder + skipped.junk + skipped.binary + skipped["too-big"] >
            0 && (
            <p className="text-xs text-muted-foreground">
              Đã bỏ qua {describeSkipped(skipped)}.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleGrade} disabled={!canGrade}>
          {pending ? "AI đang chấm..." : "✨ Chấm bài"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
