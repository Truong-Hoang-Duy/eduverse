import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export const SPEC_BUCKET = "assignment-specs";

/** Trên bodySizeLimit 10MB của Server Action, chừa chỗ cho các field khác. */
export const SPEC_MAX_BYTES = 8 * 1024 * 1024;

type Client = SupabaseClient<Database>;

/** Đổi tên file an toàn cho Storage key (bỏ dấu, ký tự lạ). */
export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Xóa file đề khỏi Storage. Bảng DB tự cascade theo khóa ngoại, nhưng Storage thì
 * KHÔNG — xóa dòng mà quên file là bỏ rác vĩnh viễn trong bucket (đã dính một lần:
 * đề bị xóa từ 2026-07-15 mà file vẫn nằm đó đến 2026-07-16 mới phát hiện).
 * Gọi TRƯỚC khi xóa dòng, vì xóa dòng xong là mất đường tìm lại path.
 */
export async function removeSpecFiles(
  supabase: Client,
  paths: (string | null)[]
): Promise<void> {
  const files = paths.filter((p): p is string => Boolean(p));
  if (files.length === 0) return;

  const { error } = await supabase.storage.from(SPEC_BUCKET).remove(files);
  if (error) {
    // Không chặn việc xóa dòng: file rác còn hơn để lại đề hỏng người dùng
    // không xóa nổi. Log để còn dọn tay bằng scripts/check-storage.mjs.
    console.error(`Không xóa được file đề (${files.join(", ")}):`, error.message);
  }
}

/** Lấy path file đề của mọi assignment thuộc các khóa này. */
export async function specPathsOfCourses(
  supabase: Client,
  courseIds: string[]
): Promise<string[]> {
  if (courseIds.length === 0) return [];

  const { data } = await supabase
    .from("assignments")
    .select("spec_file_path")
    .in("course_id", courseIds);

  return (data ?? [])
    .map((a) => a.spec_file_path)
    .filter((p): p is string => Boolean(p));
}
