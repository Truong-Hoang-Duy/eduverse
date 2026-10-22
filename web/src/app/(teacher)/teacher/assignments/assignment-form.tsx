"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAssignment } from "@/lib/actions/grading";
import {
  formatTitleFromFileName,
  getNextSessionNumber,
} from "@/lib/assignment-utils";
import { checkFileReadable } from "@/lib/file-check";
import type { ActionResult } from "@/lib/types";

export interface CourseChoice {
  id: string;
  code: string;
  name: string;
}

export interface ExistingAssignmentBrief {
  courseId: string;
  sessionNumber: number;
}

export interface AssignmentFormProps {
  courses: CourseChoice[];
  defaultCourseId?: string;
  defaultSessionNumber?: number;
  existingAssignments?: ExistingAssignmentBrief[];
  trigger?: React.ReactNode;
}

export function AssignmentForm({
  courses,
  defaultCourseId,
  defaultSessionNumber,
  existingAssignments,
  trigger,
}: AssignmentFormProps) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createAssignment,
    {}
  );
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(defaultCourseId ?? "");
  const [sessionNumber, setSessionNumber] = useState(
    defaultSessionNumber != null ? String(defaultSessionNumber) : ""
  );
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function syncAttachmentFiles(files: File[]) {
    setAttachmentFiles(files);
    if (attachmentRef.current) {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      attachmentRef.current.files = dt.files;
    }
  }

  function handleAddAttachments(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const newFiles = Array.from(fileList);
    const existingNames = new Set(attachmentFiles.map((f) => f.name));
    const merged = [...attachmentFiles];
    for (const f of newFiles) {
      if (!existingNames.has(f.name)) {
        merged.push(f);
        existingNames.add(f.name);
      }
    }
    syncAttachmentFiles(merged);
  }

  function handleRemoveAttachment(indexToRemove: number) {
    const next = attachmentFiles.filter((_, idx) => idx !== indexToRemove);
    syncAttachmentFiles(next);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Khi mở popup, tự động điền khóa học và số buổi phù hợp
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      const targetCourse =
        defaultCourseId ?? (courses.length === 1 ? courses[0].id : "");
      setCourseId(targetCourse);

      if (defaultSessionNumber != null) {
        setSessionNumber(String(defaultSessionNumber));
      } else if (targetCourse && existingAssignments) {
        const courseSessions = existingAssignments
          .filter((a) => a.courseId === targetCourse)
          .map((a) => a.sessionNumber);
        setSessionNumber(String(getNextSessionNumber(courseSessions)));
      } else {
        setSessionNumber("");
      }

      setTitle("");
      setFileName("");
      setFileError("");
      syncAttachmentFiles([]);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Khi người dùng đổi khóa trong popup, tự động gợi ý số buổi tiếp theo của khóa đó
  function handleCourseChange(selectedId: string) {
    setCourseId(selectedId);
    if (existingAssignments) {
      const courseSessions = existingAssignments
        .filter((a) => a.courseId === selectedId)
        .map((a) => a.sessionNumber);
      setSessionNumber(String(getNextSessionNumber(courseSessions)));
    }
  }

  // Tạo xong thì đóng popup và dọn form cho lần tạo sau.
  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setFileName("");
      setTitle("");
      setCourseId(defaultCourseId ?? "");
      setSessionNumber(
        defaultSessionNumber != null ? String(defaultSessionNumber) : ""
      );
      setFileError("");
      syncAttachmentFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      formRef.current?.reset();
    }
  }, [state.success, defaultCourseId, defaultSessionNumber]);

  /**
   * Chỉ kiểm file tại chỗ để báo lỗi ngay; file lên Storage khi bấm "Tạo đề bài"
   * (trong createAssignment) nên bỏ dở giữa chừng không để lại rác.
   * Đồng thời tự động trích xuất tiêu đề đề bài từ tên file.
   */
  async function handleFileChange(file: File | undefined) {
    setFileError("");
    setFileName("");
    if (!file) return;

    const unreadable = await checkFileReadable(file);
    if (unreadable) {
      setFileError(unreadable);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFileName(file.name);

    // Tự động lấy tiêu đề đề bài theo tên file upload
    const autoTitle = formatTitleFromFileName(file.name);
    if (autoTitle) {
      setTitle(autoTitle);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">+ Tạo đề bài mới</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo đề bài mới</DialogTitle>
          <DialogDescription>
            Đề thuộc khóa học, mỗi buổi một đề
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction}>
          <input type="hidden" name="course_id" value={courseId} />
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
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
                <Label htmlFor="session_number">Buổi số *</Label>
                <Input
                  id="session_number"
                  name="session_number"
                  type="number"
                  min={1}
                  max={100}
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(e.target.value)}
                  placeholder="VD: 1"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="spec-file">
                File đề (PDF / Word / ảnh / text / md) *
              </Label>
              <Input
                id="spec-file"
                ref={fileRef}
                name="spec_file"
                type="file"
                accept=".pdf,.docx,.png,.jpg,.jpeg,.txt,.md"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">
                Nên dùng .txt/.md — file gõ trong Notepad chắc chắn đọc được.
              </p>
              {fileName && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ {fileName}
                </p>
              )}
              {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="attachment-files">
                  File dữ liệu / đính kèm bổ sung (tùy chọn)
                </Label>
                <span className="text-xs text-muted-foreground">
                  (CSV, JSON, code mẫu...)
                </span>
              </div>
              <Input
                id="attachment-files"
                ref={attachmentRef}
                name="attachment_files"
                type="file"
                multiple
                accept=".csv,.json,.sql,.py,.txt,.md,.pdf,.png,.jpg,.jpeg,.docx"
                onChange={(e) => {
                  handleAddAttachments(e.target.files);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                Đính kèm tệp dữ liệu (như file .csv) để học viên tải về và AI đối chiếu khi chấm hoặc hướng dẫn.
              </p>
              {attachmentFiles.length > 0 && (
                <div className="mt-2 space-y-1.5 rounded-lg border bg-muted/30 p-2.5">
                  <p className="text-xs font-medium text-foreground">
                    Đã chọn {attachmentFiles.length} file đính kèm:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {attachmentFiles.map((f, idx) => (
                      <span
                        key={`${f.name}-${idx}`}
                        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs"
                      >
                        <span className="text-muted-foreground">📄</span>
                        <span
                          className="max-w-[180px] truncate font-medium"
                          title={f.name}
                        >
                          {f.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({formatFileSize(f.size)})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="ml-0.5 text-muted-foreground hover:text-destructive"
                          title="Bỏ file này"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="assignment-title">Tiêu đề đề bài *</Label>
                <span className="text-xs text-muted-foreground">
                  (Tự động điền theo tên file)
                </span>
              </div>
              <Input
                id="assignment-title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: [CSB - Homework] Buổi 1 (tự điền khi chọn file)"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instructions">Hướng dẫn chấm (tùy chọn)</Label>
              <Textarea
                id="instructions"
                name="instructions"
                rows={2}
                placeholder="VD: Ưu tiên đúng logic vòng lặp; không trừ điểm lỗi chính tả trong chuỗi..."
              />
            </div>
            <FormMessage result={state} />
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="submit"
              disabled={
                pending ||
                !courseId ||
                !sessionNumber ||
                !title.trim() ||
                !fileName
              }
            >
              {pending ? "Đang tải lên & tạo..." : "Tạo đề bài"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
