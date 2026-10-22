import { describe, expect, it } from "vitest";

import {
  formatTitleFromFileName,
  getNextSessionNumber,
} from "./assignment-utils";

describe("getNextSessionNumber", () => {
  it("trả về 1 khi danh sách trống hoặc rỗng", () => {
    expect(getNextSessionNumber([])).toBe(1);
    expect(getNextSessionNumber([] as number[])).toBe(1);
  });

  it("trả về 1 khi chỉ có số không hợp lệ (<= 0 hoặc không phải số nguyên)", () => {
    expect(getNextSessionNumber([0, -1, -5])).toBe(1);
  });

  it("trả về số kế tiếp khi các buổi liên tục từ 1", () => {
    expect(getNextSessionNumber([1])).toBe(2);
    expect(getNextSessionNumber([1, 2])).toBe(3);
    expect(getNextSessionNumber([1, 2, 3, 4, 5])).toBe(6);
  });

  it("lấp chỗ trống nhỏ nhất từ buổi 1 khi danh sách bị khuyết", () => {
    // Thiếu buổi 1
    expect(getNextSessionNumber([2, 3, 4])).toBe(1);
    expect(getNextSessionNumber([5])).toBe(1);

    // Thiếu buổi 2
    expect(getNextSessionNumber([1, 3, 4])).toBe(2);

    // Ca thực tế trên ảnh chụp màn hình lớp CSB (thiếu buổi 8 giữa 1..7 và 9..12)
    expect(
      getNextSessionNumber([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12])
    ).toBe(8);
  });

  it("hoạt động chính xác với danh sách chưa sắp xếp hoặc có phần tử trùng lặp", () => {
    expect(getNextSessionNumber([3, 1, 2])).toBe(4);
    expect(getNextSessionNumber([4, 2, 1])).toBe(3);
    expect(getNextSessionNumber([1, 1, 2, 2])).toBe(3);
  });
});

describe("formatTitleFromFileName", () => {
  it("trả về chuỗi rỗng khi không có tên file hoặc input không hợp lệ", () => {
    expect(formatTitleFromFileName("")).toBe("");
    expect(formatTitleFromFileName("   ")).toBe("");
    // @ts-expect-error test invalid input
    expect(formatTitleFromFileName(null)).toBe("");
  });

  it("cắt bỏ phần mở rộng đuôi file thông dụng", () => {
    expect(formatTitleFromFileName("Bai_tap.docx")).toBe("Bai tap");
    expect(formatTitleFromFileName("de_thi_cuoi_ky.pdf")).toBe("de thi cuoi ky");
    expect(formatTitleFromFileName("huong_dan.txt")).toBe("huong dan");
    expect(formatTitleFromFileName("readme.md")).toBe("readme");
    expect(formatTitleFromFileName("screenshot.png")).toBe("screenshot");
  });

  it("chuyển dấu gạch dưới thành khoảng trắng và chuẩn hóa khoảng trắng thừa", () => {
    expect(formatTitleFromFileName("bai___tap____vong__lap.pdf")).toBe(
      "bai tap vong lap"
    );
    expect(formatTitleFromFileName("  De_bai_so_1  .docx")).toBe("De bai so 1");
  });

  it("giữ nguyên định dạng tiêu đề có dấu gạch ngang, dấu ngoặc vuông và tiếng Việt có dấu", () => {
    expect(
      formatTitleFromFileName("[CSB - Homework] Buổi 1.pdf")
    ).toBe("[CSB - Homework] Buổi 1");
    expect(
      formatTitleFromFileName("[CSB - Checkpoints] Buổi 5.docx")
    ).toBe("[CSB - Checkpoints] Buổi 5");
    expect(
      formatTitleFromFileName("Buổi 1 - Làm quen với Scratch.md")
    ).toBe("Buổi 1 - Làm quen với Scratch");
  });

  it("xử lý file có nhiều dấu chấm (chỉ cắt đuôi mở rộng cuối cùng)", () => {
    expect(formatTitleFromFileName("buoi_1.2_nang_cao.pdf")).toBe(
      "buoi 1.2 nang cao"
    );
  });
});
