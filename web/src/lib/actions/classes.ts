"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAcademicLevel } from "@/lib/academic-levels";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const CLASS_CODE_PATTERN = /^([A-Z]{2,6}\d{1,3}|DEMO)$/;

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

/**
 * Tạo lớp MỚI: giữ số buổi + chép nguyên giáo án từng buổi (tiêu đề + nội dung)
 * từ MỘT LỚP NGUỒN GIÁO ÁN do GV chọn (thường là lớp KHÁC lớp đang mở — user
 * chốt 2026-07-27), rồi chép ghi danh các thành viên được chọn (lấy từ lớp đang
 * mở). TUYỆT ĐỐI KHÔNG chép nhận xét học viên — lớp mới bắt đầu trống. Sản phẩm
 * cuối khóa cũng không chép (gắn với từng lớp cụ thể).
 */
export async function duplicateClass(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const curriculumClassId = String(formData.get("curriculum_class_id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  const classCode = String(formData.get("class_code") ?? "")
    .trim()
    .toUpperCase();
  const description = String(formData.get("description") ?? "").trim();
  const studentIds = formData.getAll("student_ids").map(String).filter(Boolean);

  if (!curriculumClassId || !courseId || !classCode) {
    return { error: "Vui lòng chọn lớp lấy giáo án, khóa học và nhập mã lớp mới." };
  }
  if (!CLASS_CODE_PATTERN.test(classCode)) {
    return { error: "Mã lớp gồm mã khóa + số thứ tự, VD: JSB01, CSI03." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  // Đọc lớp nguồn giáo án + giáo án từng buổi (RLS chỉ trả lớp của GV — chọn
  // lớp không phải của mình sẽ ra null và bị chặn ngay dưới).
  const [{ data: source }, { data: sourceSessions }] = await Promise.all([
    supabase
      .from("classes")
      .select("total_sessions")
      .eq("id", curriculumClassId)
      .single(),
    supabase
      .from("sessions")
      .select("session_number, title, content")
      .eq("class_id", curriculumClassId)
      .order("session_number"),
  ]);
  if (!source) {
    return { error: "Không tìm thấy lớp nguồn giáo án." };
  }

  // Tạo lớp mới — trigger on_class_created tự sinh N buổi trống.
  const { data: created, error: createError } = await supabase
    .from("classes")
    .insert({
      course_id: courseId,
      class_code: classCode,
      teacher_id: user.id,
      total_sessions: source.total_sessions,
      description: description || null,
    })
    .select("id")
    .single();
  if (createError || !created) {
    if (createError?.code === "23505") {
      return { error: `Mã lớp ${classCode} đã tồn tại.` };
    }
    return { error: `Không tạo được lớp: ${createError?.message ?? "lỗi không rõ"}` };
  }
  const newClassId = created.id;

  // Chép giáo án: upsert đè lên các buổi trống trigger vừa tạo (khớp
  // unique(class_id, session_number)). KHÔNG chép session_date — lớp mới có lịch
  // riêng. KHÔNG chép nhận xét (chúng gắn với buổi CŨ, buổi mới là dòng khác).
  if (sourceSessions && sourceSessions.length > 0) {
    const { error: sessionError } = await supabase.from("sessions").upsert(
      sourceSessions.map((s) => ({
        class_id: newClassId,
        session_number: s.session_number,
        title: s.title,
        content: s.content,
      })),
      { onConflict: "class_id,session_number" }
    );
    if (sessionError) {
      return {
        error: `Đã tạo lớp ${classCode} nhưng chưa chép được nội dung buổi: ${sessionError.message}. Vào lớp mới soạn tay hoặc xóa rồi thử lại.`,
      };
    }
  }

  // Chép ghi danh các thành viên được chọn.
  if (studentIds.length > 0) {
    const { error: enrollError } = await supabase
      .from("enrollments")
      .insert(studentIds.map((sid) => ({ class_id: newClassId, student_id: sid })));
    if (enrollError) {
      return {
        error: `Đã tạo lớp ${classCode} và chép giáo án, nhưng thêm học viên lỗi: ${enrollError.message}. Vào lớp mới thêm tay.`,
      };
    }
  }

  revalidatePath("/teacher");
  redirect(`/teacher/classes/${newClassId}`);
}

export async function updateClass(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  const classCode = String(formData.get("class_code") ?? "")
    .trim()
    .toUpperCase();
  const description = String(formData.get("description") ?? "").trim();

  if (!id || !classCode || !courseId) {
    return { error: "Vui lòng chọn khóa học và nhập mã lớp." };
  }
  if (!CLASS_CODE_PATTERN.test(classCode)) {
    return { error: "Mã lớp gồm mã khóa + số thứ tự, VD: JSB01, CSI03." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("classes")
    .update({
      course_id: courseId,
      class_code: classCode,
      description: description || null,
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { error: `Mã lớp ${classCode} đã được dùng cho lớp khác.` };
    }
    return { error: `Không cập nhật được: ${error.message}` };
  }

  revalidatePath(`/teacher/classes/${id}`);
  revalidatePath("/teacher");
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

/** Xếp loại học lực giờ tích 1 LẦN cho cả lớp (yêu cầu user 2026-08-28, thay
 *  vì chọn lại mỗi buổi nhận xét) — lưu ở `enrollments.academic_level`, auto
 *  save ngay khi đổi Select trong bảng "Danh sách học viên" (cùng tinh thần
 *  "tick Vắng lưu luôn" đã áp dụng ở review-editor). */
export async function setEnrollmentAcademicLevel(input: {
  enrollmentId: string;
  classId: string;
  level: string;
}): Promise<ActionResult> {
  const level = isAcademicLevel(input.level) ? input.level : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ academic_level: level })
    .eq("id", input.enrollmentId);
  if (error) {
    return { error: `Không lưu được xếp loại: ${error.message}` };
  }

  revalidatePath(`/teacher/classes/${input.classId}`);
  return { success: "Đã lưu xếp loại học lực." };
}

export interface StudentSearchResult {
  id: string;
  full_name: string;
  username: string | null;
}

/** Tìm học viên theo tên hoặc tên tài khoản (RPC vì RLS chặn GV thấy HV lạ). */
export async function searchStudents(
  query: string
): Promise<{ students?: StudentSearchResult[]; error?: string }> {
  if (!query.trim()) {
    return { students: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_students", {
    p_query: query,
  });
  if (error) {
    return { error: `Không tìm được: ${error.message}` };
  }
  return { students: (data ?? []) as StudentSearchResult[] };
}

/** GV thêm thẳng học viên vào lớp (không cần em tự nhập mã lớp). */
export async function addStudentToClass(input: {
  classId: string;
  studentId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").insert({
    class_id: input.classId,
    student_id: input.studentId,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "Học viên đã có trong lớp này rồi." };
    }
    return { error: `Không thêm được: ${error.message}` };
  }

  revalidatePath(`/teacher/classes/${input.classId}`);
  return { success: "Đã thêm học viên vào lớp." };
}

export async function removeStudent(formData: FormData): Promise<void> {
  const enrollmentId = String(formData.get("enrollment_id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!enrollmentId) return;

  const supabase = await createClient();
  await supabase.from("enrollments").delete().eq("id", enrollmentId);
  revalidatePath(`/teacher/classes/${classId}`);
}

/** Cập nhật thứ tự sắp xếp học viên trong lớp (sort_order). */
export async function updateStudentsOrder(input: {
  classId: string;
  orderedEnrollmentIds: string[];
}): Promise<ActionResult> {
  if (
    !input.classId ||
    !input.orderedEnrollmentIds ||
    input.orderedEnrollmentIds.length === 0
  ) {
    return { error: "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();

  const updates = input.orderedEnrollmentIds.map((enrollmentId, index) =>
    supabase
      .from("enrollments")
      .update({ sort_order: index })
      .eq("id", enrollmentId)
      .eq("class_id", input.classId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed && failed.error) {
    return { error: `Không lưu được thứ tự: ${failed.error.message}` };
  }

  revalidatePath(`/teacher/classes/${input.classId}`);
  return { success: "Đã cập nhật thứ tự học viên." };
}

