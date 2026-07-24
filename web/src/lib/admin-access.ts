// Ai được vào khu vận hành /teacher/admin.
//
// Cố tình KHÔNG thêm vai trò 'admin' vào DB: `profiles.role` có CHECK
// constraint chỉ nhận 'teacher'|'student', đổi nó phải drop+add constraint
// RỒI rà lại RLS của mọi bảng (policy hiện tại đều viết theo
// `teacher_id = auth.uid()`, không có nhánh "admin thấy tất cả"). Dự án một
// người nên chặn bằng biến môi trường là đủ, và không đụng gì tới phân quyền
// DB đang chạy ổn.
import "server-only";

import { redirect } from "next/navigation";

import { requireRole } from "@/lib/get-profile";
import type { Profile } from "@/lib/types";

/** ADMIN_USERNAMES="duy,admin2" — ngăn cách bằng dấu phẩy, bỏ qua hoa/thường. */
function adminUsernames(): string[] {
  return (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Chưa khai biến môi trường → KHÔNG ai là admin (fail closed). Quên cấu hình
 * phải dẫn tới mất quyền, không phải mở cửa cho mọi giáo viên.
 */
export function isAdminUsername(username: string | null): boolean {
  if (!username) return false;
  return adminUsernames().includes(username.toLowerCase());
}

/** Guard route: phải là teacher VÀ có tên trong ADMIN_USERNAMES. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireRole("teacher");
  if (!isAdminUsername(profile.username)) {
    redirect("/teacher");
  }
  return profile;
}
