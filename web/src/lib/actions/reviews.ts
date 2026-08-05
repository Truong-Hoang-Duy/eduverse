"use server";

import { revalidatePath } from "next/cache";

import { isAcademicLevel } from "@/lib/academic-levels";
import { getMyApiKey } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function saveReview(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const sessionId = String(formData.get("session_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const isAbsent = formData.get("is_absent") === "true";
  const rawLevel = String(formData.get("academic_level") ?? "");
  const academicLevel = isAcademicLevel(rawLevel) ? rawLevel : null;

  if (!sessionId || !studentId) {
    return { error: "Thiếu thông tin buổi học / học viên." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  // Vắng mặt = không nhận xét: xóa sạch điểm mạnh/cải thiện/mức xếp loại để dữ
  // liệu buổi trước (nếu đổi từ có mặt sang vắng) không dính lại và không lọt
  // vào tin Zalo tổng hợp.
  const strengths = isAbsent ? [] : formData.getAll("strengths").map(String);
  const improvements = isAbsent
    ? []
    : formData.getAll("improvements").map(String);
  const aiComment = isAbsent
    ? ""
    : String(formData.get("ai_comment") ?? "").trim();

  const { error } = await supabase.from("student_reviews").upsert(
    {
      session_id: sessionId,
      student_id: studentId,
      strengths,
      improvements,
      ai_generated_comment: aiComment || null,
      academic_level: isAbsent ? null : academicLevel,
      is_absent: isAbsent,
      created_by: user.id,
    },
    { onConflict: "session_id,student_id" }
  );
  if (error) {
    return { error: `Không lưu được nhận xét: ${error.message}` };
  }

  revalidatePath(`/teacher/sessions/${sessionId}`);
  return { success: isAbsent ? "Đã đánh dấu vắng mặt." : "Đã lưu nhận xét." };
}

export interface StudentSummary {
  qua_trinh_hoc: string;
  diem_manh: string;
  diem_yeu: string;
  dinh_huong: string;
  kho_khan: string;
}

interface SummaryReviewRow {
  strengths: string[];
  improvements: string[];
  ai_generated_comment: string | null;
  sessions: { session_number: number; title: string | null } | null;
}

/** Tổng hợp nhận xét 1 học viên từ TẤT CẢ buổi đã nhận xét trong lớp. */
export async function generateStudentSummary(input: {
  classId: string;
  studentId: string;
}): Promise<{ summary?: StudentSummary; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const [{ data: student }, { data: cls }, { data: reviewsData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", input.studentId)
        .single(),
      supabase
        .from("classes")
        .select("class_code, courses(name)")
        .eq("id", input.classId)
        .single(),
      supabase
        .from("student_reviews")
        .select(
          "strengths, improvements, ai_generated_comment, sessions!inner(session_number, title, class_id)"
        )
        .eq("student_id", input.studentId)
        .eq("sessions.class_id", input.classId),
    ]);

  const reviews = (reviewsData ?? []) as unknown as SummaryReviewRow[];
  if (reviews.length === 0) {
    return {
      error:
        "Học viên này chưa có nhận xét buổi nào — hãy nhận xét trong các buổi học trước.",
    };
  }

  try {
    const summary = await callAiService<StudentSummary>(
      "/generate-student-summary",
      {
        api_key: await getMyApiKey(),
        student_name: student?.full_name ?? "Học viên",
        class_code: cls?.class_code ?? "",
        course_name:
          (cls as unknown as { courses: { name: string } | null })?.courses
            ?.name ?? "",
        reviews: reviews
          .map((r) => ({
            session_number: r.sessions?.session_number ?? 0,
            session_title: r.sessions?.title ?? "",
            strengths: r.strengths,
            improvements: r.improvements,
            comment: r.ai_generated_comment,
          }))
          .sort((a, b) => a.session_number - b.session_number),
      }
    );
    return { summary };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return { error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy)." };
  }
}

export interface GenerateReviewInput {
  studentName: string;
  sessionTitle: string;
  sessionContent: string;
  strengths: string[];
  improvements: string[];
  /** Bối cảnh buổi học GV gõ 1 lần cho cả buổi (VD: hôm nay kiểm tra) — chỉ để
   *  AI tham khảo, không phải nội dung nhận xét. */
  sessionContext?: string;
  /** Buổi có kiểm tra định kỳ — tách nhận xét AI thành 2 phần (học tập / kiểm
   *  tra) thay vì viết chung một đoạn. */
  isPeriodicTest?: boolean;
  /** Quan sát của GV về quá trình làm bài kiểm tra của em — chỉ gửi khi
   *  `isPeriodicTest`, KHÔNG lưu lại (chọn lại mỗi lần tạo nhận xét). */
  testProcessNotes?: string[];
  previousComment?: string;
  /** Nhận xét (đã lưu) của các buổi TRƯỚC của cùng học viên — giúp AI đổi
   *  cách diễn đạt, tránh lặp lời văn giữa các buổi. */
  priorComments?: string[];
  /** Nhãn tiếng Việt của mức xếp loại học lực (Giỏi/Khá/...) — chỉ để AI chỉnh
   *  độ sâu/giọng, không nêu thẳng cho phụ huynh. */
  academicLevel?: string;
}

/** Gọi ai-service sinh nhận xét — client gọi trực tiếp từ onClick. */
export async function generateAiReview(
  input: GenerateReviewInput
): Promise<{ comment?: string; error?: string }> {
  // Chặn gọi khi chưa đăng nhập (server action public endpoint).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  try {
    const data = await callAiService<{ comment: string }>("/generate-review", {
      api_key: await getMyApiKey(),
      student_name: input.studentName,
      session_title: input.sessionTitle,
      session_content: input.sessionContent,
      strengths: input.strengths,
      improvements: input.improvements,
      session_context: input.sessionContext || null,
      is_periodic_test: input.isPeriodicTest ?? false,
      test_process_notes: input.testProcessNotes ?? [],
      previous_comment: input.previousComment || null,
      prior_comments: input.priorComments ?? [],
      academic_level: input.academicLevel || null,
    });
    return { comment: data.comment };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return { error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy)." };
  }
}
