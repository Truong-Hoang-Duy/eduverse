"use server";

import { revalidatePath } from "next/cache";

import { isAdminUsername } from "@/lib/admin-access";
import { findOrphanSpecFiles, TEST_USER_PREFIXES } from "@/lib/admin-report";
import { SPEC_BUCKET } from "@/lib/spec-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Mọi action ở đây đi qua service-role (bỏ qua RLS) nên phải TỰ kiểm quyền —
 * không có policy nào đỡ cho nữa. Trả `{ error }` thay vì redirect như
 * `requireAdmin()` để form hiển thị được lỗi theo chuẩn ActionResult.
 */
async function denyIfNotAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Phiên đăng nhập hết hạn.";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher" || !isAdminUsername(profile.username)) {
    return "Bạn không có quyền dùng khu vận hành.";
  }
  return null;
}

/**
 * Xác nhận email hộ một tài khoản đang kẹt.
 * Email ảo `<username>@eduverse.local` không nhận được thư xác nhận nào, nên
 * tài khoản chưa confirm là đăng nhập không nổi cho tới khi admin mở khóa.
 */
export async function confirmUserEmail(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return { error: denied };

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "Thiếu tài khoản cần xác nhận." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) {
    return { error: `Không xác nhận được: ${error.message}` };
  }

  revalidatePath("/teacher/admin");
  return { success: "Đã xác nhận — tài khoản đăng nhập lại được rồi." };
}

/**
 * Xóa tài khoản rác do E2E để lại (chỉ khớp tiền tố của script test, không
 * đụng tài khoản thật). Bản web của `scripts/purge-test-users.mjs`.
 */
// Không khai tham số vì action này không đọc gì từ form — useActionState vẫn
// gọi được (JS bỏ qua đối số thừa), và tránh biến không dùng.
export async function purgeTestUsers(): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return { error: denied };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    return { error: `Không đọc được danh sách tài khoản: ${error.message}` };
  }

  const junk = (data?.users ?? []).filter((user) => {
    const username = (user.email ?? "").split("@")[0];
    return TEST_USER_PREFIXES.some((prefix) => username.startsWith(prefix));
  });
  if (junk.length === 0) {
    return { success: "Không còn tài khoản test nào. Sạch." };
  }

  const failed: string[] = [];
  for (const user of junk) {
    // deleteUser trả lỗi trong { error } chứ KHÔNG throw — nuốt chỗ này là tài
    // khoản rác nằm lại im ru. Lỗi thường gặp là FK student_reviews.created_by
    // (không cascade): phải xóa khóa học của tài khoản đó trước.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      failed.push(`${(user.email ?? "").split("@")[0]} (${deleteError.message})`);
    }
  }

  revalidatePath("/teacher/admin");
  const removed = junk.length - failed.length;
  if (failed.length > 0) {
    return {
      error: `Đã xóa ${removed}/${junk.length}. Không xóa được: ${failed.join("; ")}. Thường do tài khoản còn nhận xét đã tạo (khóa ngoại created_by không cascade) — xóa khóa học của họ trước rồi thử lại.`,
    };
  }
  return { success: `Đã xóa ${removed} tài khoản test.` };
}

/**
 * Dọn file đề không còn dòng `assignments` nào trỏ tới.
 * Danh sách được TÍNH LẠI trong action (không nhận path từ form) để không ai
 * ép xóa được file đang dùng.
 */
export async function cleanupOrphanSpecFiles(): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return { error: denied };

  const admin = createAdminClient();
  const orphans = await findOrphanSpecFiles(admin);
  if (orphans.length === 0) {
    return { success: "Không có file mồ côi nào. Bucket sạch." };
  }

  const { error } = await admin.storage
    .from(SPEC_BUCKET)
    .remove(orphans.map((file) => file.path));
  if (error) {
    return { error: `Không xóa được file: ${error.message}` };
  }

  revalidatePath("/teacher/admin");
  return { success: `Đã dọn ${orphans.length} file mồ côi khỏi Storage.` };
}
