"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/** Supabase mặc định yêu cầu tối thiểu 6 ký tự. */
function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự.";
  if (password.length > 72) return "Mật khẩu tối đa 72 ký tự.";
  if (password !== confirm) return "Hai ô mật khẩu không khớp nhau.";
  return null;
}

/** Người đang đăng nhập tự đổi mật khẩu — KHÔNG cần mật khẩu cũ
 *  (phiên đăng nhập hợp lệ chính là bằng chứng sở hữu tài khoản). */
export async function changeMyPassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const invalid = validateNewPassword(password, confirm);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập hết hạn." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Supabase chặn đặt lại đúng mật khẩu đang dùng.
    if (error.code === "same_password") {
      return { error: "Mật khẩu mới trùng mật khẩu hiện tại." };
    }
    return { error: `Không đổi được mật khẩu: ${error.message}` };
  }
  return { success: "Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới." };
}

/** GV đặt mật khẩu mới cho học viên LỚP MÌNH (em quên mật khẩu — auth username
 *  không có email khôi phục). Đi qua admin API nên phải tự kiểm quyền:
 *  caller là teacher + thấy được enrollment của em đó (RLS
 *  `enrollments_teacher_all` chỉ trả dòng thuộc lớp của chính GV; caller là
 *  học viên thì bị chặn ở bước role — policy classmates cũng thấy enrollment). */
export async function resetStudentPassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const studentId = String(formData.get("student_id") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? password);

  if (!studentId) return { error: "Thiếu học viên." };
  const invalid = validateNewPassword(password, confirm);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập hết hạn." };

  const [{ data: me }, { data: target }, { data: enrollment }] =
    await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase.from("profiles").select("role").eq("id", studentId).maybeSingle(),
      supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .limit(1)
        .maybeSingle(),
    ]);

  if (me?.role !== "teacher") {
    return { error: "Chỉ giáo viên mới đặt lại được mật khẩu học viên." };
  }
  if (target?.role !== "student" || !enrollment) {
    return { error: "Học viên này không thuộc lớp nào của bạn." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(studentId, {
    password,
  });
  if (error) {
    return { error: `Không đặt được mật khẩu: ${error.message}` };
  }
  return { success: "Đã đặt mật khẩu mới — nhớ gửi cho em nhé." };
}
