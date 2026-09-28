"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// Email ảo sinh từ username — người dùng không bao giờ thấy/dùng email.
const FAKE_EMAIL_DOMAIN = "eduverse.local";
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;

function usernameToEmail(username: string): string {
  return `${username}@${FAKE_EMAIL_DOMAIN}`;
}

function normalizeUsername(raw: FormDataEntryValue | null): string {
  return String(raw ?? "").trim().toLowerCase();
}

export async function login(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Vui lòng nhập đầy đủ tên tài khoản và mật khẩu." };
  }

  const supabase = await createClient();

  // Tra email thật từ username (hỗ trợ cả tài khoản cũ đăng ký bằng email).
  const { data: email } = await supabase.rpc("get_email_by_username", {
    p_username: username,
  });
  if (!email) {
    return { error: "Tên tài khoản không tồn tại." };
  }

  // Hỗ trợ mật khẩu 'demo' cho tài khoản demo
  const effectivePassword =
    username === "demo" && password === "demo" ? "demo123" : password;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: effectivePassword,
  });
  if (error) {
    return { error: "Mật khẩu không đúng." };
  }
  redirect("/");
}

interface SignupInput {
  username: string;
  fullName: string;
  password: string;
  passwordConfirm: string;
}

function validateSignupInput(input: SignupInput): string | null {
  if (!input.username || !input.fullName || !input.password) {
    return "Vui lòng nhập đầy đủ họ tên, tên tài khoản và mật khẩu.";
  }
  if (!USERNAME_PATTERN.test(input.username)) {
    return "Tên tài khoản 3-20 ký tự, chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới.";
  }
  if (input.password.length < 6) {
    return "Mật khẩu cần ít nhất 6 ký tự.";
  }
  if (input.password !== input.passwordConfirm) {
    return "Mật khẩu nhập lại không khớp.";
  }
  return null;
}

async function isUsernameTaken(username: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .limit(1);
  return (data ?? []).length > 0;
}

/** Tạo user qua admin API (email ảo không qua được validator của signUp thường). */
async function createUserAndSignIn(
  username: string,
  password: string,
  metadata: Record<string, string>
): Promise<ActionResult | null> {
  const admin = createAdminClient();
  const { error: createErr } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { ...metadata, username },
  });
  if (createErr) {
    console.error("createUser failed:", createErr.message);
    return { error: "Đăng ký thất bại, thử lại sau." };
  }

  const supabase = await createClient();
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (loginErr) {
    return { error: "Tạo tài khoản thành công nhưng đăng nhập lỗi — hãy đăng nhập lại." };
  }
  return null;
}

export async function signupStudent(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const username = normalizeUsername(formData.get("username"));
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const classCode = String(formData.get("class_code") ?? "").trim().toUpperCase();

  const invalid = validateSignupInput({ username, fullName, password, passwordConfirm });
  if (invalid) {
    return { error: invalid };
  }
  if (!classCode) {
    return { error: "Vui lòng chọn lớp của bạn." };
  }
  if (await isUsernameTaken(username)) {
    return { error: `Tên tài khoản "${username}" đã có người dùng, chọn tên khác nhé.` };
  }

  const failed = await createUserAndSignIn(username, password, {
    full_name: fullName,
    role: "student",
    class_code: classCode,
  });
  if (failed) {
    return failed;
  }
  redirect("/");
}

export async function signupTeacher(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const username = normalizeUsername(formData.get("username"));
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");
  const inviteCode = String(formData.get("invite_code") ?? "").trim();

  if (inviteCode !== process.env.TEACHER_INVITE_CODE) {
    return { error: "Mã mời giáo viên không đúng." };
  }
  const invalid = validateSignupInput({ username, fullName, password, passwordConfirm });
  if (invalid) {
    return { error: invalid };
  }
  if (await isUsernameTaken(username)) {
    return { error: `Tên tài khoản "${username}" đã có người dùng, chọn tên khác.` };
  }

  const failed = await createUserAndSignIn(username, password, {
    full_name: fullName,
    role: "teacher",
  });
  if (failed) {
    return failed;
  }
  redirect("/");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
