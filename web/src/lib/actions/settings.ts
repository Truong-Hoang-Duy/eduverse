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

// Bộ mặc định viết lại 2026-07-18 (Đợt 15: 6+6 → 15+13), mở rộng thêm
// 2026-07-18 (Đợt 16: thêm 6 nhóm mới, migration 20260725000000) — chia đủ
// 11/12 nhóm skill_group (bỏ 'other' vì là catch-all, không cần default).
const DEFAULT_STRENGTHS: [string, SkillGroup][] = [
  ["Tư duy logic tốt", "thinking"],
  ["Biết phân tích đề bài trước khi bắt tay code", "thinking"],
  ["Hiểu bài nhanh, nắm được bản chất vấn đề", "thinking"],
  ["Sáng tạo, chủ động thử cách làm mới", "creativity"],
  ["Có ý tưởng độc đáo, khác biệt", "creativity"],
  ["Không rập khuôn, thích thử nghiệm cái mới", "creativity"],
  ["Code sạch, dễ đọc", "coding"],
  ["Nắm vững cú pháp đã học", "coding"],
  ["Tự tìm ra và sửa được lỗi (debug tốt)", "coding"],
  ["Thao tác máy tính thành thạo", "computer_skills"],
  ["Gõ phím nhanh, chính xác", "computer_skills"],
  ["Biết sử dụng phím tắt hiệu quả", "computer_skills"],
  ["Biết đặt câu hỏi rõ ràng, hiệu quả khi dùng AI hỗ trợ", "ai_usage"],
  ["Biết dùng AI để hiểu bài, không chỉ để có đáp án", "ai_usage"],
  ["Biết kiểm tra lại kết quả AI đưa ra trước khi dùng", "ai_usage"],
  ["Chủ động hỏi khi cần", "questioning"],
  ["Đặt câu hỏi đúng trọng tâm", "questioning"],
  ["Câu hỏi thể hiện đã suy nghĩ trước khi hỏi", "questioning"],
  ["Tập trung nghe giảng", "attitude"],
  ["Chăm chỉ luyện tập thêm ở nhà", "attitude"],
  ["Tích cực phát biểu xây dựng bài", "attitude"],
  ["Đi học đúng giờ, đầy đủ", "discipline"],
  ["Giữ trật tự, không gây ồn trong giờ học", "discipline"],
  ["Tuân thủ nội quy lớp học", "discipline"],
  ["Chủ động tìm hiểu thêm kiến thức ngoài bài giảng", "self_study"],
  ["Biết tự tra cứu tài liệu để giải quyết vấn đề", "self_study"],
  ["Ham học hỏi, hay đặt câu hỏi mở rộng bài học", "self_study"],
  ["Biết giúp đỡ bạn bè", "collaboration"],
  ["Trình bày ý tưởng rõ ràng cho người khác hiểu", "collaboration"],
  ["Lắng nghe góp ý tốt", "collaboration"],
  ["Trình bày tự tin, rõ ràng", "presentation"],
  ["Demo sản phẩm mạch lạc, đúng trọng tâm", "presentation"],
  ["Trả lời câu hỏi tốt", "presentation"],
];

const DEFAULT_IMPROVEMENTS: [string, SkillGroup][] = [
  ["Cần suy nghĩ kỹ đề bài trước khi bắt tay code", "thinking"],
  ["Nên thử nhiều cách giải quyết khác nhau", "thinking"],
  ["Cần ôn lại kiến thức nền tảng", "thinking"],
  ["Nên mạnh dạn thử ý tưởng mới thay vì làm theo mẫu có sẵn", "creativity"],
  ["Cần phát huy sự sáng tạo trong bài làm", "creativity"],
  ["Đặt tên biến rõ nghĩa hơn", "coding"],
  ["Chú ý căn lề, định dạng code", "coding"],
  ["Cẩn thận hơn để tránh lỗi chính tả trong code", "coding"],
  ["Cần luyện gõ phím / thao tác máy nhanh hơn", "computer_skills"],
  ["Cần làm quen thêm với các công cụ/phần mềm hỗ trợ", "computer_skills"],
  ["Không nên phụ thuộc hoàn toàn vào AI, cần tự suy nghĩ trước", "ai_usage"],
  ["Cần kiểm tra lại kết quả AI trả về thay vì copy nguyên", "ai_usage"],
  ["Nên học cách đặt câu hỏi cho AI rõ ràng hơn", "ai_usage"],
  ["Mạnh dạn hỏi khi chưa hiểu", "questioning"],
  ["Nên hỏi cụ thể hơn thay vì hỏi chung chung", "questioning"],
  ["Nên hỏi ngay khi thắc mắc, đừng để dồn lại", "questioning"],
  ["Cần tập trung hơn trong giờ học", "attitude"],
  ["Cần hoàn thành bài tập về nhà", "attitude"],
  ["Cần đi học đúng giờ hơn", "discipline"],
  ["Cần giữ trật tự hơn trong giờ học", "discipline"],
  ["Nên chủ động tìm hiểu thêm ngoài giờ học", "self_study"],
  ["Cần rèn thói quen tự học ở nhà", "self_study"],
  ["Nên chủ động trao đổi với bạn học hơn", "collaboration"],
  ["Cần luyện nói to, rõ ràng hơn", "presentation"],
  ["Nên chuẩn bị kỹ nội dung trước khi trình bày", "presentation"],
  ["Cần bình tĩnh, tự tin hơn khi thuyết trình", "presentation"],
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
