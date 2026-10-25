"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeCsv, parseCsv } from "@/lib/csv-parser";

export interface CsvTableViewProps {
  content: string;
  fileName?: string;
  downloadUrl?: string;
  /** Khi true, ẩn khung hướng dẫn nạp dữ liệu và nút copy Pandas (dành cho GV / view tài liệu) */
  hideGuide?: boolean;
}

export function CsvTableView({
  content,
  fileName = "data.csv",
  downloadUrl,
  hideGuide = false,
}: CsvTableViewProps) {
  const [viewMode, setViewMode] = useState<"table" | "raw">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPandas, setCopiedPandas] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showAllRows, setShowAllRows] = useState(false);

  const rows = useMemo(() => parseCsv(content), [content]);
  const analysis = useMemo(() => analyzeCsv(rows), [rows]);
  const headers = analysis.headers;
  const rawDataRows = analysis.dataRows;

  // Lọc dữ liệu theo từ khóa tìm kiếm
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rawDataRows;
    const q = searchQuery.toLowerCase().trim();
    return rawDataRows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q))
    );
  }, [rawDataRows, searchQuery]);

  // Hiển thị toàn bộ dữ liệu (tối đa 500 dòng mặc định, hoặc toàn bộ khi bật showAllRows)
  const displayedRows = useMemo(() => {
    if (showAllRows || filteredRows.length <= 500) return filteredRows;
    return filteredRows.slice(0, 500);
  }, [filteredRows, showAllRows]);

  // Xử lý tải file trực tiếp (kể cả khi không có link server)
  function handleDownloadFile() {
    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      a.target = "_blank";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Copy code mẫu đọc Pandas
  function handleCopyPandasCode() {
    const code = `# Đọc và nạp tập dữ liệu "${fileName}"
import pandas as pd

# 1. Đọc dữ liệu từ file CSV
df = pd.read_csv("${fileName}")

# 2. Xem 5 dòng đầu tiên
print(df.head())

# 3. Kiểm tra số lượng giá trị khuyết (NaN) của các cột
print(df.isna().sum())

# 4. Xem thống kê dữ liệu
print(df.describe())`;

    navigator.clipboard.writeText(code);
    setCopiedPandas(true);
    setTimeout(() => setCopiedPandas(false), 2500);
  }

  // Copy toàn bộ dữ liệu CSV thô
  function handleCopyRawCsv() {
    navigator.clipboard.writeText(content);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2500);
  }

  if (viewMode === "raw" || headers.length <= 1) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-2 text-xs border border-border/60">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              📝 Văn bản CSV thô ({analysis.totalRows} dòng · {analysis.totalCols} cột)
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleCopyRawCsv}
            >
              <span>{copiedRaw ? "✓" : "📋"}</span>
              <span>{copiedRaw ? "Đã chép CSV!" : "Chép toàn bộ"}</span>
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleDownloadFile}
            >
              <span>⬇</span>
              <span>Tải file CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setViewMode("table")}
            >
              <span>📊</span>
              <span>Xem dạng bảng</span>
            </Button>
          </div>
        </div>

        <pre className="max-h-[60vh] overflow-auto rounded-xl border border-border/80 bg-muted/20 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Thanh công cụ thông minh cho CSV */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-muted/30 p-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-semibold px-2.5 py-1"
          >
            📊 {analysis.totalRows} dòng · {analysis.totalCols} cột
          </Badge>

          {analysis.missingCount > 0 ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium px-2 py-0.5"
              title={`Các cột có ô trống: ${analysis.columnsWithMissing
                .map((c) => `${c.name} (${c.count})`)
                .join(", ")}`}
            >
              ⚠️ {analysis.missingCount} ô trống (cần làm sạch)
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium"
            >
              ✓ Dữ liệu đầy đủ (không có ô trống)
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Nút Copy code Pandas (chỉ hiện khi không ẩn hướng dẫn) */}
          {!hideGuide && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPandasCode}
              className="h-7 gap-1 px-2.5 text-xs font-medium border-border/80 hover:bg-accent shadow-2xs"
              title="Sao chép đoạn code Python sử dụng thư viện Pandas để đọc file này"
            >
              <span>{copiedPandas ? "✓" : "🐍"}</span>
              <span>{copiedPandas ? "Đã copy code Pandas!" : "Copy code Pandas"}</span>
            </Button>
          )}

          {/* Nút Copy CSV thô */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyRawCsv}
            className="h-7 gap-1 px-2 text-xs font-medium border-border/80 shadow-2xs"
            title="Sao chép toàn bộ dữ liệu dạng văn bản"
          >
            <span>{copiedRaw ? "✓" : "📋"}</span>
            <span>{copiedRaw ? "Đã chép!" : "Chép CSV"}</span>
          </Button>

          {/* Nút Xem dạng thô */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 shadow-2xs"
            onClick={() => setViewMode("raw")}
            title="Chuyển sang xem nội dung văn bản thô"
          >
            📝 Dạng thô
          </Button>

          {/* Nút Tải file CSV về máy */}
          <Button
            size="sm"
            onClick={handleDownloadFile}
            className="h-7 gap-1 bg-primary text-primary-foreground font-semibold px-3 text-xs shadow-xs hover:bg-primary/90"
            title={`Tải file ${fileName} về máy tính để làm bài`}
          >
            <span>⬇</span>
            <span>Tải file CSV</span>
          </Button>
        </div>
      </div>

      {/* Ô tìm kiếm dữ liệu */}
      {analysis.totalRows > 3 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder={`🔍 Tìm kiếm nhanh trong ${analysis.totalRows} dòng dữ liệu...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-xs text-muted-foreground shrink-0">
              Khớp {filteredRows.length} / {analysis.totalRows} dòng
            </span>
          )}
        </div>
      )}

      {/* Bảng dữ liệu tương tác */}
      <div className="max-h-[58vh] overflow-auto rounded-xl border border-border/80 bg-card shadow-2xs">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-border/80 bg-muted/95 backdrop-blur-xs font-semibold text-foreground shadow-2xs">
            <tr>
              <th className="w-12 border-r border-border/60 px-2.5 py-2 text-center text-muted-foreground">
                #
              </th>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border-r border-border/60 px-3 py-2 font-bold last:border-r-0 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {displayedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length + 1}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  Không tìm thấy dòng dữ liệu nào khớp với từ khóa &quot;{searchQuery}&quot;
                </td>
              </tr>
            ) : (
              displayedRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="transition-colors hover:bg-muted/40 even:bg-muted/10"
                >
                  <td className="border-r border-border/60 px-2.5 py-1.5 text-center font-mono text-[11px] text-muted-foreground bg-muted/20">
                    {rIdx + 1}
                  </td>
                  {headers.map((_, cIdx) => {
                    const cell = row[cIdx] ?? "";
                    const isEmpty = cell.trim() === "";
                    return (
                      <td
                        key={cIdx}
                        className="max-w-[240px] truncate border-r border-border/60 px-3 py-1.5 font-mono text-xs last:border-r-0"
                        title={isEmpty ? "Giá trị khuyết (trống / NaN)" : cell}
                      >
                        {isEmpty ? (
                          <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30">
                            NaN (trống)
                          </span>
                        ) : (
                          <span>{cell}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filteredRows.length > displayedRows.length && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <span>
              Đang hiển thị {displayedRows.length} / {filteredRows.length} dòng dữ liệu.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => setShowAllRows(true)}
              >
                Xem toàn bộ {filteredRows.length} dòng
              </Button>
              <button
                type="button"
                onClick={handleDownloadFile}
                className="font-semibold text-primary underline underline-offset-2 hover:opacity-85"
              >
                Tải file về máy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Khung hướng dẫn nhanh làm bài với Pandas (chỉ hiện khi không ẩn hướng dẫn) */}
      {!hideGuide && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary flex items-center gap-1.5">
              <span>💡</span>
              <span>Hướng dẫn nạp file vào bài làm (Python / Google Colab / VS Code):</span>
            </span>
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              {showGuide ? "Thu gọn" : "Xem gợi ý"}
            </button>
          </div>

          {showGuide && (
            <div className="space-y-1.5 pt-1 text-[11px] text-muted-foreground leading-relaxed">
              <p>
                1. <strong>Tải file về máy:</strong> Bấm nút <code className="rounded bg-muted px-1 py-0.5 text-foreground font-mono">⬇ Tải file CSV</code> ở trên và lưu cùng thư mục với file code của em (hoặc kéo thả upload lên Google Colab).
              </p>
              <p>
                2. <strong>Đọc dữ liệu bằng Pandas:</strong>
              </p>
              <div className="relative rounded-lg bg-background p-2.5 font-mono text-[11px] border border-border/70 text-foreground overflow-x-auto">
                <pre className="whitespace-pre">
{`import pandas as pd
df = pd.read_csv("${fileName}")
print(df.head())`}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyPandasCode}
                  className="absolute right-2 top-2 rounded bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                >
                  {copiedPandas ? "✓ Đã copy" : "Copy"}
                </button>
              </div>
              {analysis.missingCount > 0 && (
                <p className="text-amber-700 dark:text-amber-400">
                  ⚠️ <strong>Lưu ý làm sạch dữ liệu:</strong> Tập dữ liệu này có <strong>{analysis.missingCount} giá trị trống (NaN)</strong> ở các cột {analysis.columnsWithMissing.map((c) => c.name).join(", ")}. Hãy sử dụng <code className="rounded bg-muted px-1 font-mono">df.isna().sum()</code> và <code className="rounded bg-muted px-1 font-mono">df.dropna()</code> hoặc <code className="rounded bg-muted px-1 font-mono">df.fillna()</code> theo đúng yêu cầu của đề bài!
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
