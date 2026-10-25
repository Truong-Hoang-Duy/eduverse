import { describe, expect, it } from "vitest";

import {
  cleanInstructionsForDisplay,
  encodeInstructionsWithAttachments,
  extractAttachmentPaths,
  formatTitleFromFileName,
  getDisplayFileName,
  getNextSessionNumber,
  isCheckpointAssignment,
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

describe("getDisplayFileName", () => {
  it("trả về chuỗi rỗng khi không có đường dẫn hoặc input không hợp lệ", () => {
    expect(getDisplayFileName("")).toBe("");
    // @ts-expect-error test invalid input
    expect(getDisplayFileName(null)).toBe("");
  });

  it("trả về nguyên gốc nếu file không có tiền tố timestamp", () => {
    expect(getDisplayFileName("hw3_data.csv")).toBe("hw3_data.csv");
    expect(getDisplayFileName("folder/subfolder/data.json")).toBe("data.json");
  });

  it("loại bỏ thư mục và tiền tố timestamp", () => {
    expect(
      getDisplayFileName("course_123/1729000000000-bai_tap.docx")
    ).toBe("bai_tap.docx");
    expect(getDisplayFileName("1729000000000-de_thi.pdf")).toBe("de_thi.pdf");
  });

  it("loại bỏ tiền tố att- và timestamp của file đính kèm", () => {
    expect(
      getDisplayFileName("course_123/1729000000000-att-hw3_data.csv")
    ).toBe("hw3_data.csv");
    expect(
      getDisplayFileName("1729000000000-att-sample_code.py")
    ).toBe("sample_code.py");
  });

  it("giữ nguyên tên file có dấu gạch ngang", () => {
    expect(
      getDisplayFileName("course_123/1729000000000-att-customer-sales-data.csv")
    ).toBe("customer-sales-data.csv");
  });
});

describe("encodeInstructionsWithAttachments & extractAttachmentPaths", () => {
  it("trả về mảng rỗng khi không có metadata đính kèm", () => {
    expect(extractAttachmentPaths(null, null)).toEqual([]);
    expect(extractAttachmentPaths("", [])).toEqual([]);
    expect(extractAttachmentPaths("Chấm điểm logic vòng lặp", null)).toEqual([]);
  });

  it("ưu tiên mảng dbAttachmentPaths nếu tồn tại và có phần tử", () => {
    const fromDb = ["path/to/data.csv"];
    const encoded = encodeInstructionsWithAttachments("Hướng dẫn", [
      "other/path.csv",
    ]);
    expect(extractAttachmentPaths(encoded, fromDb)).toEqual(fromDb);
  });

  it("mã hóa và trích xuất đúng danh sách file từ instructions", () => {
    const paths = ["course/1-att-hw3_data.csv", "course/1-att-test.py"];
    const encoded = encodeInstructionsWithAttachments("Hướng dẫn chấm", paths);
    expect(encoded).toContain("Hướng dẫn chấm");
    expect(encoded).toContain("<!--attachments:");

    const extracted = extractAttachmentPaths(encoded, null);
    expect(extracted).toEqual(paths);

    const cleaned = cleanInstructionsForDisplay(encoded);
    expect(cleaned).toBe("Hướng dẫn chấm");
  });

  it("mã hóa khi instructions ban đầu rỗng", () => {
    const paths = ["course/data.csv"];
    const encoded = encodeInstructionsWithAttachments(null, paths);
    expect(encoded?.startsWith("<!--attachments:")).toBe(true);
    expect(extractAttachmentPaths(encoded, null)).toEqual(paths);
    expect(cleanInstructionsForDisplay(encoded)).toBe("");
  });
});

describe("isCheckpointAssignment", () => {
  it("nhận diện chính xác từ khóa Checkpoints / Checkpoint không phân biệt hoa thường", () => {
    expect(isCheckpointAssignment("Checkpoints")).toBe(true);
    expect(isCheckpointAssignment("checkpoints")).toBe(true);
    expect(isCheckpointAssignment("CHECKPOINTS")).toBe(true);
    expect(isCheckpointAssignment("Checkpoint 1")).toBe(true);
    expect(isCheckpointAssignment("checkpoint 2: OOP")).toBe(true);
    expect(isCheckpointAssignment("CHECKPOINT ĐỢT 1")).toBe(true);
    expect(isCheckpointAssignment("[CSA05 - Checkpoints] Buổi 5")).toBe(true);
    expect(isCheckpointAssignment("Bài thi checkpoint giữa khóa")).toBe(true);
  });

  it("trả về false khi tiêu đề không chứa từ khóa checkpoint", () => {
    expect(isCheckpointAssignment("Bài tập về nhà buổi 1")).toBe(false);
    expect(isCheckpointAssignment("Homework 3")).toBe(false);
    expect(isCheckpointAssignment("Đề thi cuối khóa")).toBe(false);
    expect(isCheckpointAssignment("Mini Project")).toBe(false);
  });

  it("trả về false cho input rỗng, null hoặc undefined", () => {
    expect(isCheckpointAssignment("")).toBe(false);
    expect(isCheckpointAssignment("   ")).toBe(false);
    expect(isCheckpointAssignment(null)).toBe(false);
    expect(isCheckpointAssignment(undefined)).toBe(false);
  });
});
