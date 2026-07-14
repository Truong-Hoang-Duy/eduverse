"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function updateSession(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const sessionDate = String(formData.get("session_date") ?? "").trim();

  if (!id) {
    return { error: "Thiếu thông tin buổi học." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({
      title: title || null,
      content: content || null,
      session_date: sessionDate || null,
    })
    .eq("id", id);
  if (error) {
    return { error: `Không lưu được: ${error.message}` };
  }

  revalidatePath(`/teacher/sessions/${id}`);
  return { success: "Đã lưu nội dung buổi học." };
}
