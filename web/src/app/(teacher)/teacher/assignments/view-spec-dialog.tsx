"use client";

import { useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  const [activeTab, setActiveTab] = useState<"main" | "attachments">("main");
  const [selectedAttachmentIdx, setSelectedAttachmentIdx] = useState(0);

  const [spec, setSpec] = useState<AssignmentSpec | null>(null);
  const [files, setFiles] = useState<AssignmentSpecFile[]>([]);
  const [error, setError] = useState("");
  const [pending, startLoad] = useTransition();

  const [copiedMainContent, setCopiedMainContent] = useState(false);
  const [copiedAttachmentContent, setCopiedAttachmentContent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [confirmDeleteMain, setConfirmDeleteMain] = useState(false);
  const [confirmDeleteAttPath, setConfirmDeleteAttPath] = useState<string | null>(null);

  // Form đính kèm thêm file
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPending, startAdd] = useTransition();
  const [addMsg, setAddMsg] = useState("");
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Form thay thế file đề chính
  const [showReplaceMainForm, setShowReplaceMainForm] = useState(false);
  const [replacePending, startReplace] = useTransition();
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

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
    setActiveTab("main");
    setSelectedAttachmentIdx(0);
    setSpec(null);
    setFiles([]);
    setError("");
    setShowAddForm(false);
    setShowReplaceMainForm(false);
    setConfirmDeleteMain(false);
    setConfirmDeleteAttPath(null);
    setAddMsg("");
    setCopiedLink(false);
    setCopiedMainContent(false);
    setCopiedAttachmentContent(false);
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
        setAddMsg("");
        setShowAddForm(false);
        if (addFileInputRef.current) addFileInputRef.current.value = "";
        loadSpecData();
        setActiveTab("attachments");
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
        setShowReplaceMainForm(false);
        if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
        loadSpecData();
      }
    });
  }

  // Xóa file đề chính
  function handleRemoveMainFile() {
    startLoad(async () => {
      const res = await removeAssignmentMainFile(assignmentId);
      if (res.error) {
        setError(res.error);
      } else {
        setConfirmDeleteMain(false);
        loadSpecData();
      }
    });
  }

  // Xóa một tệp đính kèm
  function handleRemoveAttachment(filePath: string) {
    startLoad(async () => {
      const res = await removeAssignmentAttachment(assignmentId, filePath);
      if (res.error) {
        setError(res.error);
      } else {
        setConfirmDeleteAttPath(null);
        setSelectedAttachmentIdx(0);
        loadSpecData();
      }
    });
  }

  // Copy link file đề trực tiếp (signed URL) để gửi học viên
  function handleCopyFileLink() {
    const targetUrl =
      activeTab === "main" ? mainFile?.url : activeAttachment?.url;
    const url =
      targetUrl || `${window.location.origin}/checkpoints/${assignmentId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  function handleCopyText(text: string, isMain: boolean) {
    navigator.clipboard.writeText(text);
    if (isMain) {
      setCopiedMainContent(true);
      setTimeout(() => setCopiedMainContent(false), 2000);
    } else {
      setCopiedAttachmentContent(true);
      setTimeout(() => setCopiedAttachmentContent(false), 2000);
    }
  }

  const mainFile =
    files.find((f) => f.isMain) ??
    (spec ? { ...spec, isMain: true, path: "" } : null);
  const attachmentFiles = files.filter((f) => !f.isMain);
  const activeAttachment =
    attachmentFiles[selectedAttachmentIdx] ?? attachmentFiles[0] ?? null;

  const isCheckpoint = isCheckpointAssignment(title);
  const isMainCsv =
    mainFile?.fileName.toLowerCase().endsWith(".csv") &&
    mainFile.kind === "text" &&
    typeof mainFile.content === "string";

  const isAttCsv =
    activeAttachment?.fileName.toLowerCase().endsWith(".csv") &&
    activeAttachment.kind === "text" &&
    typeof activeAttachment.content === "string";

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label={`Xem đề buổi ${sessionNumber}`}
          title="Xem nội dung đề & tệp dữ liệu"
          onClick={() => handleOpenChange(true)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary cursor-pointer"
        >
          👁
        </button>
      ) : (
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className="text-xs font-medium text-primary transition-colors hover:underline cursor-pointer"
        >
          👁 Xem đề & tệp dữ liệu
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl p-5">
          {/* Header gọn gàng */}
          <DialogHeader className="gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  {title}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">Buổi {sessionNumber}</p>
              </div>

              {/* Action trên header */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(() => {
                  const targetUrl =
                    activeTab === "main" ? mainFile?.url : activeAttachment?.url;

                  return (
                    <>
                      {targetUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-7 gap-1 px-2 text-xs font-medium transition-colors",
                            copiedLink
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "text-primary hover:bg-primary/10"
                          )}
                          onClick={handleCopyFileLink}
                          title="Copy link file đề trực tiếp để gửi học sinh"
                        >
                          <span>{copiedLink ? "✓" : "🔗"}</span>
                          <span>{copiedLink ? "Đã chép link!" : "Copy link gửi học sinh"}</span>
                        </Button>
                      )}

                      {targetUrl ? (
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground hover:bg-accent"
                          title="Mở thẳng tới trang file này để gửi học sinh"
                        >
                          <span>↗ Mở xem</span>
                        </a>
                      ) : isCheckpoint ? (
                        <a
                          href={`/checkpoints/${assignmentId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Mở trang đề bài học viên"
                        >
                          <span>↗ Mở xem</span>
                        </a>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Thanh chuyển 2 TAB tối giản */}
            <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 mt-1 w-fit border border-border/40">
              <button
                type="button"
                onClick={() => setActiveTab("main")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  activeTab === "main"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>📋</span>
                <span>Đề bài chính</span>
                {mainFile && (
                  <Badge variant="outline" className="h-4 px-1 text-[9px]">
                    1
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("attachments")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  activeTab === "attachments"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>📎</span>
                <span>Tệp đính kèm</span>
                {attachmentFiles.length > 0 && (
                  <Badge className="h-4 px-1 text-[9px] bg-primary/15 text-primary hover:bg-primary/20 border-none font-bold">
                    {attachmentFiles.length}
                  </Badge>
                )}
              </button>
            </div>
          </DialogHeader>

          {/* Form thay thế file đề chính */}
          {showReplaceMainForm && activeTab === "main" && (
            <form
              action={handleReplaceMainFile}
              className="space-y-2 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Chọn file đề bài mới để ghi đè:
                </span>
                <button
                  type="button"
                  onClick={() => setShowReplaceMainForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕ Đóng
                </button>
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
                  {replacePending ? "Đang tải..." : "Tải lên & Ghi đè"}
                </Button>
              </div>
            </form>
          )}

          {/* Form thêm tệp đính kèm */}
          {showAddForm && activeTab === "attachments" && (
            <form
              action={handleAddFiles}
              className="space-y-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Chọn file đính kèm (CSV, JSON, Python, Slide...):
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕ Đóng
                </button>
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
                  {addPending ? "Đang tải..." : "Tải lên"}
                </Button>
              </div>
              {addMsg && (
                <p className="text-xs font-medium text-destructive">{addMsg}</p>
              )}
            </form>
          )}

          {pending && (
            <p className="py-12 text-center text-xs text-muted-foreground">
              Đang tải tài liệu...
            </p>
          )}

          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </p>
          )}

          {/* NỘI DUNG 2 TAB */}
          {!pending && !error && (
            <div className="pt-1">
              {/* TAB 1: ĐỀ BÀI CHÍNH */}
              {activeTab === "main" && (
                <div className="space-y-3">
                  {mainFile ? (
                    <>
                      {/* Toolbar Đề chính */}
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2 text-xs border border-border/60">
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate font-semibold text-foreground text-xs sm:text-sm">
                            {mainFile.fileName}
                          </span>
                          {getFileFormatBadge(mainFile.fileName, mainFile.kind)}
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {!isMainCsv &&
                            mainFile.kind === "text" &&
                            mainFile.content && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleCopyText(mainFile.content ?? "", true)
                                }
                                className="h-7 px-2 text-xs gap-1"
                              >
                                <span>{copiedMainContent ? "✓" : "📋"}</span>
                                <span>{copiedMainContent ? "Đã chép" : "Sao chép"}</span>
                              </Button>
                            )}

                          {mainFile.url && (
                            <a
                              href={mainFile.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground hover:bg-accent"
                              title="Mở xem file PDF trên tab mới"
                            >
                              <span>↗ Mở xem</span>
                            </a>
                          )}

                          {mainFile.url && (
                            <a
                              href={mainFile.url}
                              download={mainFile.fileName}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                              <span>⬇ Tải</span>
                            </a>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowReplaceMainForm(!showReplaceMainForm);
                              setShowAddForm(false);
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            🔄 Thay file
                          </Button>

                          {confirmDeleteMain ? (
                            <div className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs">
                              <span className="text-[11px] font-medium text-destructive">
                                Xóa?
                              </span>
                              <button
                                type="button"
                                onClick={handleRemoveMainFile}
                                className="font-bold text-destructive hover:underline cursor-pointer"
                              >
                                Có
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteMain(false)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer ml-1"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDeleteMain(true)}
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              ✕ Xóa
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Khung xem đề chính */}
                      {mainFile.kind === "pdf" && (
                        mainFile.url ? (
                          <div className="overflow-hidden rounded-xl border border-border/80 shadow-inner bg-card">
                            <iframe
                              src={`${mainFile.url}#view=FitH`}
                              title={mainFile.fileName}
                              className="h-[68vh] min-h-[500px] w-full border-none"
                            />
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed p-8 text-center bg-muted/10 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Đang chuẩn bị đường dẫn xem file PDF...
                            </p>
                          </div>
                        )
                      )}

                      {isMainCsv && (
                        <CsvTableView
                          content={
                            (mainFile as AssignmentSpecFile & { content: string })
                              .content
                          }
                          fileName={mainFile.fileName}
                          downloadUrl={mainFile.url}
                          hideGuide={true}
                        />
                      )}

                      {!isMainCsv && mainFile.kind === "text" && (
                        <pre className="max-h-[68vh] overflow-auto rounded-xl border bg-muted/20 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                          {mainFile.content}
                        </pre>
                      )}

                      {mainFile.kind === "image" && mainFile.url && (
                        <div className="overflow-hidden rounded-xl border bg-muted/20 p-2 text-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mainFile.url}
                            alt={mainFile.fileName}
                            className="max-h-[68vh] w-full rounded-lg object-contain mx-auto"
                          />
                        </div>
                      )}

                      {mainFile.kind === "download" && (
                        <div className="rounded-xl border border-dashed p-8 text-center bg-muted/10 space-y-2">
                          <span className="text-3xl">📦</span>
                          <p className="text-xs font-semibold text-foreground">
                            {mainFile.fileName}
                          </p>
                          {mainFile.url && (
                            <a
                              href={mainFile.url}
                              download={mainFile.fileName}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                              ⬇ Tải file về máy
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed p-8 text-center bg-muted/10 space-y-2">
                      <p className="text-xs font-semibold text-foreground">
                        Chưa có file đề bài chính
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowReplaceMainForm(true)}
                        className="h-8 text-xs font-medium"
                      >
                        + Tải file đề lên
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TỆP ĐÍNH KÈM */}
              {activeTab === "attachments" && (
                <div className="space-y-3">
                  {attachmentFiles.length === 0 ? (
                    !showAddForm && (
                      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-10 text-center">
                        <span className="text-3xl">📎</span>
                        <p className="mt-2 text-xs sm:text-sm font-semibold text-foreground">
                          Chưa có tệp đính kèm nào
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 h-8 text-xs font-medium gap-1"
                          onClick={() => setShowAddForm(true)}
                        >
                          + Đính kèm file ngay
                        </Button>
                      </div>
                    )
                  ) : (
                    <>
                      {/* Thanh chọn tệp đính kèm nếu có từ 2 file trở lên */}
                      {attachmentFiles.length > 1 && (
                        <div className="flex flex-wrap items-center gap-1.5 pb-1">
                          {attachmentFiles.map((file, idx) => {
                            const isSelected = idx === selectedAttachmentIdx;
                            return (
                              <button
                                key={`${file.path}-${idx}`}
                                type="button"
                                onClick={() => setSelectedAttachmentIdx(idx)}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                                  isSelected
                                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <span>{file.fileName}</span>
                                {getFileFormatBadge(file.fileName, file.kind)}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Toolbar tệp đính kèm hiển thị đồng bộ như phần trên */}
                      {activeAttachment && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2 text-xs border border-border/60">
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate font-semibold text-foreground text-xs sm:text-sm">
                              {activeAttachment.fileName}
                            </span>
                            {getFileFormatBadge(
                              activeAttachment.fileName,
                              activeAttachment.kind
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {!isAttCsv &&
                              activeAttachment.kind === "text" &&
                              activeAttachment.content && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleCopyText(
                                      activeAttachment.content ?? "",
                                      false
                                    )
                                  }
                                  className="h-7 px-2 text-xs gap-1"
                                >
                                  <span>
                                    {copiedAttachmentContent ? "✓" : "📋"}
                                  </span>
                                  <span>
                                    {copiedAttachmentContent ? "Đã chép" : "Sao chép"}
                                  </span>
                                </Button>
                              )}

                            {activeAttachment.url && (
                              <a
                                href={activeAttachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground hover:bg-accent"
                                title="Mở xem nguyên file trên tab mới"
                              >
                                <span>↗ Mở xem</span>
                              </a>
                            )}

                            {activeAttachment.url && (
                              <a
                                href={activeAttachment.url}
                                download={activeAttachment.fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                              >
                                <span>⬇ Tải</span>
                              </a>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setShowAddForm(!showAddForm)}
                            >
                              <span>{showAddForm ? "✕ Đóng" : "+ Thêm tệp"}</span>
                            </Button>

                            {confirmDeleteAttPath === activeAttachment.path ? (
                              <div className="inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs">
                                <span className="text-[11px] font-medium text-destructive">
                                  Xóa?
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveAttachment(activeAttachment.path)
                                  }
                                  className="font-bold text-destructive hover:underline cursor-pointer"
                                >
                                  Có
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAttPath(null)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer ml-1"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setConfirmDeleteAttPath(activeAttachment.path)
                                }
                                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                ✕ Xóa
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Khung hiển thị nội dung tệp đính kèm đang chọn */}
                      {activeAttachment && (
                        <div className="pt-1">
                          {isAttCsv && (
                            <CsvTableView
                              content={activeAttachment.content as string}
                              fileName={activeAttachment.fileName}
                              downloadUrl={activeAttachment.url}
                              hideGuide={true}
                            />
                          )}

                          {!isAttCsv && activeAttachment.kind === "text" && (
                            <pre className="max-h-[68vh] overflow-auto rounded-xl border bg-muted/20 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                              {activeAttachment.content}
                            </pre>
                          )}

                          {activeAttachment.kind === "pdf" && activeAttachment.url && (
                            <div className="overflow-hidden rounded-xl border border-border/80 shadow-inner">
                              <iframe
                                src={`${activeAttachment.url}#view=FitH`}
                                title={activeAttachment.fileName}
                                className="h-[68vh] min-h-[500px] w-full border-none"
                              />
                            </div>
                          )}

                          {activeAttachment.kind === "image" && activeAttachment.url && (
                            <div className="overflow-hidden rounded-xl border bg-muted/20 p-2 text-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={activeAttachment.url}
                                alt={activeAttachment.fileName}
                                className="max-h-[68vh] w-full rounded-lg object-contain mx-auto"
                              />
                            </div>
                          )}

                          {activeAttachment.kind === "download" && (
                            <div className="rounded-xl border border-dashed p-8 text-center bg-muted/10 space-y-2">
                              <span className="text-3xl">📦</span>
                              <p className="text-xs font-semibold text-foreground">
                                {activeAttachment.fileName}
                              </p>
                              {activeAttachment.url && (
                                <a
                                  href={activeAttachment.url}
                                  download={activeAttachment.fileName}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                >
                                  ⬇ Tải file về máy
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
