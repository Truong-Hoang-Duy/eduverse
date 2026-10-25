import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export const SPEC_BUCKET = "assignment-specs";

/** Trên bodySizeLimit 10MB của Server Action, chừa chỗ cho các field khác. */
export const SPEC_MAX_BYTES = 8 * 1024 * 1024;

type Client = SupabaseClient<Database>;

/** Đổi tên file an toàn cho Storage key (bỏ dấu, ký tự lạ). */
export function sanitizeFileName(name: string): string {
  return (
    name
      // đ/Đ phải xử lý RIÊNG: chúng là ký tự độc lập, KHÔNG phải d + dấu, nên
      // `normalize("NFD")` không tách ra được và chúng rơi vào nhánh "ký tự lạ"
      // → "đề bài" từng thành "_e_bai". Tên file tiếng Việt hay bắt đầu bằng "đề".
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
  );
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

  const { data: initialData, error } = await supabase
    .from("assignments")
    .select("spec_file_path, attachment_file_paths, instructions")
    .in("course_id", courseIds);

  let data = initialData;
  if (error || !data) {
    const fallback = await supabase
      .from("assignments")
      .select("spec_file_path, instructions")
      .in("course_id", courseIds);
    data = fallback.data as typeof data;
  }

  const paths: string[] = [];
  for (const a of data ?? []) {
    if (a.spec_file_path) paths.push(a.spec_file_path);
    const row = a as { attachment_file_paths?: string[]; instructions?: string };
    if (Array.isArray(row.attachment_file_paths)) {
      for (const p of row.attachment_file_paths) {
        if (p) paths.push(p);
      }
    }
    if (row.instructions) {
      const match = row.instructions.match(/<!--attachments:(\[.*?\])-->/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            for (const p of parsed) {
              if (p && typeof p === "string") paths.push(p);
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return paths;
}
