"use server";

import { revalidatePath } from "next/cache";

import { AiServiceError, callAiService } from "@/lib/ai-client";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// ---------- Đề bài (assignments) ----------

export async function createAssignment(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const courseId = String(formData.get("course_id") ?? "");
  const sessionNumber = Number(formData.get("session_number") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const specFilePath = String(formData.get("spec_file_path") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();

  if (!courseId || !sessionNumber || !title) {
    return { error: "Vui lòng chọn khóa, số buổi và nhập tiêu đề." };
  }
  if (!specFilePath) {
    return { error: "Chưa upload file đề bài." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    course_id: courseId,
    session_number: sessionNumber,
    title,
    spec_file_path: specFilePath,
    instructions: instructions || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: `Buổi ${sessionNumber} của khóa này đã có đề — mỗi buổi một đề.` };
    }
    return { error: `Không tạo được đề: ${error.message}` };
  }

  revalidatePath("/teacher/assignments");
  return { success: `Đã tạo đề cho buổi ${sessionNumber}.` };
}

export async function deleteAssignment(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("assignments").delete().eq("id", id);
  revalidatePath("/teacher/assignments");
}

// ---------- Bài nộp (submissions) ----------

/** Lưu submission sau khi client đã upload file lên Storage. */
export async function saveSubmission(input: {
  assignmentId: string;
  classId: string;
  studentId: string;
  filePaths: string[];
}): Promise<{ submissionId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }
  if (input.filePaths.length === 0) {
    return { error: "Chưa có file bài làm." };
  }

  const { data, error } = await supabase
    .from("submissions")
    .upsert(
      {
        assignment_id: input.assignmentId,
        class_id: input.classId,
        student_id: input.studentId,
        code_file_paths: input.filePaths,
        uploaded_by: user.id,
      },
      { onConflict: "assignment_id,student_id" }
    )
    .select("id")
    .single();
  if (error) {
    return { error: `Không lưu được bài: ${error.message}` };
  }
  return { submissionId: data.id };
}

// ---------- Chấm bài ----------

export interface CriterionScore {
  criterion: string;
  score: number;
  max: number;
}

export interface GradeResult {
  gradeId: string;
  score: number;
  criteria: CriterionScore[];
  comment: string;
}

/** Chấm 1 bài bằng AI rồi lưu vào bảng grades (ghi đè nếu chấm lại). */
export async function gradeSubmission(
  submissionId: string
): Promise<{ grade?: GradeResult; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { data: sub } = await supabase
    .from("submissions")
    .select(
      "id, code_file_paths, assignments(title, instructions, spec_file_path, courses(name)), profiles!submissions_student_id_fkey(full_name)"
    )
    .eq("id", submissionId)
    .single();
  if (!sub) {
    return { error: "Không tìm thấy bài nộp." };
  }

  const assignment = sub.assignments as unknown as {
    title: string;
    instructions: string | null;
    spec_file_path: string | null;
    courses: { name: string } | null;
  } | null;
  const student = sub.profiles as unknown as { full_name: string } | null;

  if (!assignment?.spec_file_path) {
    return { error: "Đề bài chưa có file — upload file đề trước." };
  }

  try {
    const data = await callAiService<{
      score: number;
      criteria_breakdown: CriterionScore[];
      comment: string;
    }>("/grade-submission", {
      spec_file_path: assignment.spec_file_path,
      code_file_paths: sub.code_file_paths,
      course_name: assignment.courses?.name ?? "",
      assignment_title: assignment.title,
      instructions: assignment.instructions,
      student_name: student?.full_name ?? "Học viên",
    });

    const { data: saved, error: saveErr } = await supabase
      .from("grades")
      .upsert(
        {
          submission_id: submissionId,
          score: data.score,
          criteria_breakdown: data.criteria_breakdown as unknown as Json,
          ai_comment: data.comment,
          graded_at: new Date().toISOString(),
        },
        { onConflict: "submission_id" }
      )
      .select("id")
      .single();
    if (saveErr) {
      return { error: `AI chấm xong nhưng không lưu được: ${saveErr.message}` };
    }

    return {
      grade: {
        gradeId: saved.id,
        score: data.score,
        criteria: data.criteria_breakdown,
        comment: data.comment,
      },
    };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return { error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy)." };
  }
}

/** GV sửa tay điểm / nhận xét trước khi chốt. */
export async function updateGrade(input: {
  gradeId: string;
  score: number;
  comment: string;
}): Promise<{ error?: string }> {
  if (input.score < 0 || input.score > 100) {
    return { error: "Điểm phải từ 0 đến 100." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("grades")
    .update({ score: input.score, ai_comment: input.comment })
    .eq("id", input.gradeId);
  if (error) {
    return { error: `Không lưu được: ${error.message}` };
  }
  return {};
}
