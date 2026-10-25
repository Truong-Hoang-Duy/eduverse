import { describe, expect, it } from "vitest";

function parseCsv(content: string): string[][] {
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

describe("CsvTableView parse logic", () => {
  it("phân tích dòng và cột CSV đơn giản", () => {
    const csv = "id,name,age\n1,An,15\n2,Binh,16";
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ["id", "name", "age"],
      ["1", "An", "15"],
      ["2", "Binh", "16"],
    ]);
  });

  it("xử lý dấu phẩy nằm bên trong dấu ngoặc kép", () => {
    const csv = 'name,address,score\n"Nguyen Van A","Ha Noi, Viet Nam",95';
    const rows = parseCsv(csv);
    expect(rows).toEqual([
      ["name", "address", "score"],
      ["Nguyen Van A", "Ha Noi, Viet Nam", "95"],
    ]);
  });

  it("bỏ qua các dòng trống", () => {
    const csv = "col1,col2\n\n\nval1,val2\n  \n";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
  });
});
