import { describe, expect, it } from "vitest";

import {
  isHandled,
  isReviewed,
  resolveSessionReviewState,
  reviewSignature,
  type ExistingReview,
} from "./review-status";

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

/**
 * Chữ ký này chạy `key` của ReviewEditor. Sai một nhánh là ô nhận xét KHÔNG
 * dựng lại sau khi "áp nhận xét từ buổi trước" ghi hàng loạt — GV thấy báo
 * thành công mà các ô bên dưới vẫn y nguyên cho tới khi tải lại trang.
 */
describe("reviewSignature", () => {
  it("should stay the same for identical data", () => {
    expect(reviewSignature({ ...base, strengths: ["Chăm chỉ"] })).toBe(
      reviewSignature({ ...base, strengths: ["Chăm chỉ"] })
    );
  });

  it("should change when any saved field changes", () => {
    const before = reviewSignature(base);

    expect(reviewSignature({ ...base, strengths: ["Chăm chỉ"] })).not.toBe(before);
    expect(reviewSignature({ ...base, improvements: ["Cần cẩn thận"] })).not.toBe(before);
    expect(reviewSignature({ ...base, is_absent: true })).not.toBe(before);
    expect(reviewSignature({ ...base, ai_generated_comment: "Em tiến bộ." })).not.toBe(before);
  });

  it("should tell an empty row apart from no row at all", () => {
    // Chưa có dòng nào vs có dòng nhưng trống — hai trạng thái khác nhau.
    expect(reviewSignature(null)).not.toBe(reviewSignature(base));
  });

  it("should not collide when labels move between the two lists", () => {
    // Ghép chuỗi cẩu thả (nối thẳng 2 mảng) sẽ cho cùng chữ ký ở 2 ca này.
    expect(
      reviewSignature({ ...base, strengths: ["a", "b"], improvements: [] })
    ).not.toBe(
      reviewSignature({ ...base, strengths: ["a"], improvements: ["b"] })
    );
  });
});

describe("resolveSessionReviewState", () => {
  it("should be unreviewed when class has no students", () => {
    expect(
      resolveSessionReviewState({ studentCount: 0, handledCount: 0 })
    ).toBe("unreviewed");
    expect(
      resolveSessionReviewState({ studentCount: 0, handledCount: 5 })
    ).toBe("unreviewed");
  });

  it("should be unreviewed when no student has been reviewed or marked absent", () => {
    expect(
      resolveSessionReviewState({ studentCount: 10, handledCount: 0 })
    ).toBe("unreviewed");
  });

  it("should be partial when some students are handled but not all", () => {
    expect(
      resolveSessionReviewState({ studentCount: 10, handledCount: 1 })
    ).toBe("partial");
    expect(
      resolveSessionReviewState({ studentCount: 10, handledCount: 9 })
    ).toBe("partial");
  });

  it("should be completed when all students in the class are handled", () => {
    expect(
      resolveSessionReviewState({ studentCount: 10, handledCount: 10 })
    ).toBe("completed");
  });

  it("should be completed when handled count exceeds student count", () => {
    // Trường hợp học viên bị xóa/chuyển sau khi đã nhận xét
    expect(
      resolveSessionReviewState({ studentCount: 8, handledCount: 10 })
    ).toBe("completed");
  });
});
