// Dựng đoạn kết quả chấm để GV dán cho học viên (Zalo).
//
// Tách khỏi component vì đây là LOGIC THUẦN và là thứ HỌC VIÊN đọc tận mắt —
// sai định dạng ở đây là em nhận một tin nhắn khó hiểu, mà GV thì dán đi luôn
// chứ hiếm khi đọc lại. Có unit test đi kèm.

import type { GradeResult, QuizAnswer } from "@/lib/actions/grading";

/** Zalo không có markdown → tiêu đề dùng CHỮ HOA để tách khối. */
const HEADINGS = {
  quiz: "TRẮC NGHIỆM",
  practice: "THỰC HÀNH",
} as const;

/** "1, 2, 3" — dãy số câu, để em soát nhanh. */
function numberList(numbers: number[]): string {
  return numbers.join(", ");
}

/**
 * Một dòng cho câu sai. Nêu THẲNG đáp án đúng (user chốt 2026-07-31) — khác chủ
 * trương "không giải hộ" của tab Hỏi bài, vì trắc nghiệm đã chấm xong rồi, giấu
 * đáp án chỉ khiến em phải nhắn hỏi lại.
 */
function wrongLine(answer: QuizAnswer): string {
  const chosen = answer.em_chon.trim();
  const correct = answer.dap_an_dung.trim();
  const parts = [`Câu ${answer.cau}:`];

  parts.push(chosen ? `em chọn ${chosen}` : "em bỏ trống");
  if (correct) parts.push(`— đáp án đúng là ${correct}`);

  const line = parts.join(" ");
  const why = answer.giai_thich.trim();
  return why ? `${line}. ${why}` : `${line}.`;
}

/**
 * Đổi kết quả chấm thành tin nhắn gửi em.
 *
 * Bỏ hẳn khối không có dữ liệu thay vì in tiêu đề trống: chấm mỗi trắc nghiệm
 * thì không có gì để nói về thực hành, và ngược lại.
 */
export function toGradeCopyText(
  grade: GradeResult,
  assignmentTitle: string
): string {
  const blocks: string[] = [];
  const header: string[] = [];

  if (assignmentTitle.trim()) {
    header.push(`Đề bài: ${assignmentTitle.trim()}`);
  }

  const quiz = grade.quiz;
  const hasQuiz = Boolean(quiz && quiz.cau_hoi.length > 0);

  // Điểm để ngay đầu tin — thứ em (và phụ huynh) tìm trước tiên.
  if (hasQuiz) {
    header.push(`Lý thuyết: ${quiz!.so_dung}/${quiz!.tong_so} câu đúng`);
  }
  if (grade.score !== null) {
    header.push(`Thực hành: ${grade.score}/100`);
  }
  if (header.length > 0) blocks.push(header.join("\n"));

  if (hasQuiz) {
    const lines: string[] = [HEADINGS.quiz];
    const right = quiz!.cau_hoi.filter((c) => c.dung).map((c) => c.cau);
    const wrong = quiz!.cau_hoi.filter((c) => !c.dung);

    if (right.length > 0) lines.push(`Đúng: ${numberList(right)}`);
    if (wrong.length > 0) {
      lines.push("Cần xem lại:");
      lines.push(...wrong.map(wrongLine));
    }
    // Đúng hết thì nói thẳng, đừng để em phải tự suy ra từ việc thiếu mục.
    if (wrong.length === 0) lines.push("Em làm đúng tất cả các câu.");
    blocks.push(lines.join("\n"));
  }

  const bullets = grade.bullets.filter((b) => b.trim());
  if (bullets.length > 0) {
    blocks.push([HEADINGS.practice, ...bullets.map((b) => `- ${b}`)].join("\n"));
  }

  return blocks.join("\n\n");
}
