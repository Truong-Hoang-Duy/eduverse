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
import { gradeFiles, type GradeResult } from "@/lib/actions/grading";
import {
  checkFileReadable,
  SUBMISSION_ACCEPT,
  unsupportedSubmissionReason,
} from "@/lib/file-check";

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

/** Khóa nhận dạng một file để không thêm trùng khi vừa kéo thả vừa chọn tay. */
function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
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
  const [files, setFiles] = useState<File[]>([]);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startGrade] = useTransition();
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave bắn cả khi con trỏ đi qua phần tử con → đếm độ sâu, chứ
  // set/unset theo từng event thì viền highlight nháy liên tục.
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const courseAssignments = assignments.filter((a) => a.courseId === courseId);
  const selectedAssignment = assignments.find((a) => a.id === assignmentId);

  function handleCourseChange(id: string) {
    setCourseId(id);
    setAssignmentId("");
    setGrade(null);
    setError("");
  }

  /** Thêm dồn (không ghi đè) để kéo thả nhiều lượt/nhiều thư mục khác nhau được. */
  function addFiles(incoming: File[]) {
    setGrade(null);
    setError("");

    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of incoming) {
      const reason = unsupportedSubmissionReason(file.name);
      if (reason) rejected.push(reason);
      else accepted.push(file);
    }

    setFiles((prev) => {
      const seen = new Set(prev.map(fileKey));
      return [...prev, ...accepted.filter((f) => !seen.has(fileKey(f)))];
    });

    // Báo lý do đầu tiên + số file còn lại bị loại, đủ để GV hiểu mà không spam.
    if (rejected.length > 0) {
      setError(
        rejected.length === 1
          ? rejected[0]
          : `${rejected[0]} (và ${rejected.length - 1} file khác bị loại)`
      );
    }
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function removeFile(key: string) {
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
    setGrade(null);
  }

  function handleGrade() {
    setError("");
    setGrade(null);
    setCopied(false);
    startGrade(async () => {
      try {
        // Chặn sớm file bị DLP mã hóa — gửi lên AI cũng chỉ nhận bytes rác.
        for (const f of files) {
          const unreadable = await checkFileReadable(f);
          if (unreadable) {
            setError(unreadable);
            return;
          }
        }

        const payload = await Promise.all(
          files.map(async (f) => ({
            name: f.name,
            mimeType: f.type,
            contentB64: await fileToBase64(f),
          }))
        );
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

  const canGrade = Boolean(assignmentId) && files.length > 0 && !pending;

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
        {/* Không gắn htmlFor: nhãn nút bấm bên trong vùng thả mới là cái trỏ vào
            input, gắn cả hai chỗ là bấm tiêu đề cũng mở hộp thoại chọn file. */}
        <Label>File bài làm của học sinh *</Label>

        {/* Cả vùng thả là một <label> trỏ vào input → bấm ĐÂU trong ô cũng mở
            được hộp thoại chọn file, không cần onClick thủ công (làm vậy sẽ bắn
            2 lần khi bấm đúng nút giữa). Nội dung bên trong dùng <span> vì <p>
            không hợp lệ trong <label>. */}
        <label
          htmlFor="submission-files"
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
          className={`block cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors hover:border-primary/60 hover:bg-accent/40 ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
        >
          <span className="block text-3xl leading-none" aria-hidden="true">
            {dragging ? "📥" : "📄"}
          </span>
          <span className="mt-2 block text-sm font-medium">
            Bấm vào đây hoặc kéo thả file bài làm vào
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Một hoặc nhiều file của cùng một em
          </span>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-medium shadow-xs">
            📂 Chọn file từ máy
          </span>
          <span className="mt-3 block text-xs text-muted-foreground">
            File code (.html, .js, .py...), Word .docx, PDF, ảnh
          </span>
        </label>

        {/* Chữ "Choose Files / No file chosen" của input gốc do trình duyệt sinh,
            không đổi được sang tiếng Việt → ẩn input, để <label> trên điều khiển.
            `sr-only` (không phải `hidden`) để vẫn tab tới được bằng bàn phím. */}
        <input
          id="submission-files"
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUBMISSION_ACCEPT}
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            // Dọn input để chọn LẠI đúng file vừa xóa vẫn kích hoạt onChange.
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          className="sr-only"
        />
        <p className="text-xs text-muted-foreground">
          Thả nhiều lượt được — file mới cộng dồn vào danh sách. File không được
          lưu lại: chấm xong copy kết quả rồi làm em tiếp theo.
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">{files.length} file sẽ được chấm</p>
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setGrade(null);
              }}
              className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              ✕ Xóa hết
            </button>
          </div>
          <ul className="space-y-1">
            {files.map((f) => (
              <li
                key={fileKey(f)}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="min-w-0 truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`Bỏ file ${f.name}`}
                  onClick={() => removeFile(fileKey(f))}
                  className="shrink-0 cursor-pointer px-1 text-muted-foreground transition-colors hover:text-destructive"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
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
