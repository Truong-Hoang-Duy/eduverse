import { describe, expect, it } from "vitest";

import { analyzeCsv, parseCsv } from "@/lib/csv-parser";

describe("CsvTableView parse & analyze logic", () => {
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

  it("xử lý chính xác tập dữ liệu car-sales có ô khuyết rỗng (Missing/NaN)", () => {
    const sample = `Make,Colour,Odometer,Doors,Price
Toyota,White,150043,4,"$4,000"
Honda,Red,87899,4,"$5,000"
Toyota,Blue,,3,"$7,000"
BMW,Black,11179,5,"$22,000"
Nissan,White,213095,4,"$3,500"
Toyota,Green,,4,"$4,500"
Honda,,,4,"$7,500"
Honda,Blue,,4,
Toyota,White,60000,,
,White,31600,4,"$9,700"`;

    const rows = parseCsv(sample);
    expect(rows).toHaveLength(11); // 1 header + 10 data rows
    expect(rows[0]).toEqual(["Make", "Colour", "Odometer", "Doors", "Price"]);

    // Kiểm tra hàng 3 có ô Odometer khuyết rỗng
    expect(rows[3]).toEqual(["Toyota", "Blue", "", "3", "$7,000"]);

    // Phân tích thống kê dữ liệu
    const analysis = analyzeCsv(rows);
    expect(analysis.totalRows).toBe(10);
    expect(analysis.totalCols).toBe(5);
    // Có tổng cộng 9 ô khuyết rỗng
    expect(analysis.missingCount).toBe(9);

    // Kiểm tra các cột có giá trị khuyết
    const missingColNames = analysis.columnsWithMissing.map((c) => c.name);
    expect(missingColNames).toContain("Make");
    expect(missingColNames).toContain("Colour");
    expect(missingColNames).toContain("Odometer");
    expect(missingColNames).toContain("Doors");
    expect(missingColNames).toContain("Price");
  });
});
