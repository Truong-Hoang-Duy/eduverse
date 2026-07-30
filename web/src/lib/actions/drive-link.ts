"use server";

import { revalidatePath } from "next/cache";

import { driveUrlError } from "@/lib/drive-url";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Link Drive nộp bài của học viên — MỘT link dùng cho MỌI lớp em học.
 * Bảng `student_drive_links` khóa chính là `student_id`; RLS: chính chủ toàn
 * quyền, giáo viên của lớp em đang học CHỈ ĐỌC (bạn cùng lớp không thấy).
 */

export async function saveMyDriveLink(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = String(formData.get("drive_url") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  // Ô rỗng = xóa link (học viên đổi ý, không muốn khai nữa).
  if (!raw) {
    const { error } = await supabase
      .from("student_drive_links")
      .delete()
      .eq("student_id", user.id);
    if (error) {
      return { error: `Không xóa được đường dẫn: ${error.message}` };
    }
    revalidatePath("/student");
    return { success: "Đã xóa đường dẫn Drive." };
  }

  const invalid = driveUrlError(raw);
  if (invalid) {
    return { error: invalid };
  }

  const { error } = await supabase
    .from("student_drive_links")
    .upsert(
      { student_id: user.id, drive_url: raw, updated_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );
  if (error) {
    return { error: `Không lưu được đường dẫn: ${error.message}` };
  }

  revalidatePath("/student");
  return { success: "Đã lưu đường dẫn Drive." };
}

/** Link của chính học viên đang đăng nhập; null nếu chưa khai. */
export async function getMyDriveLink(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("student_drive_links")
    .select("drive_url")
    .eq("student_id", user.id)
    .maybeSingle();

  return data?.drive_url ?? null;
}

/**
 * Link của mọi học viên trong một lớp, cho giáo viên xem. Trả về map
 * `student_id → drive_url`; RLS tự lọc nên GV lớp khác không lấy được gì.
 */
export async function driveLinksOfClass(
  classId: string
): Promise<Record<string, string>> {
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId);

  const studentIds = (enrollments ?? []).map((e) => e.student_id);
  if (studentIds.length === 0) return {};

  const { data } = await supabase
    .from("student_drive_links")
    .select("student_id, drive_url")
    .in("student_id", studentIds);

  return Object.fromEntries(
    (data ?? []).map((row) => [row.student_id, row.drive_url])
  );
}

/**
 * Link của một danh sách học viên (map `student_id → drive_url`). RLS tự lọc:
 * giáo viên thấy học viên lớp mình, học viên chỉ thấy chính mình — nên nơi gọi
 * KHÔNG cần tự kiểm quyền, thiếu quyền là đơn giản không có dòng nào trả về.
 */
export async function driveLinksOfStudents(
  studentIds: string[]
): Promise<Record<string, string>> {
  if (studentIds.length === 0) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("student_drive_links")
    .select("student_id, drive_url")
    .in("student_id", studentIds);

  return Object.fromEntries(
    (data ?? []).map((row) => [row.student_id, row.drive_url])
  );
}
