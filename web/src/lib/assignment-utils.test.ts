import { describe, expect, it } from "vitest";

import { getNextSessionNumber } from "./assignment-utils";

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
