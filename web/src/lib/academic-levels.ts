// Mức xếp loại học lực cho nhận xét theo buổi. NGUỒN DUY NHẤT — mọi UI/action
// import lại từ đây, không tự khai danh sách riêng (giống `skill-groups.ts`).
//
// ⚠️ Sửa/thêm mức phải sửa CẢ CHECK constraint `academic_level` trong migration
// (Postgres không cho ALTER CHECK trực tiếp — drop rồi add lại). Xem
// `supabase/migrations/20260726000000_student_reviews_level_absent.sql`.

export interface AcademicLevel {
  value: string;
  label: string;
}

export const ACADEMIC_LEVELS: readonly AcademicLevel[] = [
  { value: "gioi", label: "Giỏi" },
  { value: "kha", label: "Khá" },
  { value: "trung_binh", label: "Trung bình" },
  { value: "can_co_gang", label: "Cần cố gắng" },
] as const;

const LABEL_BY_VALUE = new Map(ACADEMIC_LEVELS.map((l) => [l.value, l.label]));

/** Nhãn tiếng Việt của một mức, hoặc null nếu chưa chọn / giá trị lạ. */
export function academicLevelLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return LABEL_BY_VALUE.get(value) ?? null;
}

/** Giá trị hợp lệ để action lọc bỏ dữ liệu rác trước khi lưu. */
export function isAcademicLevel(value: string): boolean {
  return LABEL_BY_VALUE.has(value);
}
