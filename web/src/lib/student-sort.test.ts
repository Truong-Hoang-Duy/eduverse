import { describe, expect, it } from "vitest";

import {
  compareVietnameseNames,
  sortStudentsByVietnameseName,
  splitVietnameseName,
} from "./student-sort";

describe("student-sort", () => {
  it("should split Vietnamese name into first name and remaining parts", () => {
    expect(splitVietnameseName("Tạ Hoàng Gia Bảo")).toEqual({
      firstName: "Bảo",
      lastName: "Tạ Hoàng Gia",
    });

    expect(splitVietnameseName("PhongDang")).toEqual({
      firstName: "PhongDang",
      lastName: "",
    });

    expect(splitVietnameseName("  Nguyễn   Văn   An  ")).toEqual({
      firstName: "An",
      lastName: "Nguyễn Văn",
    });

    expect(splitVietnameseName("")).toEqual({
      firstName: "",
      lastName: "",
    });
  });

  it("should compare Vietnamese names by first name then last name", () => {
    // Bảo (B) < Hưng (H)
    expect(
      compareVietnameseNames("Tạ Hoàng Gia Bảo", "Phạm Gia Hưng")
    ).toBeLessThan(0);

    // Hưng (H) < Khôi (K)
    expect(
      compareVietnameseNames("Phạm Gia Hưng", "dinh duy khoi")
    ).toBeLessThan(0);

    // Khôi (K) < Phú (P)
    expect(
      compareVietnameseNames("dinh duy khoi", "Đồng Nghĩa Phú")
    ).toBeLessThan(0);

    // Trùng tên: Nguyễn Văn An vs Trần Thị An
    expect(
      compareVietnameseNames("Nguyễn Văn An", "Trần Thị An")
    ).toBeLessThan(0);
  });

  it("should sort student list by Vietnamese name A-Z correctly", () => {
    const rawList = [
      { id: "1", fullName: "PhongDang" },
      { id: "2", fullName: "dinh duy khoi" },
      { id: "3", fullName: "Đồng Nghĩa Phú" },
      { id: "4", fullName: "Tạ Hoàng Gia Bảo" },
      { id: "5", fullName: "Phạm Gia Hưng" },
    ];

    const sorted = sortStudentsByVietnameseName(rawList);
    const names = sorted.map((s) => s.fullName);

    expect(names).toEqual([
      "Tạ Hoàng Gia Bảo",
      "Phạm Gia Hưng",
      "dinh duy khoi",
      "PhongDang",
      "Đồng Nghĩa Phú",
    ]);
  });
});
