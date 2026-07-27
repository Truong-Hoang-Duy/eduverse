"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export interface ReviewCombo {
  id: string;
  name: string;
  strengths: string[];
  improvements: string[];
}

/** Bộ combo lưu sẵn của GV đang đăng nhập (RLS `review_combos_teacher_all` đã
 *  giới hạn theo chủ). Đọc server-side để trang buổi học truyền xuống editor. */
export async function listMyCombos(): Promise<ReviewCombo[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("review_combos")
    .select("id, name, strengths, improvements")
    .eq("teacher_id", user.id)
    .order("created_at");
  return (data ?? []) as ReviewCombo[];
}

export async function createReviewCombo(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const strengths = formData.getAll("strengths").map(String);
  const improvements = formData.getAll("improvements").map(String);

  if (!name) {
    return { error: "Đặt tên cho bộ combo." };
  }
  if (name.length > 60) {
    return { error: "Tên bộ combo tối đa 60 ký tự." };
  }
  if (strengths.length === 0 && improvements.length === 0) {
    return { error: "Chọn ít nhất một điểm mạnh hoặc cần cải thiện rồi mới lưu bộ." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase
    .from("review_combos")
    .insert({ teacher_id: user.id, name, strengths, improvements });
  if (error) {
    return { error: `Không lưu được bộ: ${error.message}` };
  }

  // Combos tạo/xóa ở Cài đặt, áp ở trang buổi học → revalidate cả hai. Route
  // buổi học động nên dùng mẫu "[id]" + "page" để mọi buổi cập nhật.
  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/sessions/[id]", "page");
  return { success: `Đã lưu bộ "${name}".` };
}

export async function deleteReviewCombo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // RLS đã chặn xóa bộ của người khác; không cần kiểm thêm.
  await supabase.from("review_combos").delete().eq("id", id);
  // Combos tạo/xóa ở Cài đặt, áp ở trang buổi học → revalidate cả hai. Route
  // buổi học động nên dùng mẫu "[id]" + "page" để mọi buổi cập nhật.
  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/sessions/[id]", "page");
}
