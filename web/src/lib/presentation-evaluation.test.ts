import { describe, expect, it } from "vitest";

import {
  calculateDemoTotal,
  calculateGrandTotal,
  createDefaultFinalEvaluation,
  distributeScores,
  DNL_CRITERIA,
  type FinalPresentationEvaluation,
  formatFullEvaluationText,
  scoreToLevel,
} from "./presentation-evaluation";


describe("presentation-evaluation", () => {
  it("should have all 9 DNL criteria across 3 groups", () => {
    expect(DNL_CRITERIA).toHaveLength(9);
    const groups = new Set(DNL_CRITERIA.map((c) => c.group));
    expect(groups).toEqual(new Set(["KIẾN THỨC", "KỸ NĂNG", "THÁI ĐỘ"]));

    const kienThuc = DNL_CRITERIA.filter((c) => c.group === "KIẾN THỨC");
    expect(kienThuc).toHaveLength(2);

    const kyNang = DNL_CRITERIA.filter((c) => c.group === "KỸ NĂNG");
    expect(kyNang).toHaveLength(5);

    const thaiDo = DNL_CRITERIA.filter((c) => c.group === "THÁI ĐỘ");
    expect(thaiDo).toHaveLength(2);
  });

  it("should correctly calculate demo total score", () => {
    const total = calculateDemoTotal({
      computational_thinking: 1.8,
      creative_thinking: 0.4,
      communication: 0.9,
      problem_solving: 0.9,
      computer_skills: 0.5,
    });
    expect(total).toBe(4.5);
  });

  it("should map scores to correct levels", () => {
    expect(scoreToLevel(5)).toBe("Giỏi");
    expect(scoreToLevel(4)).toBe("Khá");
    expect(scoreToLevel(3)).toBe("Khá");
    expect(scoreToLevel(2)).toBe("TB");
    expect(scoreToLevel(1)).toBe("TB");
  });

  it("should calculate grand total of knowledge and demo", () => {
    expect(calculateGrandTotal(3.5, 4.0)).toBe(7.5);
    expect(calculateGrandTotal(5.0, 5.0)).toBe(10.0);
  });

  it("should auto distribute scores and ensure total is not below 6.0", () => {
    // Thử với điểm dưới 6.0 -> tự động kẹp về tối thiểu 6.0
    const belowSix = distributeScores(4.0);
    expect(belowSix.total).toBe(6.0);
    expect(belowSix.knowledge_score).toBe(3.0);
    expect(belowSix.demo_total).toBe(3.0);
    expect(belowSix.computational_thinking).toBe(1.2);
    expect(belowSix.creative_thinking).toBe(0.3);
    expect(belowSix.communication).toBe(0.6);
    expect(belowSix.problem_solving).toBe(0.6);
    expect(belowSix.computer_skills).toBe(0.3);

    // Thử với điểm 7.0
    const seven = distributeScores(7.0);
    expect(seven.total).toBe(7.0);
    expect(seven.knowledge_score).toBe(3.5);
    expect(seven.demo_total).toBe(3.5);
    expect(seven.total).toBeGreaterThanOrEqual(6.0);

    // Thử với điểm 8.0
    const eight = distributeScores(8.0);
    expect(eight.total).toBe(8.0);
    expect(eight.knowledge_score).toBe(4.0);
    expect(eight.demo_total).toBe(4.0);
  });

  it("should format clean evaluation text for clipboard with total score", () => {
    const mockData: FinalPresentationEvaluation = {
      comment: "Em đã hoàn thành rất tốt khóa học.",
      demo_score: {
        knowledge_score: 4.0,
        computational_thinking: 1.8,
        creative_thinking: 0.4,
        communication: 0.9,
        problem_solving: 0.9,
        computer_skills: 0.5,
        demo_total: 4.5,
        total: 8.5,
      },
      dnl_evaluations: {
        kien_thuc_tu_hoc: {
          score: 4,
          level: "Khá",
          comment: "Chủ động tìm hiểu thêm.",
        },
      },
    };

    const text = formatFullEvaluationText("Nguyễn Văn A", mockData);
    expect(text).toContain("NGUYỄN VĂN A");
    expect(text).toContain("ĐIỂM TỔNG KẾT: 8.5/10.0");
    expect(text).toContain("Điểm kiến thức (Demo2024 | CSI): 4/5.0 điểm");
    expect(text).toContain("Điểm demo sản phẩm: 4.5/5.0 điểm");
    expect(text).toContain("Kiến thức học viên tự học: 4/5 (Khá)");
    expect(text).toContain('"Chủ động tìm hiểu thêm."');
  });

  it("should format evaluation text without demo score when hideDemoScore is true", () => {
    const mockData: FinalPresentationEvaluation = {
      comment: "Em hoàn thành xuất sắc bài kiểm tra cuối khóa.",
      demo_score: {
        knowledge_score: 4.0,
        computational_thinking: 1.8,
        creative_thinking: 0.4,
        communication: 0.9,
        problem_solving: 0.9,
        computer_skills: 0.5,
        demo_total: 4.5,
        total: 8.5,
      },
      dnl_evaluations: {
        kien_thuc_tu_hoc: {
          score: 4,
          level: "Khá",
          comment: "Làm bài kiểm tra nghiêm túc, hiểu rõ bản chất.",
        },
      },
    };

    const text = formatFullEvaluationText("Trần Thị B", mockData, {
      hideDemoScore: true,
    });
    expect(text).toContain("TRẦN THỊ B");
    expect(text).toContain("Em hoàn thành xuất sắc bài kiểm tra cuối khóa.");
    expect(text).toContain("Kiến thức học viên tự học: 4/5 (Khá)");
    expect(text).not.toContain("ĐIỂM TỔNG KẾT");
    expect(text).not.toContain("Demo2024");
    expect(text).not.toContain("Điểm demo sản phẩm");
  });

  it("should create default final evaluation with 9 DNL criteria", () => {
    const defaultEval = createDefaultFinalEvaluation("Nhận xét mặc định");
    expect(defaultEval.comment).toBe("Nhận xét mặc định");
    expect(defaultEval.demo_score.total).toBe(7.0);
    expect(Object.keys(defaultEval.dnl_evaluations)).toHaveLength(9);
    for (const c of DNL_CRITERIA) {
      expect(defaultEval.dnl_evaluations[c.key]).toBeDefined();
      expect(defaultEval.dnl_evaluations[c.key].score).toBe(4);
      expect(defaultEval.dnl_evaluations[c.key].level).toBe("Khá");
    }
  });
});

