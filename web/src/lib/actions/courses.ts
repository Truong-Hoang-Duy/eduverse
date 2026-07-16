"use server";

import { revalidatePath } from "next/cache";

import { removeSpecFiles, specPathsOfCourses } from "@/lib/spec-storage";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const COURSE_CODE_PATTERN = /^[A-Z]{2,6}$/;

export async function createCourse(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!code || !name) {
    return { error: "Vui lòng nhập mã và tên khóa học." };
  }
  if (!COURSE_CODE_PATTERN.test(code)) {
    return { error: "Mã khóa học là 2-6 chữ cái in hoa, VD: JSB, CSB." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase.from("courses").insert({
    code,
    name,
    description: description || null,
    teacher_id: user.id,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: `Mã khóa học ${code} đã tồn tại.` };
    }
    return { error: `Không tạo được khóa học: ${error.message}` };
  }

  revalidatePath("/teacher");
  return { success: `Đã tạo khóa học ${code}.` };
}

export async function updateCourse(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!id || !code || !name) {
    return { error: "Vui lòng nhập mã và tên khóa học." };
  }
  if (!COURSE_CODE_PATTERN.test(code)) {
    return { error: "Mã khóa học là 2-6 chữ cái in hoa, VD: JSB, CSB." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ code, name, description: description || null })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { error: `Mã khóa học ${code} đã được dùng cho khóa khác.` };
    }
    return { error: `Không cập nhật được: ${error.message}` };
  }

  revalidatePath("/teacher");
  return { success: "Đã cập nhật khóa học." };
}

export async function deleteCourse(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  // Xóa khóa thì assignments cascade theo, nhưng file đề trong Storage thì không —
  // phải gom path lại trước khi dòng biến mất.
  const paths = await specPathsOfCourses(supabase, [id]);

  await supabase.from("courses").delete().eq("id", id);
  await removeSpecFiles(supabase, paths);

  revalidatePath("/teacher");
  revalidatePath("/teacher/assignments");
}
