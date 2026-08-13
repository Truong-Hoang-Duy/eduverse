"use server";

import { revalidatePath } from "next/cache";

import { SKILL_GROUPS, type CustomSkillGroupRow } from "@/lib/skill-groups";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/** Nhóm kỹ năng giáo viên đang đăng nhập tự thêm (RLS `review_skill_groups_teacher_all`
 *  đã giới hạn theo chủ). Đọc server-side để truyền xuống OptionManager/ReviewEditor. */
export async function listMySkillGroups(): Promise<CustomSkillGroupRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("review_skill_groups")
    .select("id, label")
    .eq("teacher_id", user.id)
    .order("created_at");
  return data ?? [];
}

export async function addSkillGroup(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const label = String(formData.get("label") ?? "").trim();

  if (!label) {
    return { error: "Nhập tên nhóm kỹ năng." };
  }
  if (label.length > 40) {
    return { error: "Tên nhóm kỹ năng tối đa 40 ký tự." };
  }
  if (SKILL_GROUPS.some((g) => g.label.toLowerCase() === label.toLowerCase())) {
    return { error: "Nhóm này đã có sẵn trong danh sách mặc định." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase
    .from("review_skill_groups")
    .insert({ teacher_id: user.id, label });
  if (error) {
    // unique(teacher_id, label)
    if (error.code === "23505") {
      return { error: "Bạn đã có nhóm kỹ năng này rồi." };
    }
    return { error: `Không thêm được: ${error.message}` };
  }

  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/sessions/[id]", "page");
  return { success: `Đã thêm nhóm "${label}".` };
}

/** Xóa nhóm kỹ năng tự thêm — các lựa chọn (`review_options`) đang thuộc nhóm
 *  này chuyển về "other" (📌 Khác) thay vì mất hoặc để tham chiếu treo, giống
 *  cách app xử lý xóa mềm ở chỗ khác (user chốt 2026-08-12). */
export async function deleteSkillGroup(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("review_options")
    .update({ skill_group: "other" })
    .eq("teacher_id", user.id)
    .eq("skill_group", id);

  // RLS đã chặn xóa nhóm của người khác; filter teacher_id thêm cho chắc.
  await supabase
    .from("review_skill_groups")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);

  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/sessions/[id]", "page");
}
