import { describe, expect, it } from "vitest";

import type { GradeResult, QuizAnswer } from "@/lib/actions/grading";

import { toGradeCopyText } from "./grading-copy-text";

/**
 * Đây là đoạn HỌC VIÊN đọc tận mắt qua Zalo. Hai thứ dễ sai nhất và cũng tai hại
 * nhất: lẫn lộn hai loại điểm (lý thuyết vs thực hành), và in tiêu đề của khối
 * không được chấm.
 */
function answer(over: Partial<QuizAnswer> = {}): QuizAnswer {
  return {
    cau: 1,
    dung: true,
    em_chon: "A",
    dap_an_dung: "A",
    giai_thich: "",
    ...over,
  };
}

const quizOnly: GradeResult = {
  score: null,
  bullets: [],
  quiz: {
    tong_so: 4,
    so_dung: 2,
    cau_hoi: [
      answer({ cau: 1 }),
      answer({ cau: 2, dung: false, em_chon: "B", dap_an_dung: "C", giai_thich: "Xem lại vòng lặp for." }),
      answer({ cau: 3 }),
      answer({ cau: 4, dung: false, em_chon: "", dap_an_dung: "D", giai_thich: "" }),
    ],
  },
};

const practiceOnly: GradeResult = {
  score: 75,
  bullets: ["Làm đúng yêu cầu tính tổng", "Tên biến chưa rõ nghĩa"],
  quiz: null,
};

const both: GradeResult = {
  score: 75,
  bullets: ["Làm đúng yêu cầu tính tổng"],
  quiz: quizOnly.quiz,
};

describe("toGradeCopyText — chỉ trắc nghiệm", () => {
  it("should put the theory score up top and no practice score", () => {
    const text = toGradeCopyText(quizOnly, "Buổi 5");

    expect(text).toContain("Lý thuyết: 2/4 câu đúng");
    expect(text).not.toContain("Thực hành");
  });

  it("should list the questions the student got right", () => {
    expect(toGradeCopyText(quizOnly, "Buổi 5")).toContain("Đúng: 1, 3");
  });

  it("should name the correct answer for a wrong one", () => {
    // User chốt: nêu THẲNG đáp án đúng, khác chủ trương "không giải hộ" của tab
    // Hỏi bài — trắc nghiệm đã chấm xong, giấu chỉ khiến em nhắn hỏi lại.
    expect(toGradeCopyText(quizOnly, "Buổi 5")).toContain(
      "Câu 2: em chọn B — đáp án đúng là C. Xem lại vòng lặp for."
    );
  });

  it("should say the student left it blank instead of pretending they chose", () => {
    expect(toGradeCopyText(quizOnly, "Buổi 5")).toContain(
      "Câu 4: em bỏ trống — đáp án đúng là D."
    );
  });

  it("should say so plainly when every answer is right", () => {
    const perfect: GradeResult = {
      score: null,
      bullets: [],
      quiz: { tong_so: 2, so_dung: 2, cau_hoi: [answer({ cau: 1 }), answer({ cau: 2 })] },
    };

    const text = toGradeCopyText(perfect, "Buổi 5");

    expect(text).toContain("Em làm đúng tất cả các câu.");
    expect(text).not.toContain("Cần xem lại");
  });
});

describe("toGradeCopyText — chỉ thực hành", () => {
  it("should keep the old shape: one score and bullets", () => {
    const text = toGradeCopyText(practiceOnly, "Buổi 3");

    expect(text).toContain("Thực hành: 75/100");
    expect(text).toContain("- Làm đúng yêu cầu tính tổng");
    expect(text).not.toContain("Lý thuyết");
    expect(text).not.toContain("TRẮC NGHIỆM");
  });
});

describe("toGradeCopyText — cả hai phần", () => {
  it("should show two separate scores, never a merged one", () => {
    // Gộp lại thì đúng hết trắc nghiệm mà code sai vẫn ra điểm khá, che mất vấn đề.
    const text = toGradeCopyText(both, "Buổi 9");

    expect(text).toContain("Lý thuyết: 2/4 câu đúng");
    expect(text).toContain("Thực hành: 75/100");
    expect(text).toMatch(/Lý thuyết[\s\S]*Thực hành/);
  });

  it("should keep the two sections in order and separated", () => {
    const text = toGradeCopyText(both, "Buổi 9");

    expect(text.indexOf("TRẮC NGHIỆM")).toBeLessThan(text.indexOf("THỰC HÀNH"));
    expect(text).not.toContain("\n\n\n");
  });

  it("should open with the assignment title", () => {
    expect(toGradeCopyText(both, "Buổi 9")).toMatch(/^Đề bài: Buổi 9\n/);
  });
});

describe("toGradeCopyText — dữ liệu thiếu", () => {
  it("should drop the quiz block when no questions were found", () => {
    // ai-service trả tong_so 0 khi không tìm thấy bài làm trắc nghiệm — in tiêu
    // đề rỗng ở đây thì em tưởng mình bị 0 câu đúng.
    const notFound: GradeResult = {
      score: 60,
      bullets: ["Có làm phần thực hành"],
      quiz: { tong_so: 0, so_dung: 0, cau_hoi: [] },
    };

    const text = toGradeCopyText(notFound, "Buổi 5");

    expect(text).not.toContain("TRẮC NGHIỆM");
    expect(text).not.toContain("Lý thuyết");
    expect(text).toContain("Thực hành: 60/100");
  });

  it("should not print an empty practice section", () => {
    const text = toGradeCopyText(
      { score: null, bullets: ["  ", ""], quiz: quizOnly.quiz },
      "Buổi 5"
    );

    expect(text).not.toContain("THỰC HÀNH");
  });

  it("should survive a score of zero", () => {
    // 0 là điểm thật, không phải "chưa chấm" — không được rơi vào nhánh bỏ khối.
    const text = toGradeCopyText({ score: 0, bullets: ["Chưa làm gì"], quiz: null }, "Buổi 3");

    expect(text).toContain("Thực hành: 0/100");
  });

  it("should not break without an assignment title", () => {
    const text = toGradeCopyText(practiceOnly, "   ");

    expect(text.startsWith("Đề bài:")).toBe(false);
    expect(text).toContain("Thực hành: 75/100");
  });
});
