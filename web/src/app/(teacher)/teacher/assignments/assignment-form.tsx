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
import { checkFileReadable } from "@/lib/file-check";
import type { ActionResult } from "@/lib/types";

export interface CourseChoice {
  id: string;
  code: string;
  name: string;
}

export function AssignmentForm({ courses }: { courses: CourseChoice[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createAssignment,
    {}
  );
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Tạo xong thì đóng popup và dọn form cho lần tạo sau.
  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setFileName("");
      setCourseId("");
      setFileError("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [state.success]);

  /**
   * Chỉ kiểm file tại chỗ để báo lỗi ngay; file lên Storage khi bấm "Tạo đề bài"
   * (trong createAssignment) nên bỏ dở giữa chừng không để lại rác.
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
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Tạo đề bài mới</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo đề bài mới</DialogTitle>
          <DialogDescription>
            Đề thuộc khóa học, mỗi buổi một đề
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="course_id" value={courseId} />
          <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label>Khóa học *</Label>
              <Select value={courseId} onValueChange={setCourseId}>
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
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assignment-title">Tiêu đề đề bài *</Label>
            <Input
              id="assignment-title"
              name="title"
              placeholder="VD: Vẽ tam giác sao bằng vòng lặp for"
              required
            />
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
            <Button type="submit" disabled={pending || !courseId || !fileName}>
              {pending ? "Đang tải lên & tạo..." : "Tạo đề bài"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
