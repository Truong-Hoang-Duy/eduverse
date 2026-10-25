"use client";

import { useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  attachAssignmentFiles,
  getAssignmentSpec,
  removeAssignmentAttachment,
  removeAssignmentMainFile,
  replaceAssignmentSpecFile,
  type AssignmentSpec,
  type AssignmentSpecFile,
} from "@/lib/actions/grading";
import { CsvTableView } from "@/components/csv-table-view";
import { isCheckpointAssignment } from "@/lib/assignment-utils";
import { cn } from "@/lib/utils";

function getFileFormatBadge(
  fileName: string,
  kind?: AssignmentSpecFile["kind"]
) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (kind === "pdf" || ext === "pdf") {
    return (
      <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
        PDF
      </span>
    );
  }
  if (ext === "csv") {
    return (
      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
        CSV Data
      </span>
    );
  }
  if (ext === "docx") {
    return (
      <span className="rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
        Word DOCX
      </span>
    );
  }
  if (["py", "sql", "js", "ts", "json", "html", "css"].includes(ext)) {
    return (
      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
        {ext.toUpperCase()} Code
      </span>
    );
  }
  if (kind === "image") {
    return (
      <span className="rounded bg-purple-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
        Ảnh
      </span>
    );
  }
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
      {ext ? ext.toUpperCase() : "File"}
    </span>
  );
}

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
  const [copiedContent, setCopiedContent] = useState(false);

  // Trạng thái đính kèm thêm file trực tiếp từ popup xem
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPending, startAdd] = useTransition();
  const [addMsg, setAddMsg] = useState("");
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Trạng thái thay thế file đề chính
  const [showReplaceMainForm, setShowReplaceMainForm] = useState(false);
  const [replacePending, startReplace] = useTransition();
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  function loadSpecData() {
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setSpec(null);
    setFiles([]);
    setSelectedIndex(0);
    setError("");
    setShowAddForm(false);
    setShowReplaceMainForm(false);
    setAddMsg("");
    setCopiedLink(false);
    setCopiedContent(false);
    loadSpecData();
  }

  // Upload thêm tệp dữ liệu vào đề hiện tại
  function handleAddFiles(formData: FormData) {
    setAddMsg("");
    startAdd(async () => {
      const res = await attachAssignmentFiles(assignmentId, formData);
      if (res.error) {
        setAddMsg(`Lỗi: ${res.error}`);
      } else {
        setAddMsg(res.success ?? "Đã thêm file.");
        setShowAddForm(false);
        if (addFileInputRef.current) addFileInputRef.current.value = "";
        loadSpecData();
      }
    });
  }

  // Thay thế file đề chính
  function handleReplaceMainFile(formData: FormData) {
    setAddMsg("");
    setError("");
    startReplace(async () => {
      const res = await replaceAssignmentSpecFile(assignmentId, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setAddMsg(res.success ?? "Đã thay đổi file đề.");
        setShowReplaceMainForm(false);
        if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
        loadSpecData();
      }
    });
  }

  // Xóa file đề chính
  function handleRemoveMainFile() {
    if (
      !confirm(
        "Bạn có chắc chắn muốn xóa file đề bài chính này? Bạn có thể tải file mới lên sau."
      )
    ) {
      return;
    }
    startLoad(async () => {
      const res = await removeAssignmentMainFile(assignmentId);
      if (res.error) {
        setError(res.error);
      } else {
        loadSpecData();
      }
    });
  }

  // Copy link xem đề checkpoint gửi học viên
  function handleCopyCheckpointLink() {
    const url = `${window.location.origin}/checkpoints/${assignmentId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  // Copy nội dung văn bản
  function handleCopyContent(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2500);
  }

  // Xóa bớt một tệp đính kèm
  function handleRemoveFile(filePath: string, fileName: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa tệp "${fileName}" khỏi đề bài này?`)) {
      return;
    }
    startLoad(async () => {
      const res = await removeAssignmentAttachment(assignmentId, filePath);
      if (res.error) {
        setError(res.error);
      } else {
        setSelectedIndex(0);
        loadSpecData();
      }
    });
  }

  const activeFile:
    | AssignmentSpecFile
    | (AssignmentSpec & { isMain?: boolean; path?: string })
    | null = files.length > 0 ? (files[selectedIndex] ?? files[0]) : spec;

  const totalFiles = files.length > 0 ? files.length : spec ? 1 : 0;
  const isMultiple = totalFiles > 1;
  const isCsv =
    activeFile?.fileName.toLowerCase().endsWith(".csv") &&
    activeFile.kind === "text" &&
    typeof activeFile.content === "string";
  const isCheckpoint = isCheckpointAssignment(title);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label={`Xem đề buổi ${sessionNumber}`}
          title="Xem nội dung đề & tệp dữ liệu"
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
          👁 Xem đề & tệp dữ liệu
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
                <DialogDescription>
                  Buổi {sessionNumber}
                  {totalFiles > 1
                    ? ` · Tổng cộng ${totalFiles} tệp (1 đề chính + ${totalFiles - 1} tài liệu tùy chọn)`
                    : activeFile
                      ? ` · ${activeFile.fileName}`
                      : ""}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isCheckpoint && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 gap-1.5 text-xs font-medium transition-colors",
                        copiedLink
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "text-primary hover:bg-primary/10"
                      )}
                      onClick={handleCopyCheckpointLink}
                      title="Copy link xem đề trực tiếp cho học viên (không cần đăng nhập)"
                    >
                      <span>{copiedLink ? "✓" : "🔗"}</span>
                      <span>
                        {copiedLink ? "Đã copy link học viên!" : "Copy link học viên"}
                      </span>
                    </Button>
                    <a
                      href={`/checkpoints/${assignmentId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Mở xem trang học viên trên tab mới"
                    >
                      <span>↗</span>
                      <span>Xem trang học viên</span>
                    </a>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setShowReplaceMainForm(false);
                  }}
                >
                  <span>{showAddForm ? "Đóng" : "+ Đính kèm thêm file"}</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Form thay thế / ghi đè file đề bài chính */}
          {showReplaceMainForm && (
            <form
              action={handleReplaceMainFile}
              className="space-y-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Chọn file đề bài mới để ghi đè file hiện tại:
                </span>
                <span className="text-[11px] text-muted-foreground">
                  (File cũ sẽ được tự động xóa sạch)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  ref={replaceFileInputRef}
                  name="spec_file"
                  type="file"
                  accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.docx"
                  className="h-8 text-xs file:text-xs"
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={replacePending}
                  className="h-8 shrink-0 text-xs font-medium"
                >
                  {replacePending ? "Đang ghi đè..." : "Tải lên & Ghi đè"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplaceMainForm(false)}
                  className="h-8 px-2 text-xs"
                >
                  Hủy
                </Button>
              </div>
            </form>
          )}

          {/* Form thêm file dữ liệu trực tiếp vào đề đã có */}
          {showAddForm && (
            <form
              action={handleAddFiles}
              className="space-y-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Đính kèm thêm file tài liệu vào đề này:
                </span>
                <span className="text-[11px] text-muted-foreground">
                  (PDF, CSV, JSON, Python, Dataset, Slide...)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  ref={addFileInputRef}
                  name="attachment_files"
                  type="file"
                  multiple
                  accept=".csv,.json,.sql,.py,.txt,.md,.pdf,.png,.jpg,.jpeg,.docx"
                  className="h-8 text-xs file:text-xs"
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={addPending}
                  className="h-8 shrink-0 text-xs font-medium"
                >
                  {addPending ? "Đang tải lên..." : "Tải lên"}
                </Button>
              </div>
              {addMsg && (
                <p className="text-xs font-medium text-primary">{addMsg}</p>
              )}
            </form>
          )}

          {pending && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Đang tải đề và các tệp dữ liệu...
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Thanh chuyển đổi tài liệu (Document Tab Switcher) */}
          {!pending && !error && isMultiple && (
            <div className="space-y-1.5 rounded-xl border border-border/70 bg-muted/20 p-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Chuyển đổi tài liệu ({totalFiles} tệp):
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Bấm vào tài liệu bên dưới để xem hoặc tải
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {files.map((file, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={`${file.path}-${idx}`}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={cn(
                        "group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                        isSelected
                          ? "bg-background text-foreground shadow-xs font-semibold border border-border/80 ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                      )}
                    >
                      <span className="text-sm">
                        {file.isMain ? "📋" : "📎"}
                      </span>
                      <span
                        className="max-w-[170px] truncate sm:max-w-[220px]"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </span>
                      {file.isMain ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Đề chính
                        </span>
                      ) : (
                        getFileFormatBadge(file.fileName, file.kind)
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!pending && !error && activeFile && (
            <div className="space-y-3">
              {/* Header tệp đang chọn + Nút Tải + Nút Thay/Xóa */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3.5 py-2.5 text-xs border border-border/60">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base">
                    {activeFile.isMain ? "📋" : "📎"}
                  </span>
                  <span
                    className="truncate font-bold text-foreground text-xs sm:text-sm"
                    title={activeFile.fileName}
                  >
                    {activeFile.fileName}
                  </span>
                  {activeFile.isMain ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      Đề bài chính
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      Tài liệu tùy chọn
                    </Badge>
                  )}
                  {getFileFormatBadge(activeFile.fileName, activeFile.kind)}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {/* Nút Sao chép nội dung text/code */}
                  {!isCsv &&
                    activeFile.kind === "text" &&
                    activeFile.content && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyContent(activeFile.content)}
                        className="h-7 gap-1 px-2 text-xs"
                      >
                        <span>{copiedContent ? "✓" : "📋"}</span>
                        <span>
                          {copiedContent ? "Đã chép!" : "Sao chép"}
                        </span>
                      </Button>
                    )}

                  {/* Nút Mở tab mới (cho PDF / Ảnh) */}
                  {activeFile.url &&
                    (activeFile.kind === "pdf" ||
                      activeFile.kind === "image") && (
                      <a
                        href={activeFile.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 items-center gap-1 rounded border border-input bg-background px-2 text-xs font-medium text-foreground shadow-2xs hover:bg-accent"
                        title="Mở tài liệu trên tab mới để xem toàn màn hình hoặc in"
                      >
                        <span>↗</span>
                        <span>Mở tab mới</span>
                      </a>
                    )}

                  {/* Nút Tải file */}
                  {activeFile.url && (
                    <a
                      href={activeFile.url}
                      download={activeFile.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-7 items-center gap-1 rounded bg-primary px-2.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90"
                    >
                      <span>⬇</span>
                      <span>Tải file</span>
                    </a>
                  )}

                  {activeFile.isMain ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowReplaceMainForm(!showReplaceMainForm);
                          setShowAddForm(false);
                        }}
                        title="Thay thế file đề bài chính này bằng file khác"
                        className="h-7 gap-1 px-2 text-xs font-medium"
                      >
                        <span>🔄</span>
                        <span>{showReplaceMainForm ? "Đóng" : "Thay file khác"}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveMainFile}
                        title="Xóa file đề bài chính"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        ✕ Xóa file
                      </Button>
                    </>
                  ) : (
                    "path" in activeFile &&
                    activeFile.path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveFile(
                            (activeFile as AssignmentSpecFile).path,
                            activeFile.fileName
                          )
                        }
                        title="Xóa tệp đính kèm này"
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        ✕ Xóa tệp
                      </Button>
                    )
                  )}
                </div>
              </div>

              {/* 1. Preview PDF */}
              {activeFile.kind === "pdf" && activeFile.url && (
                <div className="space-y-2">
                  <div className="relative overflow-hidden rounded-xl border border-border/80 bg-muted/10 shadow-inner">
                    <iframe
                      src={`${activeFile.url}#view=FitH`}
                      title={activeFile.fileName}
                      className="h-[68vh] min-h-[500px] w-full border-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>
                      💡 Bạn có thể cuộn, phóng to, in hoặc tìm kiếm trực tiếp trên thanh công cụ PDF.
                    </span>
                    <a
                      href={activeFile.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      Mở tab riêng toàn màn hình ↗
                    </a>
                  </div>
                </div>
              )}

              {/* 2. Preview định dạng CSV dạng Bảng dữ liệu hoặc Văn bản */}
              {isCsv && (
                <CsvTableView
                  content={
                    (activeFile as AssignmentSpecFile & { content: string })
                      .content
                  }
                />
              )}

              {/* 3. Preview định dạng text/code thông thường */}
              {!isCsv && activeFile.kind === "text" && (
                <pre className="max-h-[60vh] overflow-auto rounded-xl border bg-muted/20 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {activeFile.content}
                </pre>
              )}

              {/* 4. Preview định dạng ảnh */}
              {activeFile.kind === "image" && activeFile.url && (
                <div className="overflow-hidden rounded-xl border bg-muted/20 p-2 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeFile.url}
                    alt={activeFile.fileName}
                    className="max-h-[65vh] w-full rounded-lg object-contain mx-auto shadow-2xs"
                  />
                </div>
              )}

              {/* 5. Định dạng nhị phân/Word */}
              {activeFile.kind === "download" && (
                <div className="space-y-3 rounded-xl border border-dashed p-6 text-center bg-muted/10">
                  <span className="text-3xl">📦</span>
                  <p className="text-sm font-semibold text-foreground">
                    Tài liệu &quot;{activeFile.fileName}&quot;
                  </p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    File này là định dạng nhị phân hoặc không thể hiển thị trực tiếp — hãy tải về máy để mở bằng ứng dụng tương thích.
                  </p>
                  {activeFile.url && (
                    <div className="pt-1">
                      <a
                        href={activeFile.url}
                        download={activeFile.fileName}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-colors"
                      >
                        <span>⬇</span>
                        <span>Tải {activeFile.fileName}</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Danh sách tải nhanh tất cả tài liệu nếu có nhiều file */}
              {totalFiles > 1 && (
                <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>📁</span>
                      <span>Tải nhanh các tài liệu của đề bài này:</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {totalFiles} tệp khả dụng
                    </span>
                  </div>

                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {files.map((file, idx) => (
                      <div
                        key={`quick-download-${file.path}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span>{file.isMain ? "📋" : "📎"}</span>
                          <span
                            className="truncate font-medium text-foreground"
                            title={file.fileName}
                          >
                            {file.fileName}
                          </span>
                        </div>
                        {file.url && (
                          <a
                            href={file.url}
                            download={file.fileName}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-[11px] font-semibold text-primary border border-border/60 shadow-2xs hover:bg-accent transition-colors"
                          >
                            <span>⬇ Tải</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
