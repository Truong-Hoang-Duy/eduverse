"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CsvTableView({ content }: { content: string }) {
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
