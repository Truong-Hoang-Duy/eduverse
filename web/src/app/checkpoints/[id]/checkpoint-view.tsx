"use client";

import Link from "next/link";
import { useState } from "react";

import { CsvTableView } from "@/components/csv-table-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AssignmentSpecFile,
  PublicCheckpointPayload,
} from "@/lib/checkpoint-data";
import { cn } from "@/lib/utils";

import { CopyLinkButton } from "./copy-link-button";

function getFileFormatBadge(fileName: string, kind: AssignmentSpecFile["kind"]) {
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

export function PublicCheckpointView({
  checkpoint,
}: {
  checkpoint: PublicCheckpointPayload;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedContent, setCopiedContent] = useState(false);

  const totalFiles = checkpoint.files.length;
  const activeFile: AssignmentSpecFile | undefined =
    checkpoint.files[selectedIndex] ?? checkpoint.files[0];

  const isCsv =
    activeFile?.fileName.toLowerCase().endsWith(".csv") &&
    activeFile.kind === "text" &&
    typeof activeFile.content === "string";

  function handleCopyContent(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2500);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-foreground transition-opacity hover:opacity-85"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-base text-primary-foreground shadow-xs">
                🎓
              </span>
              <span>Eduverse</span>
            </Link>
            <div className="hidden h-4 w-px bg-border/80 sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              {checkpoint.courseCode && (
                <Badge variant="outline" className="font-mono text-xs">
                  {checkpoint.courseCode}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Buổi {checkpoint.sessionNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CopyLinkButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6">
          {/* Header Card */}
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5">
                📋 Đề bài Checkpoint
              </Badge>
              {checkpoint.courseCode && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {checkpoint.courseCode}
                  {checkpoint.courseName ? ` · ${checkpoint.courseName}` : ""}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                Buổi {checkpoint.sessionNumber}
              </Badge>
              {totalFiles > 1 && (
                <Badge
                  variant="outline"
                  className="bg-muted/50 text-xs font-medium text-muted-foreground"
                >
                  📁 {totalFiles} tài liệu
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">
              {checkpoint.title}
            </h1>

            {checkpoint.instructions && (
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs sm:text-sm text-foreground/90 leading-relaxed">
                <p className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Hướng dẫn &amp; Lưu ý làm bài:</span>
                </p>
                <div className="whitespace-pre-wrap break-words">
                  {checkpoint.instructions}
                </div>
              </div>
            )}
          </div>

          {/* Files Container */}
          {totalFiles === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <span className="text-3xl">📄</span>
              <p className="mt-2 text-base font-semibold text-foreground">
                Đề bài này chưa có file nội dung
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Vui lòng liên hệ giáo viên phụ trách để nhận tài liệu chi tiết.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Thanh chuyển đổi tài liệu (Document Tab Switcher) */}
              {totalFiles > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Chuyển đổi tài liệu ({totalFiles} tệp):
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Bấm vào tài liệu bên dưới để xem hoặc tải
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 p-2 shadow-2xs">
                    {checkpoint.files.map((file, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={`${file.path}-${idx}`}
                          type="button"
                          onClick={() => setSelectedIndex(idx)}
                          className={cn(
                            "group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all",
                            isSelected
                              ? "bg-background text-foreground shadow-xs font-semibold border border-border/80 ring-1 ring-primary/20"
                              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                          )}
                        >
                          <span className="text-sm">
                            {file.isMain ? "📋" : "📎"}
                          </span>
                          <span
                            className="max-w-[190px] truncate sm:max-w-[260px]"
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

              {/* Khung nội dung tài liệu đang chọn */}
              {activeFile && (
                <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-xs">
                  {/* Header tài liệu đang chọn */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-xl">
                        {activeFile.isMain ? "📋" : "📎"}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate font-bold text-sm sm:text-base text-foreground"
                            title={activeFile.fileName}
                          >
                            {activeFile.fileName}
                          </span>
                          {getFileFormatBadge(
                            activeFile.fileName,
                            activeFile.kind
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {activeFile.isMain
                            ? "Tài liệu đề bài chính của buổi kiểm tra"
                            : "Tài liệu đính kèm bổ sung (dữ liệu / bài tập)"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Nút Copy nội dung text / code */}
                      {!isCsv &&
                        activeFile.kind === "text" &&
                        activeFile.content && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyContent(activeFile.content)}
                            className="h-8 gap-1.5 text-xs shadow-2xs"
                          >
                            <span>{copiedContent ? "✓" : "📋"}</span>
                            <span>
                              {copiedContent
                                ? "Đã chép nội dung!"
                                : "Sao chép nội dung"}
                            </span>
                          </Button>
                        )}

                      {/* Nút Mở tab mới xem toàn màn hình (cho PDF & Ảnh) */}
                      {activeFile.url &&
                        (activeFile.kind === "pdf" ||
                          activeFile.kind === "image") && (
                          <a
                            href={activeFile.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-accent"
                            title="Mở tài liệu trên tab mới để xem toàn màn hình"
                          >
                            <span>↗</span>
                            <span>Mở tab mới</span>
                          </a>
                        )}

                      {/* Nút Tải file về máy */}
                      {activeFile.url && (
                        <a
                          href={activeFile.url}
                          download={activeFile.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
                        >
                          <span>⬇</span>
                          <span>Tải tài liệu này</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 1. Nhúng xem file PDF */}
                  {activeFile.kind === "pdf" && activeFile.url && (
                    <div className="space-y-2">
                      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-muted/10 shadow-inner">
                        <iframe
                          src={`${activeFile.url}#view=FitH`}
                          title={activeFile.fileName}
                          className="h-[78vh] min-h-[550px] w-full border-none"
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
                          Gặp sự cố không hiển thị? Bấm để mở tab riêng ↗
                        </a>
                      </div>
                    </div>
                  )}

                  {/* 2. Nhúng xem bảng dữ liệu CSV */}
                  {isCsv && (
                    <div className="space-y-2">
                      <CsvTableView
                        content={
                          (activeFile as AssignmentSpecFile & { content: string })
                            .content
                        }
                      />
                    </div>
                  )}

                  {/* 3. Nhúng xem văn bản Code / Text / Docx */}
                  {!isCsv && activeFile.kind === "text" && (
                    <div className="space-y-2">
                      <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words selection:bg-primary/20">
                        {activeFile.content}
                      </pre>
                    </div>
                  )}

                  {/* 4. Nhúng xem hình ảnh */}
                  {activeFile.kind === "image" && activeFile.url && (
                    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20 p-2 sm:p-4 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeFile.url}
                        alt={activeFile.fileName}
                        className="max-h-[75vh] w-full rounded-lg object-contain mx-auto shadow-2xs"
                      />
                    </div>
                  )}

                  {/* 5. Định dạng nhị phân / File nén cần tải về máy */}
                  {activeFile.kind === "download" && (
                    <div className="space-y-3 rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
                      <span className="text-4xl">📦</span>
                      <p className="text-sm font-semibold text-foreground">
                        Tài liệu &quot;{activeFile.fileName}&quot;
                      </p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Định dạng này không hỗ trợ xem trực tiếp trên trình duyệt. Vui lòng tải file về máy tính để mở bằng phần mềm chuyên dụng.
                      </p>
                      {activeFile.url && (
                        <div className="pt-2">
                          <a
                            href={activeFile.url}
                            download={activeFile.fileName}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
                          >
                            <span>⬇</span>
                            <span>Tải {activeFile.fileName}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Danh sách tải nhanh tất cả tài liệu nếu có nhiều file */}
              {totalFiles > 1 && (
                <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>📁</span>
                      <span>Tải nhanh các tài liệu của buổi học này:</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {totalFiles} tệp khả dụng
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {checkpoint.files.map((file, idx) => (
                      <div
                        key={`quick-download-${file.path}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
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
                            className="shrink-0 inline-flex items-center gap-1 rounded bg-background px-2 py-1 text-[11px] font-semibold text-primary border border-border/60 shadow-2xs hover:bg-accent transition-colors"
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
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/20 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Eduverse · Nền tảng học tập &amp; quản lý học viên lập trình</span>
          <span>Chế độ xem đề bài dành cho học viên (không yêu cầu đăng nhập)</span>
        </div>
      </footer>
    </div>
  );
}
