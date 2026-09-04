import { describe, expect, it } from "vitest";

import { isClassCompleted } from "./class-completion";

describe("isClassCompleted", () => {
  it("should be completed when every student is handled in the last session", () => {
    expect(isClassCompleted({ studentCount: 12, handledCount: 12 })).toBe(true);
  });

  it("should not be completed while a student is still unhandled", () => {
    expect(isClassCompleted({ studentCount: 12, handledCount: 11 })).toBe(false);
  });

  it("should not be completed when the last session has no review at all", () => {
    expect(isClassCompleted({ studentCount: 12, handledCount: 0 })).toBe(false);
  });

  it("should not be completed for a class with no student", () => {
    // Lớp vừa mở, chưa có ai — 0/0 mà tính "xong" thì lớp mới biến mất khỏi
    // danh sách đang học ngay lập tức.
    expect(isClassCompleted({ studentCount: 0, handledCount: 0 })).toBe(false);
  });

  it("should stay completed when a review row outlives a removed student", () => {
    // GV xóa 1 em sau khi đã nhận xét buổi cuối → handled nhiều hơn sĩ số.
    expect(isClassCompleted({ studentCount: 11, handledCount: 12 })).toBe(true);
  });
});
