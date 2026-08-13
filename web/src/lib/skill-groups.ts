/** Nhóm kỹ năng của lựa chọn nhận xét (review_options.skill_group).
 *  12 nhóm dưới đây là NỀN cố định, dùng chung mọi giáo viên — giá trị lưu DB
 *  là slug. Từ 2026-08-12, giáo viên có thể tự thêm nhóm riêng (bảng
 *  `review_skill_groups`, xem `lib/actions/skill-groups.ts`) — value của nhóm
 *  tự thêm là `id` (uuid) của dòng đó, không đụng tới danh sách slug cố định
 *  ở đây nên không cần sửa CHECK constraint nữa. */
export const SKILL_GROUPS = [
  { value: "thinking", label: "🧠 Tư duy" },
  { value: "creativity", label: "✨ Sáng tạo" },
  { value: "coding", label: "💻 Kỹ năng code" },
  { value: "computer_skills", label: "🖥️ Kỹ năng sử dụng máy tính" },
  { value: "ai_usage", label: "🤖 Vận dụng AI" },
  { value: "questioning", label: "❓ Đặt câu hỏi" },
  { value: "attitude", label: "🌱 Thái độ học tập" },
  { value: "discipline", label: "⏰ Kỷ luật / Nề nếp" },
  { value: "self_study", label: "📚 Tự học / Nghiên cứu thêm" },
  { value: "collaboration", label: "🤝 Giao tiếp & hợp tác" },
  { value: "presentation", label: "🎤 Thuyết trình" },
  { value: "other", label: "📌 Khác" },
] as const;

export type SkillGroup = (typeof SKILL_GROUPS)[number]["value"];

export interface SkillGroupOption {
  value: string;
  label: string;
}

/** Nhóm kỹ năng giáo viên tự thêm — dòng thô từ bảng `review_skill_groups`. */
export interface CustomSkillGroupRow {
  id: string;
  label: string;
}

/** Gộp 12 nhóm cố định với nhóm giáo viên tự thêm, GIỮ thứ tự (nền trước, tự
 *  thêm sau theo thứ tự tạo) để nơi hiển thị (accordion, combo box lọc) lặp
 *  qua đúng một danh sách duy nhất. */
export function mergeSkillGroups(
  customGroups: CustomSkillGroupRow[]
): SkillGroupOption[] {
  return [
    ...SKILL_GROUPS,
    ...customGroups.map((g) => ({ value: g.id, label: g.label })),
  ];
}

export function skillGroupLabel(
  value: string,
  customGroups: CustomSkillGroupRow[] = []
): string {
  const builtin = SKILL_GROUPS.find((g) => g.value === value);
  if (builtin) return builtin.label;
  const custom = customGroups.find((g) => g.id === value);
  return custom?.label ?? "📌 Khác";
}
