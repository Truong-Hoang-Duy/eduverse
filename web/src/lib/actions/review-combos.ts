"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export type ReviewComboType = "strength" | "improvement";

export interface ReviewCombo {
  id: string;
  name: string;
  type: ReviewComboType;
  strengths: string[];
  improvements: string[];
}

function asComboType(value: string): ReviewComboType | null {
  return value === "strength" || value === "improvement" ? value : null;
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
    .select("id, name, type, strengths, improvements")
    .eq("teacher_id", user.id)
    .order("created_at");
  return (data ?? []) as ReviewCombo[];
}

export async function createReviewCombo(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const type = asComboType(String(formData.get("type") ?? ""));
  // Bộ CHỈ một loại (yêu cầu user 2026-08-06) — chỉ đọc mảng khớp `type`, mảng
  // còn lại (nếu form lỡ gửi kèm) bị bỏ qua hẳn, không lưu lẫn vào.
  const labels =
    type === "strength"
      ? formData.getAll("strengths").map(String)
      : formData.getAll("improvements").map(String);

  if (!type) {
    return { error: "Chọn bộ này là Tích cực hay Cải thiện." };
  }
  if (!name) {
    return { error: "Đặt tên cho bộ combo." };
  }
  if (name.length > 60) {
    return { error: "Tên bộ combo tối đa 60 ký tự." };
  }
  if (labels.length === 0) {
    return {
      error:
        type === "strength"
          ? "Chọn ít nhất một điểm mạnh rồi mới lưu bộ."
          : "Chọn ít nhất một điểm cần cải thiện rồi mới lưu bộ.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase.from("review_combos").insert({
    teacher_id: user.id,
    name,
    type,
    strengths: type === "strength" ? labels : [],
    improvements: type === "improvement" ? labels : [],
  });
  if (error) {
    return { error: `Không lưu được bộ: ${error.message}` };
  }

  // Combos tạo/xóa ở Cài đặt, áp ở trang buổi học → revalidate cả hai. Route
  // buổi học động nên dùng mẫu "[id]" + "page" để mọi buổi cập nhật.
  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/sessions/[id]", "page");
  return { success: `Đã lưu bộ "${name}".` };
}

export async function updateReviewCombo(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = asComboType(String(formData.get("type") ?? ""));
  // Loại KHÔNG đổi được lúc sửa (xem combo-manager.tsx) — vẫn đọc lại từ form
  // ẩn để validate/insert đúng cột như lúc tạo.
  const labels =
    type === "strength"
      ? formData.getAll("strengths").map(String)
      : formData.getAll("improvements").map(String);

  if (!id || !type) {
    return { error: "Thiếu thông tin bộ combo." };
  }
  if (!name) {
    return { error: "Đặt tên cho bộ combo." };
  }
  if (name.length > 60) {
    return { error: "Tên bộ combo tối đa 60 ký tự." };
  }
  if (labels.length === 0) {
    return {
      error:
        type === "strength"
          ? "Chọn ít nhất một điểm mạnh rồi mới lưu bộ."
          : "Chọn ít nhất một điểm cần cải thiện rồi mới lưu bộ.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  // RLS (`review_combos_teacher_all`) đã chặn sửa bộ của người khác — filter
  // thêm teacher_id chỉ để chắc chắn không update nhầm row nào ngoài của mình.
  const { error } = await supabase
    .from("review_combos")
    .update({
      name,
      strengths: type === "strength" ? labels : [],
      improvements: type === "improvement" ? labels : [],
    })
    .eq("id", id)
    .eq("teacher_id", user.id);
  if (error) {
    return { error: `Không lưu được bộ: ${error.message}` };
  }

  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/sessions/[id]", "page");
  return { success: `Đã cập nhật bộ "${name}".` };
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
