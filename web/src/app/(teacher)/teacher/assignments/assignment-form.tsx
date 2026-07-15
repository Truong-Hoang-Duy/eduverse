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
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/types";

export interface CourseChoice {
  id: string;
  code: string;
  name: string;
}

/** Đổi tên file an toàn cho Storage key (bỏ dấu, ký tự lạ). */
function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function AssignmentForm({ courses }: { courses: CourseChoice[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createAssignment,
    {}
  );
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [specPath, setSpecPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Tạo xong thì đóng popup và dọn form cho lần tạo sau.
  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setSpecPath("");
      setCourseId("");
      setUploadError("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [state.success]);

  async function handleFileChange(file: File | undefined) {
    setUploadError("");
    setSpecPath("");
    if (!file || !courseId) {
      if (file && !courseId) setUploadError("Chọn khóa học trước khi upload đề.");
      return;
    }

    // Chặn sớm file bị DLP mã hóa — upload lên AI cũng không đọc được.
    const unreadable = await checkFileReadable(file);
    if (unreadable) {
      setUploadError(unreadable);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const path = `${courseId}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from("assignment-specs")
      .upload(path, file);
    setUploading(false);
    if (error) {
      setUploadError(`Upload thất bại: ${error.message}`);
    } else {
      setSpecPath(path);
    }
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
            Đề thuộc khóa học, mỗi buổi một đề — dùng chung mọi lớp cùng khóa
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="course_id" value={courseId} />
          <input type="hidden" name="spec_file_path" value={specPath} />
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
            <Label htmlFor="spec-file">File đề (PDF / ảnh / text / md) *</Label>
            <Input
              id="spec-file"
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.md"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            {uploading && (
              <p className="text-xs text-muted-foreground">Đang upload...</p>
            )}
            {specPath && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Đã upload file đề
              </p>
            )}
            {uploadError && (
              <p className="text-xs text-destructive">{uploadError}</p>
            )}
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
              disabled={pending || uploading || !specPath}
            >
              {pending ? "Đang tạo..." : "Tạo đề bài"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
