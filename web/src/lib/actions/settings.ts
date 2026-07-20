"use server";

import { revalidatePath } from "next/cache";

import { SKILL_GROUPS, type SkillGroup } from "@/lib/skill-groups";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const VALID_CATEGORIES = ["strength", "improvement"] as const;

function asSkillGroup(value: string): SkillGroup {
  return SKILL_GROUPS.some((g) => g.value === value)
    ? (value as SkillGroup)
    : "other";
}

// ---------- Danh mục nhận xét (review_options) ----------

export async function addReviewOption(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const category = String(formData.get("category") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const skillGroup = asSkillGroup(String(formData.get("skill_group") ?? ""));

  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return { error: "Danh mục không hợp lệ." };
  }
  if (!label) {
    return { error: "Nhập nội dung lựa chọn." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase
    .from("review_options")
    .insert({ teacher_id: user.id, category, label, skill_group: skillGroup });
  if (error) {
    return { error: `Không thêm được: ${error.message}` };
  }

  revalidatePath("/teacher/settings");
  return { success: "Đã thêm." };
}

export async function deleteReviewOption(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("review_options").delete().eq("id", id);
  revalidatePath("/teacher/settings");
}

const DEFAULT_STRENGTHS: [string, SkillGroup][] = [
  ["Tiếp thu nhanh", "thinking"],
  ["Tích cực phát biểu", "attitude"],
  ["Hoàn thành tốt bài tập trên lớp", "coding"],
  ["Biết giúp đỡ bạn bè", "collaboration"],
  ["Sáng tạo, chủ động thử cách làm mới", "thinking"],
  ["Tập trung nghe giảng", "attitude"],
];

const DEFAULT_IMPROVEMENTS: [string, SkillGroup][] = [
  ["Cần tập trung hơn trong giờ học", "attitude"],
  ["Cần luyện gõ phím / thao tác máy", "coding"],
  ["Đặt tên biến rõ nghĩa hơn", "coding"],
  ["Cần hoàn thành bài tập về nhà", "attitude"],
  ["Mạnh dạn hỏi khi chưa hiểu", "collaboration"],
  ["Cẩn thận hơn để tránh lỗi chính tả trong code", "coding"],
];

/** Thêm nhanh bộ lựa chọn mặc định cho giáo viên mới. */
export async function seedDefaultOptions(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = [
    ...DEFAULT_STRENGTHS.map(([label, skill_group]) => ({
      teacher_id: user.id,
      category: "strength",
      label,
      skill_group,
    })),
    ...DEFAULT_IMPROVEMENTS.map(([label, skill_group]) => ({
      teacher_id: user.id,
      category: "improvement",
      label,
      skill_group,
    })),
  ];
  await supabase.from("review_options").insert(rows);
  revalidatePath("/teacher/settings");
}

// ---------- Mẫu tin Zalo (zalo_templates) ----------

export async function addZaloTemplate(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const templateText = String(formData.get("template_text") ?? "").trim();

  if (!name || !templateText) {
    return { error: "Nhập tên mẫu và nội dung mẫu." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase
    .from("zalo_templates")
    .insert({ teacher_id: user.id, name, template_text: templateText });
  if (error) {
    return { error: `Không thêm được: ${error.message}` };
  }

  revalidatePath("/teacher/settings");
  return { success: "Đã lưu mẫu tin." };
}

export async function deleteZaloTemplate(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("zalo_templates").delete().eq("id", id);
  revalidatePath("/teacher/settings");
}

const DEFAULT_TEMPLATE = `📢 THÔNG BÁO LỚP {ten_lop} — {buoi}

Kính gửi quý phụ huynh,

{tom_tat}

💌 Lời nhắn: {loi_nhan}

Cảm ơn quý phụ huynh đã đồng hành cùng lớp! 🌟`;

/** Thêm mẫu tin Zalo mặc định. */
export async function seedDefaultTemplate(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("zalo_templates").insert({
    teacher_id: user.id,
    name: "Mẫu thông báo phụ huynh",
    template_text: DEFAULT_TEMPLATE,
  });
  revalidatePath("/teacher/settings");
}
