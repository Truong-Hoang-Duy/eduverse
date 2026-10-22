"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAssignmentSpec,
  type AssignmentSpec,
  type AssignmentSpecFile,
} from "@/lib/actions/grading";
import { cn } from "@/lib/utils";

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
  const [files, setFiles] = useState<AssignmentSpecFile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState("");
  const [pending, startLoad] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    // Tải mỗi lần mở: link ký chỉ sống 10 phút nên không cache lại được.
    setSpec(null);
    setFiles([]);
    setSelectedIndex(0);
    setError("");
    startLoad(async () => {
      const res = await getAssignmentSpec(assignmentId);
      if (res.error) {
        setError(res.error);
      } else {
        setSpec(res.spec ?? null);
        setFiles(res.files ?? []);
      }
    });
  }

  // File đang được chọn để xem
  const activeFile: AssignmentSpecFile | (AssignmentSpec & { isMain?: boolean }) | null =
    files.length > 0 ? (files[selectedIndex] ?? files[0]) : spec;

  const totalFiles = files.length > 0 ? files.length : spec ? 1 : 0;
  const isMultiple = totalFiles > 1;

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
              {totalFiles > 1
                ? ` · Tổng cộng ${totalFiles} tệp (1 đề chính + ${totalFiles - 1} tệp dữ liệu đính kèm)`
                : activeFile
                  ? ` · ${activeFile.fileName}`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          {pending && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Đang tải đề và các tệp đính kèm...
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </p>
          )}

          {!pending && !error && isMultiple && (
            <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
              {files.map((file, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={`${file.path}-${idx}`}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span>{file.isMain ? "📋 Đề chính:" : "📎 Dữ liệu:"}</span>
                    <span className="max-w-[170px] truncate" title={file.fileName}>
                      {file.fileName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!pending && !error && activeFile && (
            <div className="space-y-3">
              {/* Thanh thông tin file + nút tải file trực tiếp */}
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-foreground truncate" title={activeFile.fileName}>
                    {activeFile.fileName}
                  </span>
                  {activeFile.isMain ? (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      Đề bài chính
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                      Dữ liệu đính kèm
                    </Badge>
                  )}
                </div>
                {activeFile.url && (
                  <a
                    href={activeFile.url}
                    download={activeFile.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded bg-background px-2.5 py-1 text-xs font-medium text-primary shadow-2xs hover:bg-accent"
                  >
                    <span>⬇</span>
                    <span>Tải file</span>
                  </a>
                )}
              </div>

              {/* Preview nội dung file */}
              {activeFile.kind === "text" && (
                <pre className="max-h-[55vh] overflow-auto rounded-lg border bg-muted/20 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {activeFile.content}
                </pre>
              )}

              {activeFile.kind === "image" && (
                // Link ký sống 10 phút và đổi mỗi lần mở → next/image không cache
                // được gì, chỉ tổ phải khai báo remotePatterns cho host Supabase.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeFile.url}
                  alt={activeFile.fileName}
                  className="max-h-[60vh] w-full rounded-lg border bg-muted/20 object-contain"
                />
              )}

              {activeFile.kind === "download" && (
                <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    File này là định dạng nhị phân hoặc không thể hiển thị trực tiếp — tải về máy để mở.
                  </p>
                  {activeFile.url && (
                    <a
                      href={activeFile.url}
                      download={activeFile.fileName}
                      className="inline-block text-sm font-medium text-primary hover:underline"
                    >
                      ⬇ Tải {activeFile.fileName}
                    </a>
                  )}
                </div>
              )}

              {activeFile.kind === "pdf" && (
                <iframe
                  src={activeFile.url}
                  title={activeFile.fileName}
                  className="h-[60vh] w-full rounded-lg border"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
