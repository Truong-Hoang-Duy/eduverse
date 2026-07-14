"use server";

import { revalidatePath } from "next/cache";

import { AiServiceError, callAiService } from "@/lib/ai-client";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function saveReview(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const sessionId = String(formData.get("session_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const strengths = formData.getAll("strengths").map(String);
  const improvements = formData.getAll("improvements").map(String);
  const advice = String(formData.get("advice") ?? "").trim();
  const aiComment = String(formData.get("ai_comment") ?? "").trim();

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

  const { error } = await supabase.from("student_reviews").upsert(
    {
      session_id: sessionId,
      student_id: studentId,
      strengths,
      improvements,
      advice: advice || null,
      ai_generated_comment: aiComment || null,
      created_by: user.id,
    },
    { onConflict: "session_id,student_id" }
  );
  if (error) {
    return { error: `Không lưu được nhận xét: ${error.message}` };
  }

  revalidatePath(`/teacher/sessions/${sessionId}`);
  return { success: "Đã lưu nhận xét." };
}

export interface GenerateReviewInput {
  studentName: string;
  sessionTitle: string;
  sessionContent: string;
  strengths: string[];
  improvements: string[];
  adviceHint?: string;
  previousComment?: string;
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
      student_name: input.studentName,
      session_title: input.sessionTitle,
      session_content: input.sessionContent,
      strengths: input.strengths,
      improvements: input.improvements,
      advice_hint: input.adviceHint || null,
      previous_comment: input.previousComment || null,
    });
    return { comment: data.comment };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return { error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy)." };
  }
}
