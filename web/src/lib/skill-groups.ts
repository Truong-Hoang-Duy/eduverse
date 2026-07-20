/** Nhóm kỹ năng của lựa chọn nhận xét (review_options.skill_group).
 *  Giá trị lưu DB là slug — khớp CHECK constraint trong migration
 *  20260723000000; đổi/thêm nhóm thì phải sửa cả constraint. */
export const SKILL_GROUPS = [
  { value: "thinking", label: "🧠 Tư duy" },
  { value: "coding", label: "💻 Kỹ năng code" },
  { value: "attitude", label: "🌱 Thái độ học tập" },
  { value: "collaboration", label: "🤝 Giao tiếp & hợp tác" },
  { value: "other", label: "📌 Khác" },
] as const;

export type SkillGroup = (typeof SKILL_GROUPS)[number]["value"];

export function skillGroupLabel(value: string): string {
  return SKILL_GROUPS.find((g) => g.value === value)?.label ?? "📌 Khác";
}
