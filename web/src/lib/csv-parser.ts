/**
 * Phân tích chuỗi CSV thành mảng 2 chiều các ô (hỗ trợ dấu phẩy trong nháy kép và ô rỗng).
 */
export function parseCsv(content: string): string[][] {
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
}

export interface CsvAnalysis {
  headers: string[];
  dataRows: string[][];
  totalRows: number;
  totalCols: number;
  missingCount: number;
  columnsWithMissing: { colIndex: number; name: string; count: number }[];
}

/**
 * Phân tích thống kê dữ liệu CSV và phát hiện các ô khuyết / rỗng (Missing / NaN).
 */
export function analyzeCsv(rows: string[][]): CsvAnalysis {
  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1);
  let missingCount = 0;
  const colMissingMap = new Map<number, number>();

  dataRows.forEach((row) => {
    headers.forEach((_, colIdx) => {
      const val = row[colIdx] ?? "";
      if (val.trim() === "") {
        missingCount++;
        colMissingMap.set(colIdx, (colMissingMap.get(colIdx) ?? 0) + 1);
      }
    });
  });

  const columnsWithMissing: { colIndex: number; name: string; count: number }[] = [];
  colMissingMap.forEach((count, colIdx) => {
    columnsWithMissing.push({
      colIndex: colIdx,
      name: headers[colIdx] || `Cột ${colIdx + 1}`,
      count,
    });
  });

  return {
    headers,
    dataRows,
    totalRows: dataRows.length,
    totalCols: headers.length,
    missingCount,
    columnsWithMissing,
  };
}
