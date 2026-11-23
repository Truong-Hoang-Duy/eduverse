import { describe, expect, it } from "vitest";

import {
  buildLmsStudentPayload,
  parseCheckpointScoresFromText,
} from "./lms-bridge";
import { createDefaultFinalEvaluation } from "./presentation-evaluation";

describe("buildLmsStudentPayload", () => {
  it("should return null for absent students or empty reviews", () => {
    expect(
      buildLmsStudentPayload({
        studentName: "Nguyễn Ngọc Thành",
        isAbsent: true,
        comment: "Em học tốt",
      })
    ).toBeNull();

    expect(
      buildLmsStudentPayload({
        studentName: "Nguyễn Ngọc Thành",
        isAbsent: false,
        comment: "   ",
        evaluation: null,
      })
    ).toBeNull();
  });

  it("should build regular session payload with comment only", () => {
    const payload = buildLmsStudentPayload({
      studentName: "  Trần Minh  ",
      comment: "  Hôm nay em nắm bài nhanh và làm tốt bài thực hành. ",
    });

    expect(payload).toEqual({
      studentName: "Trần Minh",
      comment: "Hôm nay em nắm bài nhanh và làm tốt bài thực hành.",
    });
  });

  it("should include 9 DNL criteria without demoScore for periodic exams (Buổi 5, 9)", () => {
    const evaluation = createDefaultFinalEvaluation("Quá trình học tập:\n- Tốt");
    evaluation.dnl_evaluations.kien_thuc_tai_lop = {
      score: 4,
      level: "Khá",
      comment: "Em nắm chắc kiến thức tại lớp.",
    };

    const payload = buildLmsStudentPayload({
      studentName: "Võ Hoài Gia Phúc",
      comment: "Quá trình học tập:\n- Em học đều và tập trung.",
      evaluation,
      includeDemoScore: false,
    });

    expect(payload).not.toBeNull();
    expect(payload?.comment).toBe("Quá trình học tập:\n- Em học đều và tập trung.");
    expect(payload?.dnlEvaluations?.kien_thuc_tai_lop).toEqual({
      score: 4,
      level: "Khá",
      comment: "Em nắm chắc kiến thức tại lớp.",
    });
    expect(payload?.demoScore).toBeUndefined();
    expect(payload?.mindxLetter).toBeUndefined();
  });

  it("should include DNL, Demo Score, and MindX Letter for final session (Buổi 14)", () => {
    const evaluation = createDefaultFinalEvaluation("Tổng kết khóa học");
    evaluation.mindx_letter = {
      learned_from_mindx: "Em làm chủ Python và phân tích dữ liệu.",
      suggestions_from_mindx: "Duy trì luyện tập đều mỗi tuần.",
      future_direction: "Tiếp tục lên Computer Science Intensive.",
    };

    const payload = buildLmsStudentPayload({
      studentName: "Nguyễn Hoàng Nhân",
      comment: "Tổng kết khóa học",
      evaluation,
      includeDemoScore: true,
    });

    expect(payload?.demoScore).toBeDefined();
    expect(payload?.demoScore?.total).toBeGreaterThanOrEqual(6.0);
    expect(payload?.mindxLetter).toEqual({
      learned_from_mindx: "Em làm chủ Python và phân tích dữ liệu.",
      suggestions_from_mindx: "Duy trì luyện tập đều mỗi tuần.",
      future_direction: "Tiếp tục lên Computer Science Intensive.",
    });
  });
});

describe("parseCheckpointScoresFromText", () => {
  it("should extract practice score (scaled to 5) and exact quiz right answers", () => {
    const text = `Đề bài: [CSA - Checkpoints] Buổi 9 Đề bài
Lý thuyết: 8/10 câu đúng
Thực hành: 95/100

TRẮC NGHIỆM
Đúng: 1, 2, 3, 5, 6, 7, 9, 10
Cần xem lại:
Câu 4: em chọn A — đáp án đúng là C.

THỰC HÀNH
- Đã xây dựng mô hình tốt.`;

    const parsed = parseCheckpointScoresFromText(text);
    expect(parsed.practiceScore).toBe(4.75);
    expect(parsed.correctQuestions).toEqual([1, 2, 3, 5, 6, 7, 9, 10]);
  });

  it("should handle 10/10 quiz and 98/100 practice score", () => {
    const text = `Lý thuyết: 10/10 câu đúng
Thực hành: 98/100
Em làm đúng tất cả các câu.`;
    const parsed = parseCheckpointScoresFromText(text);
    expect(parsed.practiceScore).toBe(4.9);
    expect(parsed.correctQuestions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("should keep quiz null when product comment only has practice score", () => {
    const text = `Đề bài: [CSA - Checkpoints] Buổi 9 Đề bài
Thực hành: 65/100

THỰC HÀNH
- Cần cải thiện phần biểu đồ.`;
    const parsed = parseCheckpointScoresFromText(text);
    expect(parsed.practiceScore).toBe(3.25);
    expect(parsed.correctQuestions).toBeNull();
  });

  it("should strip ReactQuill HTML and support wrong-question fallback", () => {
    const html = `<p>Lý thuyết: 8/10 câu đúng</p><p>Thực hành: 90/100</p><p>TRẮC NGHIỆM</p><p>Sai: 3, 7</p>`;
    const parsed = parseCheckpointScoresFromText(html);
    expect(parsed.practiceScore).toBe(4.5);
    expect(parsed.correctQuestions).toEqual([1, 2, 4, 5, 6, 8, 9, 10]);
  });

  it("should convert 70/100 to 3.5, round to 2 decimals, and cap at 5", () => {
    expect(parseCheckpointScoresFromText("Thực hành: 70/100").practiceScore).toBe(3.5);
    expect(parseCheckpointScoresFromText("Thực hành: 83.33/100").practiceScore).toBe(4.17);
    expect(parseCheckpointScoresFromText("Thực hành: 120/100").practiceScore).toBe(5);
  });
});
