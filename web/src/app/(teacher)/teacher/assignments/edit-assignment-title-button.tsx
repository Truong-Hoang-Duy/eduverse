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
import { updateAssignment } from "@/lib/actions/grading";
import type { ActionResult } from "@/lib/types";

export function EditAssignmentTitleButton({
  assignmentId,
  title,
  specFileName,
}: {
  assignmentId: string;
  title: string;
  specFileName?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateAssignment,
    {}
  );
  const [open, setOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [removeFile, setRemoveFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setSelectedFileName("");
      setRemoveFile(false);
    }
  }, [state.success]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setRemoveFile(false);
    } else {
      setSelectedFileName("");
    }
  }

  function handleClearNewFile() {
    setSelectedFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSelectedFileName("");
          setRemoveFile(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Chỉnh sửa đề ${title}`}
          title="Chỉnh sửa tên và file đề bài"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
        >
          ✏️
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa đề bài</DialogTitle>
          <DialogDescription>
            Đổi tiêu đề đề bài hoặc sửa, xóa, thay thế file đề hiện tại bằng file khác.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={assignmentId} />
          <input
            type="hidden"
            name="remove_file"
            value={removeFile ? "true" : "false"}
          />

          <div className="space-y-1.5">
            <Label htmlFor={`edit-assignment-title-${assignmentId}`}>
              Tiêu đề đề bài *
            </Label>
            <Input
              id={`edit-assignment-title-${assignmentId}`}
              name="title"
              defaultValue={title}
              required
            />
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                File đề bài hiện tại
              </Label>
              {specFileName && !removeFile && (
                <button
                  type="button"
                  onClick={() => {
                    setRemoveFile(true);
                    handleClearNewFile();
                  }}
                  className="text-[11px] font-medium text-destructive transition-colors hover:underline"
                >
                  ✕ Xóa file hiện tại
                </button>
              )}
            </div>

            {removeFile ? (
              <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
                <span>⚠️ File đề hiện tại sẽ bị xóa khi lưu.</span>
                <button
                  type="button"
                  onClick={() => setRemoveFile(false)}
                  className="font-medium underline hover:text-foreground"
                >
                  Khôi phục
                </button>
              </div>
            ) : specFileName ? (
              <div className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-xs">
                <span className="text-base">📋</span>
                <span
                  className="truncate font-medium text-foreground"
                  title={specFileName}
                >
                  {specFileName}
                </span>
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                (Đề bài này hiện chưa có file đính kèm)
              </p>
            )}

            <div className="pt-2">
              <Label
                htmlFor={`edit-assignment-file-${assignmentId}`}
                className="text-xs font-medium text-muted-foreground"
              >
                {specFileName && !removeFile
                  ? "Chọn file khác để thay thế file hiện tại:"
                  : "Tải file đề bài mới:"}
              </Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id={`edit-assignment-file-${assignmentId}`}
                  name="spec_file"
                  type="file"
                  accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.docx"
                  onChange={handleFileChange}
                  className="h-9 text-xs file:text-xs"
                />
                {selectedFileName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearNewFile}
                    className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Bỏ chọn file mới"
                  >
                    ✕
                  </Button>
                )}
              </div>
              {selectedFileName ? (
                <p className="mt-1.5 text-[11px] font-medium text-primary">
                  ✓ Sẽ thay thế bằng file mới: {selectedFileName} (file cũ sẽ được tự động xóa sạch)
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Hỗ trợ: .txt, .md, .pdf, .docx, ảnh (.png, .jpg). Tối đa 8MB.
                </p>
              )}
            </div>
          </div>

          <FormMessage result={state} />

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
