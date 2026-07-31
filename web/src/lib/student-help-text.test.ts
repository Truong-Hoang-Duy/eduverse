import { describe, expect, it } from "vitest";

import type { StudentHelp } from "@/lib/actions/student-help";

import { toStudentHelpText } from "./student-help-text";

/**
 * Đây là đoạn HỌC VIÊN đọc tận mắt qua Zalo, không phải văn bản nội bộ — sai
 * định dạng ở đây là em nhận một tin nhắn khó hiểu, mà GV thì dán đi luôn chứ
 * hiếm khi đọc lại.
 */
const withCode: StudentHelp = {
  dang_o_dau: "Em đã khai báo được 2 biến và in ra màn hình. Phần tính tổng chưa có.",
  can_sua: ["Dòng 3: em viết a + b nhưng chưa lưu kết quả vào đâu."],
  cac_buoc: ["Tạo một biến mới để giữ kết quả.", "In biến đó ra dạng: Tong: 12"],
};

const withoutCode: StudentHelp = {
  dang_o_dau: "",
  can_sua: [],
  cac_buoc: ["Đọc kỹ đề xem cần in ra cái gì.", "Khai báo 2 biến a và b."],
};

describe("toStudentHelpText", () => {
  it("should open with the assignment title so the student knows which task it is", () => {
    // Em hỏi nhiều bài trong một ngày; thiếu dòng này thì không biết là bài nào.
    expect(toStudentHelpText(withCode, "Tính tổng hai số")).toMatch(
      /^Đề bài: Tính tổng hai số\n/
    );
  });

  it("should print all three blocks when the student sent code", () => {
    const text = toStudentHelpText(withCode, "Tính tổng hai số");

    expect(text).toContain("EM ĐANG LÀM ĐẾN ĐÂU");
    expect(text).toContain("CẦN SỬA");
    expect(text).toContain("LÀM GÌ TIẾP");
  });

  it("should drop the empty blocks when the student has not sent code yet", () => {
    const text = toStudentHelpText(withoutCode, "Tính tổng hai số");

    // In tiêu đề rỗng chỉ làm em rối.
    expect(text).not.toContain("EM ĐANG LÀM ĐẾN ĐÂU");
    expect(text).not.toContain("CẦN SỬA");
  });

  it("should call them starting steps, not next steps, when there is no code", () => {
    // "LÀM GÌ TIẾP" khi em chưa làm gì cả là vô nghĩa.
    expect(toStudentHelpText(withoutCode, "Tính tổng")).toContain(
      "CÁC BƯỚC LÀM BÀI"
    );
    expect(toStudentHelpText(withoutCode, "Tính tổng")).not.toContain(
      "LÀM GÌ TIẾP"
    );
  });

  it("should number every step so the student can follow the order", () => {
    const text = toStudentHelpText(withoutCode, "Tính tổng");

    expect(text).toContain("1. Đọc kỹ đề xem cần in ra cái gì.");
    expect(text).toContain("2. Khai báo 2 biến a và b.");
  });

  it("should restart numbering in each block", () => {
    // "CẦN SỬA" và "LÀM GÌ TIẾP" là hai danh sách riêng — đánh số nối tiếp nhau
    // khiến em tưởng đó là một chuỗi việc phải làm lần lượt.
    const text = toStudentHelpText(withCode, "Tính tổng");
    const canSua = text.slice(text.indexOf("CẦN SỬA"), text.indexOf("LÀM GÌ TIẾP"));
    const lamGiTiep = text.slice(text.indexOf("LÀM GÌ TIẾP"));

    expect(canSua).toContain("1. Dòng 3");
    expect(lamGiTiep).toContain("1. Tạo một biến mới");
    expect(lamGiTiep).toContain("2. In biến đó ra");
  });

  it("should skip blank lines the AI may return", () => {
    const text = toStudentHelpText(
      { dang_o_dau: "   ", can_sua: ["", "  "], cac_buoc: ["Làm bước này.", " "] },
      "Bài 1"
    );

    expect(text).not.toContain("EM ĐANG LÀM ĐẾN ĐÂU");
    expect(text).not.toContain("CẦN SỬA");
    expect(text).toContain("1. Làm bước này.");
    // Chỉ đúng một mục — dòng trắng không được chiếm số thứ tự.
    expect(text).not.toContain("2.");
  });

  it("should separate blocks with exactly one blank line", () => {
    // Zalo không có markdown; cách nhau 2 dòng trống thì tin nhắn dài lê thê.
    const text = toStudentHelpText(withCode, "Tính tổng");

    expect(text).not.toContain("\n\n\n");
    expect(text.split("\n\n").length).toBe(4);
  });

  it("should not break when the assignment title is empty", () => {
    const text = toStudentHelpText(withoutCode, "   ");

    expect(text.startsWith("Đề bài:")).toBe(false);
    expect(text).toContain("CÁC BƯỚC LÀM BÀI");
  });
});
