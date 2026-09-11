import { describe, expect, it } from "vitest";

import {
  calculateDemoTotal,
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

  it("should format clean evaluation text for clipboard", () => {
    const mockData: FinalPresentationEvaluation = {
      comment: "Em đã hoàn thành rất tốt khóa học.",
      demo_score: {
        computational_thinking: 1.8,
        creative_thinking: 0.4,
        communication: 0.9,
        problem_solving: 0.9,
        computer_skills: 0.5,
        total: 4.5,
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
    expect(text).toContain("DEMO SCORE: 4.5/5.0");
    expect(text).toContain("Kiến thức học viên tự học: 4/5 (Khá)");
    expect(text).toContain('"Chủ động tìm hiểu thêm."');
  });
});
