"use client";

import { useMemo, useRef, useState, useTransition } from "react";

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
  type AssignmentSpec,
  type AssignmentSpecFile,
} from "@/lib/actions/grading";
import { cn } from "@/lib/utils";

function CsvTableView({ content }: { content: string }) {
  const [viewMode, setViewMode] = useState<"table" | "raw">("table");

  const rows = useMemo(() => {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lines.map((line) => {
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells;
    });
  }, [content]);

  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1, 101);
  const totalDataRows = Math.max(0, rows.length - 1);

  if (viewMode === "raw" || headers.length <= 1) {
    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setViewMode(viewMode === "raw" ? "table" : "raw")}
          >
            {viewMode === "raw" ? "📊 Xem dạng bảng" : "📝 Xem dạng văn bản"}
          </Button>
        </div>
        <pre className="max-h-[55vh] overflow-auto rounded-lg border bg-muted/20 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          📊 Bảng dữ liệu ({totalDataRows} dòng, {headers.length} cột)
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setViewMode("raw")}
        >
          📝 Xem dạng văn bản
        </Button>
      </div>
      <div className="max-h-[55vh] overflow-auto rounded-lg border bg-card">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b bg-muted font-semibold text-foreground shadow-2xs">
            <tr>
              <th className="w-12 border-r px-2.5 py-2 text-center text-muted-foreground">
                #
              </th>
              {headers.map((h, i) => (
                <th key={i} className="border-r px-3 py-2 last:border-r-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className="transition-colors hover:bg-muted/40">
                <td className="border-r px-2.5 py-1.5 text-center font-mono text-muted-foreground">
                  {rIdx + 1}
                </td>
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className="max-w-[220px] truncate border-r px-3 py-1.5 font-mono last:border-r-0"
                    title={cell}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {totalDataRows > 100 && (
          <p className="border-t bg-muted/30 p-2 text-center text-[11px] text-muted-foreground">
            Đang hiển thị 100 / {totalDataRows} dòng đầu tiên. Tải file về máy để xem toàn bộ dữ liệu.
          </p>
        )}
      </div>
    </div>
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

  // Trạng thái đính kèm thêm file trực tiếp từ popup xem
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPending, startAdd] = useTransition();
  const [addMsg, setAddMsg] = useState("");
  const addFileInputRef = useRef<HTMLInputElement>(null);

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
    setAddMsg("");
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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex flex-wrap items-start justify-between gap-2 pr-6">
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>
                  Buổi {sessionNumber}
                  {totalFiles > 1
                    ? ` · Tổng cộng ${totalFiles} tệp (1 đề chính + ${totalFiles - 1} tệp dữ liệu đính kèm)`
                    : activeFile
                      ? ` · ${activeFile.fileName}`
                      : ""}
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <span>{showAddForm ? "Đóng" : "+ Đính kèm thêm file"}</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Form thêm file dữ liệu trực tiếp vào đề đã có */}
          {showAddForm && (
            <form
              action={handleAddFiles}
              className="space-y-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Đính kèm thêm file dữ liệu vào đề này:
                </span>
                <span className="text-[11px] text-muted-foreground">
                  (CSV, JSON, Python, Dataset...)
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

          {/* Thanh chuyển đổi giữa các file */}
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
                    <span
                      className="max-w-[170px] truncate"
                      title={file.fileName}
                    >
                      {file.fileName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!pending && !error && activeFile && (
            <div className="space-y-3">
              {/* Header tệp đang chọn + Nút Tải + Nút Xóa (cho file đính kèm) */}
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="truncate font-semibold text-foreground"
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
                      Dữ liệu đính kèm
                    </Badge>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {activeFile.url && (
                    <a
                      href={activeFile.url}
                      download={activeFile.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-background px-2.5 py-1 text-xs font-medium text-primary shadow-2xs hover:bg-accent"
                    >
                      <span>⬇</span>
                      <span>Tải file</span>
                    </a>
                  )}

                  {!activeFile.isMain && "path" in activeFile && activeFile.path && (
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
                  )}
                </div>
              </div>

              {/* Preview định dạng CSV dạng Bảng dữ liệu hoặc Văn bản */}
              {isCsv && (
                <CsvTableView
                  content={
                    (activeFile as AssignmentSpecFile & { content: string })
                      .content
                  }
                />
              )}

              {/* Preview định dạng text/code thông thường */}
              {!isCsv && activeFile.kind === "text" && (
                <pre className="max-h-[55vh] overflow-auto rounded-lg border bg-muted/20 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {activeFile.content}
                </pre>
              )}

              {/* Preview định dạng ảnh */}
              {activeFile.kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeFile.url}
                  alt={activeFile.fileName}
                  className="max-h-[60vh] w-full rounded-lg border bg-muted/20 object-contain"
                />
              )}

              {/* Định dạng nhị phân/Word */}
              {activeFile.kind === "download" && (
                <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    File này là định dạng nhị phân hoặc không thể hiển thị trực tiếp — hãy tải về máy để mở.
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

              {/* Preview PDF */}
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
