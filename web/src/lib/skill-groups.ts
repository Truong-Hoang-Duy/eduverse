/** Nhóm kỹ năng của lựa chọn nhận xét (review_options.skill_group).
 *  Giá trị lưu DB là slug — khớp CHECK constraint trong migration
 *  20260723000000 + 20260724000000 ('presentation') + 20260725000000 (6 nhóm
 *  mới); đổi/thêm nhóm thì phải sửa cả constraint. */
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

export function skillGroupLabel(value: string): string {
  return SKILL_GROUPS.find((g) => g.value === value)?.label ?? "📌 Khác";
}
