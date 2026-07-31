// Dựng đoạn văn bản GV dán thẳng cho học viên (Zalo).
//
// Tách khỏi component vì đây là LOGIC THUẦN và là thứ học viên đọc tận mắt —
// sai định dạng ở đây là em nhận một tin nhắn khó hiểu. Có unit test đi kèm
// (`student-help-text.test.ts`).

import type { StudentHelp } from "@/lib/actions/student-help";

/** Tiêu đề từng khối. Chữ HOA để tách khối trên Zalo — Zalo không có markdown. */
const HEADINGS = {
  dangODau: "EM ĐANG LÀM ĐẾN ĐÂU",
  canSua: "CẦN SỬA",
  // Chưa gửi code thì đây là các bước BẮT ĐẦU, gửi rồi thì là bước TIẾP THEO.
  cacBuocMoi: "CÁC BƯỚC LÀM BÀI",
  cacBuocTiep: "LÀM GÌ TIẾP",
} as const;

function numbered(lines: string[]): string {
  return lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
}

/**
 * Đổi kết quả AI thành tin nhắn gửi em.
 *
 * Bỏ khối rỗng thay vì in tiêu đề trống: khi em chưa gửi code thì `dang_o_dau`
 * và `can_sua` đều rỗng, in ra chỉ làm em rối.
 */
export function toStudentHelpText(
  help: StudentHelp,
  assignmentTitle: string
): string {
  const blocks: string[] = [];

  if (assignmentTitle.trim()) {
    blocks.push(`Đề bài: ${assignmentTitle.trim()}`);
  }

  const dangODau = help.dang_o_dau.trim();
  if (dangODau) {
    blocks.push(`${HEADINGS.dangODau}\n${dangODau}`);
  }

  const canSua = help.can_sua.filter((line) => line.trim());
  if (canSua.length > 0) {
    blocks.push(`${HEADINGS.canSua}\n${numbered(canSua)}`);
  }

  const cacBuoc = help.cac_buoc.filter((line) => line.trim());
  if (cacBuoc.length > 0) {
    // Có phần "em đang ở đâu" nghĩa là em đã gửi code → đây là bước TIẾP THEO.
    const heading = dangODau ? HEADINGS.cacBuocTiep : HEADINGS.cacBuocMoi;
    blocks.push(`${heading}\n${numbered(cacBuoc)}`);
  }

  // Một dòng trống giữa các khối — đủ tách trên Zalo mà không tốn màn hình.
  return blocks.join("\n\n");
}
