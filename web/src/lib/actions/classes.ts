"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const CLASS_CODE_PATTERN = /^[A-Z]{2,6}\d{1,3}$/;

export async function createClass(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const courseId = String(formData.get("course_id") ?? "");
  const classCode = String(formData.get("class_code") ?? "")
    .trim()
    .toUpperCase();
  const totalSessions = Number(formData.get("total_sessions") ?? 0);
  const description = String(formData.get("description") ?? "").trim();

  if (!courseId || !classCode || !totalSessions) {
    return { error: "Vui lòng chọn khóa học, nhập mã lớp và số buổi." };
  }
  if (!CLASS_CODE_PATTERN.test(classCode)) {
    return { error: "Mã lớp gồm mã khóa + số thứ tự, VD: JSB01, CSI03." };
  }
  if (totalSessions < 1 || totalSessions > 100) {
    return { error: "Số buổi từ 1 đến 100." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase.from("classes").insert({
    course_id: courseId,
    class_code: classCode,
    teacher_id: user.id,
    total_sessions: totalSessions,
    description: description || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: `Mã lớp ${classCode} đã tồn tại.` };
    }
    return { error: `Không tạo được lớp: ${error.message}` };
  }

  revalidatePath("/teacher");
  return { success: `Đã tạo lớp ${classCode} (${totalSessions} buổi).` };
}

export async function updateClass(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (!id) {
    return { error: "Thiếu thông tin lớp." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({ description: description || null })
    .eq("id", id);
  if (error) {
    return { error: `Không cập nhật được: ${error.message}` };
  }

  revalidatePath(`/teacher/classes/${id}`);
  return { success: "Đã cập nhật lớp." };
}

export async function deleteClass(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("classes").delete().eq("id", id);
  revalidatePath("/teacher");
  redirect("/teacher");
}

export async function transferStudent(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const enrollmentId = String(formData.get("enrollment_id") ?? "");
  const targetClassId = String(formData.get("target_class_id") ?? "");
  const currentClassId = String(formData.get("current_class_id") ?? "");

  if (!enrollmentId || !targetClassId) {
    return { error: "Vui lòng chọn lớp muốn chuyển đến." };
  }
  if (targetClassId === currentClassId) {
    return { error: "Học viên đang ở lớp này rồi." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ class_id: targetClassId })
    .eq("id", enrollmentId);
  if (error) {
    if (error.code === "23505") {
      return { error: "Học viên đã có trong lớp đích." };
    }
    return { error: `Không chuyển được: ${error.message}` };
  }

  revalidatePath(`/teacher/classes/${currentClassId}`);
  return { success: "Đã chuyển lớp cho học viên." };
}

export async function removeStudent(formData: FormData): Promise<void> {
  const enrollmentId = String(formData.get("enrollment_id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!enrollmentId) return;

  const supabase = await createClient();
  await supabase.from("enrollments").delete().eq("id", enrollmentId);
  revalidatePath(`/teacher/classes/${classId}`);
}
