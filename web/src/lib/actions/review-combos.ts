"use server";

import { revalidatePath } from "next/cache";

import {
  COMBO_TEMPLATES,
  LABELS_PER_GROUP,
  pickRotating,
  rotateSlice,
} from "@/lib/review-combo-templates";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export interface ReviewCombo {
  id: string;
  name: string;
  strengths: string[];
  improvements: string[];
  /** Quan sát SPCK — chỉ dùng ở buổi có đánh dấu làm sản phẩm cuối khóa. */
  projectNotes: string[];
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
    .select("id, name, strengths, improvements, project_notes")
    .eq("teacher_id", user.id)
    .order("name");
  return ((data ?? []) as unknown as {
    id: string;
    name: string;
    strengths: string[];
    improvements: string[];
    project_notes: string[];
  }[]).map((c) => ({
    id: c.id,
    name: c.name,
    strengths: c.strengths,
    improvements: c.improvements,
    projectNotes: c.project_notes,
  }));
}

/** Đọc 3 mảng nhãn từ form. Một bộ giờ chứa CẢ BA (không chia loại nữa) — ô
 *  nào GV để trống thì lưu mảng rỗng, áp bộ chỉ điền ô có nội dung. */
function labelsFromForm(formData: FormData) {
  return {
    strengths: formData.getAll("strengths").map(String),
    improvements: formData.getAll("improvements").map(String),
    project_notes: formData.getAll("project_notes").map(String),
  };
}

const EMPTY_COMBO_ERROR =
  "Chọn ít nhất một nhãn (điểm mạnh, cần cải thiện hoặc SPCK) rồi mới lưu bộ.";

export async function createReviewCombo(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const labels = labelsFromForm(formData);

  if (!name) {
    return { error: "Đặt tên cho bộ combo." };
  }
  if (name.length > 60) {
    return { error: "Tên bộ combo tối đa 60 ký tự." };
  }
  if (
    labels.strengths.length === 0 &&
    labels.improvements.length === 0 &&
    labels.project_notes.length === 0
  ) {
    return { error: EMPTY_COMBO_ERROR };
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
    .insert({ teacher_id: user.id, name, ...labels });
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
  const labels = labelsFromForm(formData);

  if (!id) {
    return { error: "Thiếu thông tin bộ combo." };
  }
  if (!name) {
    return { error: "Đặt tên cho bộ combo." };
  }
  if (name.length > 60) {
    return { error: "Tên bộ combo tối đa 60 ký tự." };
  }
  if (
    labels.strengths.length === 0 &&
    labels.improvements.length === 0 &&
    labels.project_notes.length === 0
  ) {
    return { error: EMPTY_COMBO_ERROR };
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
    .update({ name, ...labels })
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
 * Thêm nhanh loạt bộ mẫu chân dung (xem `review-combo-templates.ts`). Rút nhãn
 * từ CHÍNH danh mục của GV nên áp xong khớp catalog; bỏ qua bộ trùng tên (bấm
 * nhiều lần không nhân đôi) và bộ rỗng (các nhóm nó tham chiếu chưa có nhãn).
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
  // Danh mục SPCK không chia nhóm kỹ năng — gom mọi skill_group về một rổ.
  const projectPool = options
    .filter((o) => o.category === "project_progress")
    .map((o) => o.label);

  const existingNames = new Set(
    (existing ?? []).map((c) => c.name.toLowerCase())
  );

  // Offset lấy theo vị trí trong COMBO_TEMPLATES (map TRƯỚC, lọc SAU): một bộ
  // mẫu luôn rút đúng bộ nhãn đó dù seed lại sau khi đã xóa bớt bộ khác.
  const rows = COMBO_TEMPLATES.map((t, index) => ({
    teacher_id: user.id,
    name: t.name,
    strengths: t.strengths
      ? pickRotating(byKey, "strength", t.strengths, index)
      : [],
    improvements: t.improvements
      ? pickRotating(byKey, "improvement", t.improvements, index)
      : [],
    project_notes: t.project
      ? rotateSlice(projectPool, index * 2, LABELS_PER_GROUP)
      : [],
  }))
    .filter((r) => !existingNames.has(r.name.toLowerCase()))
    .filter(
      (r) =>
        r.strengths.length > 0 ||
        r.improvements.length > 0 ||
        r.project_notes.length > 0
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

/** Dọn sạch để làm lại từ đầu — cho GV bỏ loạt bộ cũ không dùng rồi seed bộ
 *  chân dung mới (yêu cầu user 2026-08-28 "xóa những cái không dùng đi"). Chỉ
 *  xóa bộ của CHÍNH GV; nhận xét đã lưu của học viên không đụng tới. */
export async function deleteAllReviewCombos(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase
    .from("review_combos")
    .delete()
    .eq("teacher_id", user.id);
  if (error) {
    return { error: `Không xóa được: ${error.message}` };
  }

  revalidatePath("/teacher/settings");
  revalidatePath("/teacher/sessions/[id]", "page");
  return { success: "Đã xóa toàn bộ bộ combo. Bấm “Thêm nhanh bộ mẫu” để dựng lại." };
}
