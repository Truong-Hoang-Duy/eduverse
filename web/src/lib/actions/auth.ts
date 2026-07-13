"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function login(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Vui lòng nhập đầy đủ email và mật khẩu." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return {
        error:
          "Email chưa được xác nhận. Kiểm tra hộp thư hoặc liên hệ giáo viên.",
      };
    }
    return { error: "Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được đăng ký." };
  }
  redirect("/");
}

export async function signupStudent(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const classCode = String(formData.get("class_code") ?? "").trim().toUpperCase();
  const age = String(formData.get("age") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const hobbies = String(formData.get("hobbies") ?? "").trim();

  if (!email || !password || !fullName || !classCode) {
    return { error: "Vui lòng nhập đầy đủ họ tên, email, mật khẩu và mã lớp." };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu cần ít nhất 6 ký tự." };
  }

  const supabase = await createClient();

  // Kiểm tra mã lớp trước cho thông báo lỗi thân thiện
  // (trigger DB vẫn là lớp chặn cuối cùng).
  const { data: classId } = await supabase.rpc("get_class_id_by_code", {
    p_class_code: classCode,
  });
  if (!classId) {
    return { error: `Mã lớp "${classCode}" không tồn tại. Hỏi lại giáo viên nhé!` };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "student",
        class_code: classCode,
        age,
        school,
        hobbies,
      },
    },
  });
  if (error) {
    return { error: mapSignupError(error.message) };
  }
  redirect("/");
}

export async function signupTeacher(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const inviteCode = String(formData.get("invite_code") ?? "").trim();

  if (!email || !password || !fullName || !inviteCode) {
    return { error: "Vui lòng nhập đầy đủ thông tin." };
  }
  if (inviteCode !== process.env.TEACHER_INVITE_CODE) {
    return { error: "Mã mời giáo viên không đúng." };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu cần ít nhất 6 ký tự." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: "teacher" } },
  });
  if (error) {
    return { error: mapSignupError(error.message) };
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function mapSignupError(message: string): string {
  if (message.includes("already registered")) {
    return "Email này đã được đăng ký.";
  }
  return `Đăng ký thất bại: ${message}`;
}
