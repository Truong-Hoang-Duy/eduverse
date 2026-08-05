import { describe, expect, it } from "vitest";

import { isHandled, isReviewed, type ExistingReview } from "./review-status";

/**
 * Module này tồn tại vì một bug thật: các hàm từng nằm trong `review-editor.tsx`
 * ("use client") và `page.tsx` (Server Component) gọi vào thì lỗi runtime
 * "Attempted to call from the server". `next build` KHÔNG bắt được.
 *
 * Chúng chạy bộ đếm "X/Y đã xử lý", badge "Đã nhận xét" và bộ lọc trạng thái —
 * sai một nhánh là GV tưởng đã nhận xét xong cả lớp.
 */
const base: ExistingReview = {
  strengths: [],
  improvements: [],
  ai_generated_comment: null,
  academic_level: null,
  is_absent: false,
};

describe("isReviewed", () => {
  it("should be false when there is no row yet", () => {
    expect(isReviewed(null)).toBe(false);
  });

  it("should be false for an empty row", () => {
    expect(isReviewed(base)).toBe(false);
  });

  it("should be true with any strength, improvement or AI comment", () => {
    expect(isReviewed({ ...base, strengths: ["Tư duy tốt"] })).toBe(true);
    expect(isReviewed({ ...base, improvements: ["Cần cẩn thận hơn"] })).toBe(true);
    expect(isReviewed({ ...base, ai_generated_comment: "Em tiến bộ." })).toBe(true);
  });

  it("should NOT count level alone as reviewed", () => {
    // Xếp loại chỉ là ngữ cảnh cho AI — chưa phải nhận xét gửi phụ huynh.
    expect(isReviewed({ ...base, academic_level: "gioi" })).toBe(false);
  });

  it("should NOT count an absent student as reviewed", () => {
    expect(isReviewed({ ...base, is_absent: true })).toBe(false);
  });
});

describe("isHandled", () => {
  it("should be false when there is no row yet", () => {
    expect(isHandled(null)).toBe(false);
  });

  it("should be true for an absent student even with nothing filled in", () => {
    // Đánh vắng CŨNG là "xử lý xong" — đây là điểm khác duy nhất với isReviewed.
    expect(isHandled({ ...base, is_absent: true })).toBe(true);
  });

  it("should be true for a reviewed student", () => {
    expect(isHandled({ ...base, strengths: ["Chăm chỉ"] })).toBe(true);
  });

  it("should be false for an empty row", () => {
    expect(isHandled(base)).toBe(false);
  });
});
