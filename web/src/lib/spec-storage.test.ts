import { describe, expect, it } from "vitest";

import { sanitizeFileName, SPEC_MAX_BYTES } from "./spec-storage";

/** Tên file đi thẳng vào Storage key nên phải sạch trước khi ghép đường dẫn. */
describe("sanitizeFileName", () => {
  it("should strip Vietnamese diacritics", () => {
    expect(sanitizeFileName("đề bài buổi 1.txt")).toBe("de_bai_buoi_1.txt");
    expect(sanitizeFileName("Bài Tập Số 3.pdf")).toBe("Bai_Tap_So_3.pdf");
  });

  it("should keep dots, dashes and underscores", () => {
    expect(sanitizeFileName("de-bai_buoi.1.txt")).toBe("de-bai_buoi.1.txt");
  });

  it("should neutralise path separators so no key escapes its folder", () => {
    // Tên do người dùng đặt; `/` và `\` phải biến mất, không được tạo thư mục lạ.
    expect(sanitizeFileName("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFileName("..\..\win.ini")).not.toContain("\\");
    expect(sanitizeFileName("a/b/c.txt")).toBe("a_b_c.txt");
  });

  it("should replace spaces and odd characters", () => {
    expect(sanitizeFileName("bài (bản cuối) #2.txt")).toBe("bai__ban_cuoi___2.txt");
  });

  it("should leave an already-safe name untouched", () => {
    expect(sanitizeFileName("de-bai-1.txt")).toBe("de-bai-1.txt");
  });
});

describe("SPEC_MAX_BYTES", () => {
  it("should leave room under the Server Action body limit", () => {
    // File đề đi qua FormData (nhị phân) chứ KHÔNG base64 — base64 chỉ ở đường
    // CHẤM BÀI (`GRADING_BUDGET`). Nên ở đây chỉ cần chừa chỗ cho các field khác
    // của form dưới trần `bodySizeLimit: "10mb"` trong next.config.ts.
    const bodyLimit = 10 * 1024 * 1024;
    expect(SPEC_MAX_BYTES).toBeLessThan(bodyLimit);
    expect(bodyLimit - SPEC_MAX_BYTES).toBeGreaterThanOrEqual(1024 * 1024);
  });
});
