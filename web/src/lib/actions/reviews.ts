"use server";

import { revalidatePath } from "next/cache";

import { academicLevelLabel } from "@/lib/academic-levels";
import { getAiConfig } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import type { FinalPresentationEvaluation } from "@/lib/presentation-evaluation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function saveReview(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const sessionId = String(formData.get("session_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const isAbsent = formData.get("is_absent") === "true";

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

  // Vắng mặt = không nhận xét: xóa sạch điểm mạnh/cải thiện để dữ liệu buổi
  // trước (nếu đổi từ có mặt sang vắng) không dính lại và không lọt vào tin
  // Zalo tổng hợp.
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

/** Buổi trước gần nhất lấy làm ngữ cảnh chống lặp lời văn — khớp
 *  `MAX_PRIOR_COMMENTS` ở `sessions/[id]/page.tsx`. */
const MAX_PRIOR_COMMENTS = 3;

/** Gộp (union, bỏ trùng không phân biệt hoa/thường). GIỮ thứ tự hiện có trước,
 *  thứ copy sang nối vào sau — cùng luật với nút copy từng em ở review-editor. */
function mergeUnique(current: string[], incoming: string[]): string[] {
  const seen = new Set(current.map((s) => s.toLowerCase()));
  const merged = [...current];
  for (const item of incoming) {
    if (!seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase());
      merged.push(item);
    }
  }
  return merged;
}

interface ApplyRow {
  student_id: string;
  strengths: string[];
  improvements: string[];
  ai_generated_comment: string | null;
  is_absent: boolean;
}

export interface ApplyFromSessionResult {
  /** Số em được áp tích chọn (đã lưu DB). */
  applied: number;
  /** Số em AI viết được nhận xét. */
  generated: number;
  /** Số em AI KHÔNG viết được (thường là hết lượt Gemini) — để trống, GV đổi
   *  key rồi bấm "AI tạo nhận xét" ở từng em. */
  aiFailed: number;
  error?: string;
}

/**
 * Áp tích chọn của MỘT buổi trước sang TẤT CẢ học viên của buổi hiện tại, rồi
 * gọi AI viết nhận xét cho từng em (yêu cầu user 2026-08-06).
 *
 * Luật đã chốt:
 * - GỘP chứ không ghi đè: thứ GV đã tích ở buổi này được giữ, chỉ thêm mục mới
 *   từ buổi nguồn.
 * - Chỉ copy điểm mạnh / cần cải thiện. KHÔNG copy câu nhận xét gửi phụ huynh
 *   của buổi nguồn (nó nói về nội dung buổi đó, dán sang là sai bài). Xếp loại
 *   học lực KHÔNG cần copy nữa — từ 2026-08-28 nó tích 1 lần ở cấp LỚP
 *   (`enrollments.academic_level`), đã dùng chung cho mọi buổi sẵn rồi.
 * - Bỏ qua em đã đánh VẮNG ở buổi này, và em vắng/trống tích ở buổi nguồn.
 *
 * 🔴 LƯU TÍCH CHỌN TRƯỚC, gọi AI SAU — và mỗi em một lời gọi độc lập
 * (`allSettled`): hạn mức Gemini free chỉ 20 lượt/NGÀY tính theo Google Cloud
 * project, lớp đông là chắc chắn hết giữa chừng. Em nào lỗi thì BỎ TRỐNG câu
 * nhận xét, phần tích chọn vẫn còn nguyên — GV đổi key rồi bấm "AI tạo nhận
 * xét" ở từng em (user chốt vậy). Đừng đổi sang rollback-toàn-bộ khi 1 em lỗi.
 */
export async function applyReviewsFromSession(input: {
  sessionId: string;
  sourceSessionId: string;
}): Promise<ApplyFromSessionResult> {
  const empty = { applied: 0, generated: 0, aiFailed: 0 };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ...empty, error: "Phiên đăng nhập hết hạn." };
  }

  const { data: sessionData } = await supabase
    .from("sessions")
    .select(
      "id, class_id, session_number, title, content, review_context, is_periodic_test, is_project_period"
    )
    .eq("id", input.sessionId)
    .single();
  if (!sessionData) {
    return { ...empty, error: "Không tìm thấy buổi học." };
  }

  // Buổi nguồn PHẢI cùng lớp — chặn dán nhận xét từ lớp khác sang (RLS cho GV
  // đọc mọi buổi mình dạy, nên phải tự kiểm ở đây).
  const { data: sourceSession } = await supabase
    .from("sessions")
    .select("id, class_id, session_number")
    .eq("id", input.sourceSessionId)
    .single();
  if (!sourceSession || sourceSession.class_id !== sessionData.class_id) {
    return { ...empty, error: "Buổi nguồn không thuộc lớp này." };
  }
  if (sourceSession.id === sessionData.id) {
    return { ...empty, error: "Không thể áp nhận xét từ chính buổi này." };
  }

  const [
    { data: enrollments },
    { data: sourceRows },
    { data: currentRows },
    { data: priorRows },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select("profiles(id, full_name), academic_level")
      .eq("class_id", sessionData.class_id)
      .order("joined_at"),
    supabase
      .from("student_reviews")
      .select("student_id, strengths, improvements, ai_generated_comment, is_absent")
      .eq("session_id", input.sourceSessionId),
    supabase
      .from("student_reviews")
      .select("student_id, strengths, improvements, ai_generated_comment, is_absent")
      .eq("session_id", input.sessionId),
    // Lời văn các buổi TRƯỚC để AI không lặp cách diễn đạt.
    supabase
      .from("student_reviews")
      .select(
        "student_id, ai_generated_comment, sessions!inner(session_number, class_id)"
      )
      .eq("sessions.class_id", sessionData.class_id)
      .lt("sessions.session_number", sessionData.session_number)
      .not("ai_generated_comment", "is", null),
  ]);

  const students = ((enrollments ?? []) as unknown as {
    profiles: { id: string; full_name: string } | null;
    academic_level: string | null;
  }[])
    .filter((e) => e.profiles !== null)
    .map((e) => ({
      id: e.profiles!.id,
      full_name: e.profiles!.full_name,
      academic_level: e.academic_level,
    }));
  if (students.length === 0) {
    return { ...empty, error: "Lớp chưa có học viên nào." };
  }

  const sourceByStudent = new Map(
    ((sourceRows ?? []) as ApplyRow[]).map((r) => [r.student_id, r])
  );
  const currentByStudent = new Map(
    ((currentRows ?? []) as ApplyRow[]).map((r) => [r.student_id, r])
  );

  const priorCommentsByStudent = new Map<string, string[]>();
  for (const row of (priorRows ?? []) as unknown as {
    student_id: string;
    ai_generated_comment: string | null;
    sessions: { session_number: number } | null;
  }[]) {
    const list = priorCommentsByStudent.get(row.student_id) ?? [];
    list.push(
      `Buổi ${row.sessions?.session_number}: ${row.ai_generated_comment}`
    );
    priorCommentsByStudent.set(row.student_id, list);
  }

  // --- Bước 1: gộp tích chọn rồi lưu (không đụng Gemini) ---
  const toUpsert: {
    session_id: string;
    student_id: string;
    strengths: string[];
    improvements: string[];
    is_absent: boolean;
    created_by: string;
  }[] = [];
  const applied: {
    studentId: string;
    studentName: string;
    strengths: string[];
    improvements: string[];
    academicLevel: string | null;
    hasComment: boolean;
  }[] = [];

  for (const student of students) {
    const current = currentByStudent.get(student.id) ?? null;
    if (current?.is_absent) continue; // đã đánh vắng buổi này — không nhận xét

    const source = sourceByStudent.get(student.id);
    if (!source || source.is_absent) continue;
    if (source.strengths.length === 0 && source.improvements.length === 0) {
      continue;
    }

    const strengths = mergeUnique(current?.strengths ?? [], source.strengths);
    const improvements = mergeUnique(
      current?.improvements ?? [],
      source.improvements
    );

    toUpsert.push({
      session_id: input.sessionId,
      student_id: student.id,
      strengths,
      improvements,
      is_absent: false,
      created_by: user.id,
    });
    applied.push({
      studentId: student.id,
      studentName: student.full_name,
      strengths,
      improvements,
      academicLevel: student.academic_level,
      hasComment: Boolean(current?.ai_generated_comment),
    });
  }

  if (toUpsert.length === 0) {
    return {
      ...empty,
      error: "Buổi nguồn chưa có tích chọn nào để áp sang (hoặc các em đã đánh vắng).",
    };
  }

  const { error: upsertError } = await supabase
    .from("student_reviews")
    .upsert(toUpsert, { onConflict: "session_id,student_id" });
  if (upsertError) {
    return { ...empty, error: `Không lưu được nhận xét: ${upsertError.message}` };
  }

  // --- Bước 2: gọi AI cho từng em (tích chọn đã an toàn trong DB) ---
  // Bỏ qua em đã có sẵn câu nhận xét — khỏi phí lượt Gemini khi bấm lại lần 2.
  const needComment = applied.filter((a) => !a.hasComment);
  const aiConfig = await getAiConfig();
  const sessionTitle =
    sessionData.title ?? `Buổi ${sessionData.session_number}`;

  // Chưa có OpenAI key (đang chọn OpenAI) → KHÔNG tự ý gọi bằng key khác, bỏ
  // qua bước AI nhưng tích chọn ở bước 1 vẫn đã lưu — báo rõ lý do trong `error`.
  let comments: { studentId: string; comment: string }[] = [];
  if (aiConfig.ok && needComment.length > 0) {
    const results = await Promise.allSettled(
      needComment.map(async (a) => {
        const data = await callAiService<{ comment: string }>("/generate-review", {
          api_key: aiConfig.api_key,
          provider: aiConfig.provider,
          student_name: a.studentName,
          session_title: sessionTitle,
          session_content: sessionData.content ?? "",
          strengths: a.strengths,
          improvements: a.improvements,
          session_context: sessionData.review_context || null,
          is_periodic_test: sessionData.is_periodic_test,
          test_process_notes: [],
          is_project_period: sessionData.is_project_period,
          project_progress_notes: [],
          previous_comment: null,
          prior_comments: (priorCommentsByStudent.get(a.studentId) ?? []).slice(
            -MAX_PRIOR_COMMENTS
          ),
          academic_level: academicLevelLabel(a.academicLevel),
        });
        return { studentId: a.studentId, comment: data.comment };
      })
    );

    comments = results
      .filter(
        (r): r is PromiseFulfilledResult<{ studentId: string; comment: string }> =>
          r.status === "fulfilled" && Boolean(r.value.comment)
      )
      .map((r) => r.value);
  }

  // Ghi từng câu một: `upsert` hàng loạt sẽ ghi đè cả strengths/improvements
  // vừa lưu ở bước 1 bằng giá trị mặc định của cột nếu thiếu khóa.
  await Promise.allSettled(
    comments.map((c) =>
      supabase
        .from("student_reviews")
        .update({ ai_generated_comment: c.comment })
        .eq("session_id", input.sessionId)
        .eq("student_id", c.studentId)
    )
  );

  revalidatePath(`/teacher/sessions/${input.sessionId}`);
  return {
    applied: toUpsert.length,
    generated: comments.length,
    aiFailed: needComment.length - comments.length,
    ...(!aiConfig.ok && needComment.length > 0 ? { error: aiConfig.error } : {}),
  };
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

  const aiConfig = await getAiConfig();
  if (!aiConfig.ok) {
    return { error: aiConfig.error };
  }

  try {
    const summary = await callAiService<StudentSummary>(
      "/generate-student-summary",
      {
        api_key: aiConfig.api_key,
        provider: aiConfig.provider,
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
  /** Buổi có làm sản phẩm cuối khóa (SPCK, thường buổi 9-13) — GV tự đánh dấu,
   *  giống `isPeriodicTest`. */
  isProjectPeriod?: boolean;
  /** Quan sát của GV về quá trình làm SPCK — chỉ gửi khi `isProjectPeriod`,
   *  KHÔNG lưu lại (giống `testProcessNotes`). */
  projectProgressNotes?: string[];
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

  const aiConfig = await getAiConfig();
  if (!aiConfig.ok) {
    return { error: aiConfig.error };
  }

  try {
    const data = await callAiService<{ comment: string }>("/generate-review", {
      api_key: aiConfig.api_key,
      provider: aiConfig.provider,
      student_name: input.studentName,
      session_title: input.sessionTitle,
      session_content: input.sessionContent,
      strengths: input.strengths,
      improvements: input.improvements,
      session_context: input.sessionContext || null,
      is_periodic_test: input.isPeriodicTest ?? false,
      test_process_notes: input.testProcessNotes ?? [],
      is_project_period: input.isProjectPeriod ?? false,
      project_progress_notes: input.projectProgressNotes ?? [],
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

export interface PriorReviewHistoryItem {
  session_number: number;
  session_title: string;
  strengths: string[];
  improvements: string[];
  comment?: string | null;
  is_absent?: boolean;
}

export interface GenerateFinalPresentationReviewInput {
  studentName: string;
  classCode: string;
  courseName: string;
  academicLevel?: string;
  projectName?: string;
  projectDescription?: string;
  projectFeatures?: string[];
  presentationNotes?: string;
  priorReviews?: PriorReviewHistoryItem[];
  currentStrengths?: string[];
  currentImprovements?: string[];
  isExam?: boolean;
  isPeriodicExam?: boolean;
  sessionNumber?: number;
}

/** Gọi AI tổng kết toàn khóa học và đánh giá buổi thuyết trình hoặc bài kiểm tra định kỳ / cuối khóa. */
export async function generateFinalPresentationReview(
  input: GenerateFinalPresentationReviewInput
): Promise<{ evaluation?: FinalPresentationEvaluation; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const aiConfig = await getAiConfig();
  if (!aiConfig.ok) {
    return { error: aiConfig.error };
  }

  try {
    const data = await callAiService<FinalPresentationEvaluation>(
      "/generate-final-presentation-review",
      {
        api_key: aiConfig.api_key,
        provider: aiConfig.provider,
        student_name: input.studentName,
        class_code: input.classCode,
        course_name: input.courseName,
        academic_level: input.academicLevel || null,
        project_name: input.projectName || null,
        project_description: input.projectDescription || null,
        project_features: input.projectFeatures ?? [],
        presentation_notes: input.presentationNotes || null,
        prior_reviews: input.priorReviews ?? [],
        current_strengths: input.currentStrengths ?? [],
        current_improvements: input.currentImprovements ?? [],
        is_exam: Boolean(input.isExam),
        is_periodic_exam: Boolean(input.isPeriodicExam),
        session_number: input.sessionNumber ?? null,
      }
    );
    return { evaluation: data };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return {
      error:
        "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy).",
    };
  }
}
