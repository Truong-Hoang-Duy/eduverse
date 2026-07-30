"use client";

import { useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAssignmentSpec, type AssignmentSpec } from "@/lib/actions/grading";

export function ViewSpecDialog({
  assignmentId,
  sessionNumber,
  title,
  variant = "icon",
}: {
  assignmentId: string;
  sessionNumber: number;
  title: string;
  /** "icon": nút 👁 trong thẻ đề. "link": chữ "Xem đề" cạnh ô chọn khi chấm. */
  variant?: "icon" | "link";
}) {
  const [open, setOpen] = useState(false);
  const [spec, setSpec] = useState<AssignmentSpec | null>(null);
  const [error, setError] = useState("");
  const [pending, startLoad] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    // Tải mỗi lần mở: link ký chỉ sống 10 phút nên không cache lại được.
    setSpec(null);
    setError("");
    startLoad(async () => {
      const res = await getAssignmentSpec(assignmentId);
      if (res.error) setError(res.error);
      else setSpec(res.spec ?? null);
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label={`Xem đề buổi ${sessionNumber}`}
          title="Xem nội dung đề"
          onClick={() => handleOpenChange(true)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
        >
          👁
        </button>
      ) : (
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className="text-xs font-medium text-primary transition-colors hover:underline"
        >
          👁 Xem đề
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Buổi {sessionNumber}
              {spec ? ` · ${spec.fileName}` : ""}
            </DialogDescription>
          </DialogHeader>

          {pending && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Đang tải đề...
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </p>
          )}

          {spec?.kind === "text" && (
            <pre className="max-h-[60vh] overflow-auto rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap break-words">
              {spec.content}
            </pre>
          )}

          {spec?.kind === "image" && (
            // Link ký sống 10 phút và đổi mỗi lần mở → next/image không cache
            // được gì, chỉ tổ phải khai báo remotePatterns cho host Supabase.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spec.url}
              alt={`Đề bài buổi ${sessionNumber}`}
              className="h-auto w-full rounded-lg border bg-muted/40 object-contain"
            />
          )}

          {spec?.kind === "download" && (
            <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Không đọc được chữ trong file này (có thể đề chỉ là ảnh chụp dán
                vào Word) — tải về mở bằng Word để xem.
              </p>
              <a
                href={spec.url}
                download={spec.fileName}
                className="inline-block text-sm font-medium text-primary hover:underline"
              >
                ⬇ Tải {spec.fileName}
              </a>
            </div>
          )}

          {spec?.kind === "pdf" && (
            <iframe
              src={spec.url}
              title={`Đề bài buổi ${sessionNumber}`}
              className="h-[65vh] w-full rounded-lg border"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
