"use server";

import { revalidatePath } from "next/cache";

import type { SkillGroup } from "@/lib/skill-groups";
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

/**
 * Bộ mẫu dựng theo "chân dung học viên" hay gặp. Mỗi mẫu rút điểm mạnh/cải
 * thiện từ vài NHÓM KỸ NĂNG — lúc seed lấy chính nhãn trong danh mục của GV nên
 * áp xong khớp catalog. Bỏ nhóm `presentation` (tùy buổi mới dùng) và `other`.
 * Trải rộng để "tận dụng hết" 10 nhóm còn lại (yêu cầu user 2026-07-27).
 */
const COMBO_TEMPLATES: {
  name: string;
  strengthGroups: SkillGroup[];
  improvementGroups: SkillGroup[];
}[] = [
  { name: "Học tốt toàn diện", strengthGroups: ["thinking", "coding", "self_study"], improvementGroups: ["discipline"] },
  { name: "Tư duy tốt, cần cẩn thận", strengthGroups: ["thinking", "creativity"], improvementGroups: ["coding", "discipline"] },
  { name: "Chăm chỉ, nề nếp tốt", strengthGroups: ["attitude", "discipline"], improvementGroups: ["coding", "thinking"] },
  { name: "Giỏi code, ít hợp tác", strengthGroups: ["coding", "computer_skills"], improvementGroups: ["collaboration", "questioning"] },
  { name: "Sáng tạo, cần nền tảng", strengthGroups: ["creativity", "ai_usage"], improvementGroups: ["coding", "thinking"] },
  { name: "Chủ động hỏi, cần luyện thêm", strengthGroups: ["questioning", "attitude"], improvementGroups: ["self_study", "coding"] },
  { name: "Hợp tác tốt, cần tự tin hỏi", strengthGroups: ["collaboration", "attitude"], improvementGroups: ["questioning", "thinking"] },
  { name: "Thạo máy & AI, cần tư duy", strengthGroups: ["computer_skills", "ai_usage"], improvementGroups: ["thinking", "coding"] },
  { name: "Chăm nhưng còn chậm", strengthGroups: ["attitude", "discipline"], improvementGroups: ["coding", "computer_skills"] },
  { name: "Tự học tốt, cần hợp tác", strengthGroups: ["self_study", "thinking"], improvementGroups: ["collaboration", "discipline"] },
  { name: "Cần kèm thêm nền tảng", strengthGroups: ["attitude"], improvementGroups: ["coding", "thinking", "self_study"] },
];

/** Số nhãn tối đa lấy từ mỗi nhóm cho một bộ — giữ bộ đủ ý mà không quá dài. */
const MAX_LABELS_PER_GROUP = 2;

/**
 * Thêm nhanh loạt bộ mẫu (nút ở trang Cài đặt). Rút nhãn từ CHÍNH danh mục của
 * GV theo nhóm kỹ năng; bỏ qua bộ trùng tên (bấm nhiều lần không nhân đôi) và
 * bộ rỗng (nhóm tham chiếu chưa có nhãn nào).
 */
export async function seedDefaultCombos(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const [{ data: options }, { data: existing }] = await Promise.all([
    supabase
      .from("review_options")
      .select("category, label, skill_group")
      .eq("teacher_id", user.id)
      .order("label"),
    supabase.from("review_combos").select("name").eq("teacher_id", user.id),
  ]);

  if (!options || options.length === 0) {
    return {
      error:
        "Chưa có danh mục nhận xét — bấm “Thêm nhanh bộ lựa chọn mặc định” ở khối trên trước rồi mới tạo bộ mẫu.",
    };
  }

  // Gom nhãn theo "category:skill_group" để mỗi mẫu rút ra nhanh.
  const byKey = new Map<string, string[]>();
  for (const opt of options) {
    const key = `${opt.category}:${opt.skill_group}`;
    (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(opt.label);
  }
  const pick = (category: "strength" | "improvement", groups: SkillGroup[]) => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const group of groups) {
      for (const label of (byKey.get(`${category}:${group}`) ?? []).slice(
        0,
        MAX_LABELS_PER_GROUP
      )) {
        if (!seen.has(label.toLowerCase())) {
          seen.add(label.toLowerCase());
          result.push(label);
        }
      }
    }
    return result;
  };

  const existingNames = new Set(
    (existing ?? []).map((c) => c.name.toLowerCase())
  );

  const rows = COMBO_TEMPLATES.filter(
    (t) => !existingNames.has(t.name.toLowerCase())
  )
    .map((t) => ({
      teacher_id: user.id,
      name: t.name,
      strengths: pick("strength", t.strengthGroups),
      improvements: pick("improvement", t.improvementGroups),
    }))
    .filter((r) => r.strengths.length > 0 || r.improvements.length > 0);

  if (rows.length === 0) {
    return {
      success:
        "Không có bộ mẫu mới để thêm (có thể đã thêm trước đó, hoặc danh mục chưa đủ nhãn).",
    };
  }

  const { error } = await supabase.from("review_combos").insert(rows);
  if (error) {
    return { error: `Không thêm được bộ mẫu: ${error.message}` };
  }

  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/sessions/[id]", "page");
  return { success: `Đã thêm ${rows.length} bộ mẫu — xem và chỉnh bên dưới.` };
}
