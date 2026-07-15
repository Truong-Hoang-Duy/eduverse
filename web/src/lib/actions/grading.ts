"use server";

import { revalidatePath } from "next/cache";

import { AiServiceError, callAiService } from "@/lib/ai-client";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// ---------- Đề bài (assignments) — thứ DUY NHẤT được lưu ----------

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

// ---------- Chấm bài — KHÔNG lưu gì, chỉ trả kết quả để copy ----------

export interface GradeInputFile {
  name: string;
  mimeType: string;
  contentB64: string;
}

export interface GradeResult {
  score: number;
  bullets: string[];
}

/**
 * Chấm bài làm của 1 học sinh. File gửi thẳng nội dung sang ai-service,
 * không upload Storage, không ghi DB — tải lại trang là mất kết quả.
 */
export async function gradeFiles(input: {
  assignmentId: string;
  files: GradeInputFile[];
}): Promise<{ grade?: GradeResult; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }
  if (input.files.length === 0) {
    return { error: "Chưa chọn file bài làm." };
  }

  // RLS chỉ cho giáo viên của khóa đọc được đề này.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("title, instructions, spec_file_path, courses(name)")
    .eq("id", input.assignmentId)
    .single();
  if (!assignment) {
    return { error: "Không tìm thấy đề bài." };
  }
  if (!assignment.spec_file_path) {
    return { error: "Đề bài chưa có file — tạo lại đề với file đính kèm." };
  }

  try {
    const grade = await callAiService<GradeResult>("/grade-submission", {
      spec_file_path: assignment.spec_file_path,
      files: input.files.map((f) => ({
        name: f.name,
        mime_type: f.mimeType || null,
        content_b64: f.contentB64,
      })),
      course_name:
        (assignment.courses as unknown as { name: string } | null)?.name ?? "",
      assignment_title: assignment.title,
      instructions: assignment.instructions,
    });
    return { grade };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return {
      error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy).",
    };
  }
}
