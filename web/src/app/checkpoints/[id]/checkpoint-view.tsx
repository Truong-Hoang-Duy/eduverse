import Link from "next/link";

import { CsvTableView } from "@/components/csv-table-view";
import { Badge } from "@/components/ui/badge";
import type {
  AssignmentSpecFile,
  PublicCheckpointPayload,
} from "@/lib/checkpoint-data";

import { CopyLinkButton } from "./copy-link-button";

export function PublicCheckpointView({
  checkpoint,
}: {
  checkpoint: PublicCheckpointPayload;
}) {
  const totalFiles = checkpoint.files.length;

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
            <div className="space-y-6">
              {checkpoint.files.map((file, idx) => {
                const isCurrentCsv =
                  file.fileName.toLowerCase().endsWith(".csv") &&
                  file.kind === "text" &&
                  typeof file.content === "string";

                return (
                  <div
                    key={`${file.path}-${idx}`}
                    className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-xs"
                  >
                    {/* Active File Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-lg">
                          {file.isMain ? "📋" : "📎"}
                        </span>
                        <span
                          className="truncate font-semibold text-sm sm:text-base text-foreground"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </span>
                        {file.isMain ? (
                          <Badge
                            variant="outline"
                            className="px-2 py-0.5 text-[11px]"
                          >
                            Đề bài chính
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="px-2 py-0.5 text-[11px]"
                          >
                            Dữ liệu đính kèm
                          </Badge>
                        )}
                      </div>

                      {file.url && (
                        <a
                          href={file.url}
                          download={file.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
                        >
                          <span>⬇</span>
                          <span>Tải file về máy</span>
                        </a>
                      )}
                    </div>

                    {/* Preview CSV */}
                    {isCurrentCsv && (
                      <CsvTableView
                        content={
                          (file as AssignmentSpecFile & { content: string })
                            .content
                        }
                      />
                    )}

                    {/* Preview Plain Text / Code / Docx */}
                    {!isCurrentCsv && file.kind === "text" && (
                      <pre className="max-h-[70vh] overflow-auto rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {file.content}
                      </pre>
                    )}

                    {/* Preview Image */}
                    {file.kind === "image" && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.url}
                        alt={file.fileName}
                        className="max-h-[70vh] w-full rounded-xl border border-border/60 bg-muted/20 object-contain mx-auto shadow-2xs"
                      />
                    )}

                    {/* Preview PDF */}
                    {file.kind === "pdf" && (
                      <iframe
                        src={file.url}
                        title={file.fileName}
                        className="h-[75vh] w-full rounded-xl border border-border/60 shadow-2xs"
                      />
                    )}

                    {/* Download Binary / Word */}
                    {file.kind === "download" && (
                      <div className="space-y-3 rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
                        <span className="text-3xl">📦</span>
                        <p className="text-sm font-medium text-foreground">
                          File &quot;{file.fileName}&quot; là định dạng nhị phân cần tải về máy để mở.
                        </p>
                        {file.url && (
                          <a
                            href={file.url}
                            download={file.fileName}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
                          >
                            <span>⬇</span>
                            <span>Tải {file.fileName}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
