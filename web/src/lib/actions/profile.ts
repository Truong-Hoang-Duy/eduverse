"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function updateProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const age = String(formData.get("age") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const hobbies = String(formData.get("hobbies") ?? "").trim();

  if (!fullName) {
    return { error: "Họ tên không được để trống." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      age: age ? Number(age) : null,
      school: school || null,
      hobbies: hobbies || null,
    })
    .eq("id", user.id);
  if (error) {
    return { error: `Không cập nhật được: ${error.message}` };
  }

  revalidatePath("/profile");
  return { success: "Đã lưu thông tin cá nhân." };
}
