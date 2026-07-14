"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const VALID_CATEGORIES = ["strength", "improvement"] as const;

// ---------- Danh mục nhận xét (review_options) ----------

export async function addReviewOption(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const category = String(formData.get("category") ?? "");
  const label = String(formData.get("label") ?? "").trim();

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
    .insert({ teacher_id: user.id, category, label });
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

const DEFAULT_STRENGTHS = [
  "Tiếp thu nhanh",
  "Tích cực phát biểu",
  "Hoàn thành tốt bài tập trên lớp",
  "Biết giúp đỡ bạn bè",
  "Sáng tạo, chủ động thử cách làm mới",
  "Tập trung nghe giảng",
];

const DEFAULT_IMPROVEMENTS = [
  "Cần tập trung hơn trong giờ học",
  "Cần luyện gõ phím / thao tác máy",
  "Đặt tên biến rõ nghĩa hơn",
  "Cần hoàn thành bài tập về nhà",
  "Mạnh dạn hỏi khi chưa hiểu",
  "Cẩn thận hơn để tránh lỗi chính tả trong code",
];

/** Thêm nhanh bộ lựa chọn mặc định cho giáo viên mới. */
export async function seedDefaultOptions(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = [
    ...DEFAULT_STRENGTHS.map((label) => ({
      teacher_id: user.id,
      category: "strength",
      label,
    })),
    ...DEFAULT_IMPROVEMENTS.map((label) => ({
      teacher_id: user.id,
      category: "improvement",
      label,
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
