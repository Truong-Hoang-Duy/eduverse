// E2E nhận xét theo buổi — gọi THẲNG `saveReview`. Không tốn lượt Gemini nào.
//
// Trọng tâm: ĐÁNH VẮNG. Đây là đường mà giáo viên dùng nhiều nhất khi điểm danh
// đầu buổi, và nó phải làm đúng hai việc cùng lúc: đánh dấu em là "xử lý xong"
// (để biến khỏi bộ lọc "Chưa hoàn thành") và XÓA SẠCH nhận xét cũ (để em không
// lọt vào tin Zalo gửi phụ huynh).
//
// Chạy: pnpm test:e2e (cần .env.local + mạng). Dữ liệu tự tạo, tự dọn.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { saveReview } from "@/lib/actions/reviews";
import { suggestSessionContent } from "@/lib/actions/sessions";

import {
  isHandled,
  isReviewed,
  type ExistingReview,
} from "../src/app/(teacher)/teacher/sessions/[id]/review-status";
import {
  admin,
  cleanupAll,
  clientFor,
  createUser,
  runAs,
  trackCourseCode,
  uniqueSuffix,
  type TestUser,
} from "./_harness";

const ts = uniqueSuffix();
const CODE = `RV${String(ts).slice(-4)}`;

let gv: TestUser;
let student: TestUser;
let sessionId: string;

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((v) => data.append(key, v));
    else data.set(key, value);
  }
  return data;
}

/** Đọc dòng nhận xét bằng service-role, đúng hình dạng UI nhận được. */
async function reviewRow(): Promise<ExistingReview | null> {
  const { data } = await admin()
    .from("student_reviews")
    .select("strengths, improvements, advice, ai_generated_comment, academic_level, is_absent")
    .eq("session_id", sessionId)
    .eq("student_id", student.id)
    .maybeSingle();
  return (data as ExistingReview | null) ?? null;
}

beforeAll(async () => {
  gv = await createUser(`rv.gv.${ts}`, { full_name: "GV Nhan Xet", role: "teacher" });

  const teacher = await clientFor(gv);
  const { data: course, error: courseErr } = await teacher
    .from("courses")
    .insert({ code: CODE, name: "Khoa Nhan Xet", teacher_id: gv.id })
    .select("id")
    .single();
  if (courseErr) throw new Error(`Tạo khóa: ${courseErr.message}`);
  trackCourseCode(CODE);

  const { data: cls, error: classErr } = await teacher
    .from("classes")
    .insert({
      course_id: course.id,
      class_code: `${CODE}01`,
      teacher_id: gv.id,
      total_sessions: 2,
    })
    .select("id")
    .single();
  if (classErr) throw new Error(`Mở lớp: ${classErr.message}`);

  // Trigger tự sinh đủ N buổi khi tạo lớp — lấy buổi 1.
  const { data: session, error: sessionErr } = await admin()
    .from("sessions")
    .select("id")
    .eq("class_id", cls.id)
    .eq("session_number", 1)
    .single();
  if (sessionErr) throw new Error(`Không tìm thấy buổi 1: ${sessionErr.message}`);
  sessionId = session.id;

  student = await createUser(`rv.hv.${ts}`, {
    full_name: "Hoc Vien",
    role: "student",
    class_code: `${CODE}01`,
  });
});

afterAll(cleanupAll);

describe("saveReview — nhận xét bình thường", () => {
  it("should refuse a signed-out caller", async () => {
    const result = await runAs(null, () =>
      saveReview({}, form({ session_id: sessionId, student_id: student.id }))
    );
    expect(result.error).toContain("Phiên đăng nhập");
  });

  it("should refuse a request with no session or student", async () => {
    const result = await runAs(gv, () => saveReview({}, new FormData()));
    expect(result.error).toContain("Thiếu thông tin");
  });

  it("should save what the teacher ticked", async () => {
    const result = await runAs(gv, () =>
      saveReview(
        {},
        form({
          session_id: sessionId,
          student_id: student.id,
          strengths: ["Tư duy tốt", "Chăm phát biểu"],
          improvements: ["Cần cẩn thận hơn"],
          advice: "Nên luyện thêm vòng lặp",
          academic_level: "gioi",
          is_absent: "false",
        })
      )
    );
    expect(result.success, result.error).toBeTruthy();

    const row = await reviewRow();
    expect(row?.strengths).toEqual(["Tư duy tốt", "Chăm phát biểu"]);
    expect(row?.academic_level).toBe("gioi");
    expect(row?.is_absent).toBe(false);
    expect(isReviewed(row), "có điểm mạnh nghĩa là đã nhận xét").toBe(true);
  });
});

describe("saveReview — đánh vắng", () => {
  it("should mark the student as HANDLED so they leave the 'chưa hoàn thành' filter", async () => {
    // Đây là chính điều user yêu cầu 2026-08-03. `isHandled` là hàm bộ lọc dùng.
    const result = await runAs(gv, () =>
      saveReview(
        {},
        form({ session_id: sessionId, student_id: student.id, is_absent: "true" })
      )
    );
    expect(result.success).toContain("vắng");

    const row = await reviewRow();
    expect(row?.is_absent).toBe(true);
    expect(isHandled(row), "vắng phải tính là xử lý xong").toBe(true);
    // Nhưng KHÔNG phải "đã nhận xét" — hai khái niệm khác nhau, badge hiện khác.
    expect(isReviewed(row)).toBe(false);
  });

  it("should wipe the review left over from before the student was marked absent", async () => {
    // Ca trước vừa lưu điểm mạnh + xếp loại cho chính em này. Đánh vắng mà giữ
    // lại là em lọt vào tin Zalo gửi phụ huynh với nhận xét của buổi em không học.
    const row = await reviewRow();

    expect(row?.strengths).toEqual([]);
    expect(row?.improvements).toEqual([]);
    expect(row?.advice).toBeNull();
    expect(row?.ai_generated_comment).toBeNull();
    expect(row?.academic_level).toBeNull();
  });

  it("should let the teacher undo an accidental absence", async () => {
    // Bỏ tick cũng lưu ngay (hai chiều đối xứng) — em quay lại "chưa hoàn thành"
    // để GV còn nhớ mà nhận xét.
    const result = await runAs(gv, () =>
      saveReview(
        {},
        form({ session_id: sessionId, student_id: student.id, is_absent: "false" })
      )
    );
    expect(result.success, result.error).toBeTruthy();

    const row = await reviewRow();
    expect(row?.is_absent).toBe(false);
    expect(isHandled(row), "bỏ vắng mà chưa nhận xét thì chưa xong").toBe(false);
  });

  it("should keep one row per student per session, not pile up duplicates", async () => {
    // Bốn lượt lưu ở trên đều cho cùng một em + một buổi. `upsert` theo
    // (session_id, student_id) phải gộp lại, nếu không bộ đếm "X/Y" sai hết.
    const { count } = await admin()
      .from("student_reviews")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("student_id", student.id);

    expect(count).toBe(1);
  });
});

describe("suggestSessionContent — gợi ý nội dung buổi học (1 lượt Gemini)", () => {
  it("should refuse a signed-out caller", async () => {
    const { error } = await runAs(null, () =>
      suggestSessionContent({ sessionId, draftText: "day vong lap" })
    );
    expect(error).toContain("Phiên đăng nhập");
  });

  it("should require some notes to work from", async () => {
    const { error } = await runAs(gv, () =>
      suggestSessionContent({ sessionId, draftText: "   " })
    );
    expect(error).toContain("Nhập ghi chú");
  });

  it("should come back as bullet lines, not one paragraph", async () => {
    // Hợp đồng với ai-service vừa đổi (`content` chuỗi → `bullets` mảng). Lệch
    // là hỏng ÂM THẦM: dialog vẫn hiện, chỉ là trống trơn.
    const { content, error } = await runAs(gv, () =>
      suggestSessionContent({
        sessionId,
        draftText:
          "on lai vong lap for, day mang 1 chieu: khai bao va truy cap phan tu, bai tap tinh tong cac so trong mang",
      })
    );
    expect(error, "đỏ ở đây thì NGHI GEMINI TRƯỚC — đọc log ai-service").toBeUndefined();

    const lines = content!.split("\n").filter((l) => l.trim());
    expect(lines.length, "phải là nhiều dòng, không phải một đoạn văn").toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.startsWith("- "), `dòng phải bắt đầu bằng "- ": ${line}`).toBe(true);
      // Web tự thêm "- " nên model KHÔNG được thêm lần nữa.
      expect(line.startsWith("- -"), `gạch đầu dòng bị nhân đôi: ${line}`).toBe(false);
    }
  });
});
