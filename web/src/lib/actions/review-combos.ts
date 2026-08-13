"use server";

import { revalidatePath } from "next/cache";

import type { SkillGroup } from "@/lib/skill-groups";
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

/**
 * Bộ mẫu combo dựng sẵn — MỖI BỘ CHỈ MỘT LOẠI (yêu cầu user 2026-08-13, hồi
 * sinh có sửa lại tính năng đã gỡ ở `20260806000000`: bản cũ trộn cả điểm
 * mạnh lẫn cần cải thiện theo "chân dung học viên", giờ KHÔNG được trộn nữa
 * nên tách hẳn 2 danh sách theo `type`). Mỗi bộ rút nhãn từ 1-3 NHÓM KỸ NĂNG
 * — lúc seed lấy chính nhãn trong danh mục của GV nên áp xong khớp catalog.
 * Bỏ nhóm `presentation` khỏi các bộ gộp nhiều nhóm (tùy buổi mới dùng) và
 * `other` (catch-all); `presentation` vẫn có bộ riêng của nó.
 */
const STRENGTH_COMBO_TEMPLATES: { name: string; groups: SkillGroup[] }[] = [
  { name: "💪 Tư duy logic tốt", groups: ["thinking"] },
  { name: "💪 Sáng tạo, có ý tưởng riêng", groups: ["creativity"] },
  { name: "💪 Code sạch, chắc nền tảng", groups: ["coding"] },
  { name: "💪 Thao tác máy tính thành thạo", groups: ["computer_skills"] },
  { name: "💪 Vận dụng AI hiệu quả", groups: ["ai_usage"] },
  { name: "💪 Chủ động đặt câu hỏi", groups: ["questioning"] },
  { name: "💪 Thái độ học tập tốt", groups: ["attitude"] },
  { name: "💪 Kỷ luật, nề nếp tốt", groups: ["discipline"] },
  { name: "💪 Tự học, tự nghiên cứu tốt", groups: ["self_study"] },
  { name: "💪 Giao tiếp & hợp tác tốt", groups: ["collaboration"] },
  { name: "💪 Thuyết trình tự tin", groups: ["presentation"] },
  { name: "💪 Tư duy tốt, code chắc", groups: ["thinking", "coding"] },
  { name: "💪 Chăm chỉ, kỷ luật tốt", groups: ["attitude", "discipline"] },
  { name: "💪 Sáng tạo, thạo AI", groups: ["creativity", "ai_usage"] },
  { name: "💪 Tự học tốt, chủ động hỏi", groups: ["self_study", "questioning"] },
  { name: "💪 Học tốt toàn diện", groups: ["thinking", "coding", "self_study"] },
];

const IMPROVEMENT_COMBO_TEMPLATES: { name: string; groups: SkillGroup[] }[] = [
  { name: "🎯 Cần rèn tư duy logic", groups: ["thinking"] },
  { name: "🎯 Cần phát huy sáng tạo", groups: ["creativity"] },
  { name: "🎯 Cần luyện code cẩn thận hơn", groups: ["coding"] },
  { name: "🎯 Cần luyện thao tác máy tính", groups: ["computer_skills"] },
  { name: "🎯 Cần dùng AI đúng cách hơn", groups: ["ai_usage"] },
  { name: "🎯 Cần mạnh dạn đặt câu hỏi", groups: ["questioning"] },
  { name: "🎯 Cần cải thiện thái độ học tập", groups: ["attitude"] },
  { name: "🎯 Cần kỷ luật, tập trung hơn", groups: ["discipline"] },
  { name: "🎯 Cần tự học thêm ở nhà", groups: ["self_study"] },
  { name: "🎯 Cần hợp tác tốt hơn với bạn", groups: ["collaboration"] },
  { name: "🎯 Cần luyện thuyết trình", groups: ["presentation"] },
  { name: "🎯 Cần cẩn thận, kỷ luật hơn", groups: ["coding", "discipline"] },
  { name: "🎯 Cần tập trung & chủ động hơn", groups: ["attitude", "discipline"] },
  { name: "🎯 Cần rèn nền tảng & tự học", groups: ["thinking", "self_study"] },
  { name: "🎯 Cần mạnh dạn hỏi & hợp tác", groups: ["questioning", "collaboration"] },
  { name: "🎯 Cần rèn nền tảng toàn diện", groups: ["thinking", "coding", "self_study"] },
];

/** Số nhãn tối đa lấy từ mỗi nhóm cho một bộ — giữ bộ đủ ý mà không quá dài. */
const MAX_LABELS_PER_GROUP = 2;

/**
 * Thêm nhanh loạt bộ mẫu (nút ở trang Cài đặt, cả 2 cột Tích cực/Cải thiện).
 * Rút nhãn từ CHÍNH danh mục của GV theo nhóm kỹ năng; bỏ qua bộ trùng tên
 * (bấm nhiều lần không nhân đôi) và bộ rỗng (nhóm tham chiếu chưa có nhãn).
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
        "Chưa có danh mục nhận xét — bấm “Thêm nhanh bộ lựa chọn mặc định” ở khối “Danh mục nhận xét” phía trên trước rồi mới tạo bộ mẫu.",
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

  const strengthRows = STRENGTH_COMBO_TEMPLATES.filter(
    (t) => !existingNames.has(t.name.toLowerCase())
  ).map((t) => ({
    teacher_id: user.id,
    name: t.name,
    type: "strength" as const,
    strengths: pick("strength", t.groups),
    improvements: [],
  }));
  const improvementRows = IMPROVEMENT_COMBO_TEMPLATES.filter(
    (t) => !existingNames.has(t.name.toLowerCase())
  ).map((t) => ({
    teacher_id: user.id,
    name: t.name,
    type: "improvement" as const,
    strengths: [],
    improvements: pick("improvement", t.groups),
  }));

  const rows = [...strengthRows, ...improvementRows].filter(
    (r) => r.strengths.length > 0 || r.improvements.length > 0
  );

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
