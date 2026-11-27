"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAcademicLevel } from "@/lib/academic-levels";
import type { Json } from "@/lib/database.types";
import type { SessionFormat } from "@/lib/session-format";
import { createClient } from "@/lib/supabase/server";
import {
  createLocalUuid,
  decodeSubstituteClassFallback,
  encodeSubstituteClassFallback,
  isGenericSessionTitle,
  mergeSubstituteStudents,
  normalizeStudentNameKey,
  normalizeSubstituteClassCode,
  parseBulkStudentNames,
  sanitizeSubstituteReviews,
  sanitizeSubstituteStudents,
  SUBSTITUTE_CLASS_FALLBACK_PREFIX,
  type SubstituteClass,
  type SubstituteReviewEntry,
  type SubstituteSession,
  type SubstituteStudent,
} from "@/lib/substitute-classes";
import type { ActionResult } from "@/lib/types";

let substituteTablesMissing = false;

function isMissingSubstituteTableError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  const missing =
    code === "42P01" ||
    code === "PGRST205" ||
    code === "405" ||
    msg.includes("substitute_classes") ||
    msg.includes("substitute_sessions") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache");
  if (missing) {
    substituteTablesMissing = true;
  }
  return missing;
}

function revalidateSubstitute(classId?: string): void {
  revalidatePath("/teacher");
  revalidatePath("/teacher/substitute");
  if (classId) {
    revalidatePath(`/teacher/substitute/${classId}`);
  }
}

async function requireTeacherUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null, isTeacher: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return { supabase, user, isTeacher: profile?.role === "teacher" };
}

function flagsFromFormat(format?: SessionFormat): {
  is_periodic_test: boolean;
  is_project_period: boolean;
  is_final_presentation: boolean;
} {
  return {
    is_periodic_test: format === "periodic_test",
    is_project_period: format === "project_period",
    is_final_presentation: format === "final_presentation",
  };
}

function mapSessionRow(row: {
  id: string;
  substitute_class_id: string;
  session_number: number;
  title: string | null;
  content: string | null;
  review_context: string | null;
  session_date: string | null;
  is_periodic_test: boolean;
  is_project_period: boolean;
  is_final_presentation: boolean;
  reviews: Json;
  created_at: string;
  updated_at: string;
}): SubstituteSession {
  return {
    id: row.id,
    substituteClassId: row.substitute_class_id,
    sessionNumber: row.session_number,
    title: row.title,
    content: row.content,
    reviewContext: row.review_context,
    sessionDate: row.session_date,
    isPeriodicTest: Boolean(row.is_periodic_test),
    isProjectPeriod: Boolean(row.is_project_period),
    isFinalPresentation: Boolean(row.is_final_presentation),
    reviews: sanitizeSubstituteReviews(row.reviews),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Fallback helpers (khi DB live chưa áp migration 20261126000000_substitute_classes.sql) ---

async function listFallbackSubstituteClasses(
  teacherId: string
): Promise<SubstituteClass[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("zalo_templates")
    .select("id, name, template_text")
    .eq("teacher_id", teacherId)
    .like("name", `${SUBSTITUTE_CLASS_FALLBACK_PREFIX}%`);

  const list: SubstituteClass[] = [];
  for (const row of data ?? []) {
    const decoded = decodeSubstituteClassFallback(row);
    if (decoded) list.push(decoded);
  }
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function getFallbackSubstituteClass(
  teacherId: string,
  classId: string
): Promise<SubstituteClass | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("zalo_templates")
    .select("id, name, template_text")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .like("name", `${SUBSTITUTE_CLASS_FALLBACK_PREFIX}%`)
    .maybeSingle();

  if (!data) return null;
  return decodeSubstituteClassFallback(data);
}

async function saveFallbackSubstituteClass(
  teacherId: string,
  cls: SubstituteClass
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const updated: SubstituteClass = {
    ...cls,
    updatedAt: new Date().toISOString(),
  };
  const encoded = encodeSubstituteClassFallback(updated);
  const { error } = await supabase
    .from("zalo_templates")
    .update({
      name: encoded.name,
      template_text: encoded.template_text,
    })
    .eq("id", cls.id)
    .eq("teacher_id", teacherId);

  if (error) return { error: `Không lưu được lớp dạy thay: ${error.message}` };
  return {};
}

// --- Public Server Actions ---

/** Danh sách tất cả lớp dạy thay của giáo viên hiện tại (kèm các buổi dạy thay). */
export async function listSubstituteClasses(
  teacherId?: string
): Promise<SubstituteClass[]> {
  const supabase = await createClient();
  let uid = teacherId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) return [];

  if (!substituteTablesMissing) {
    const [{ data: classesData, error: clsErr }, { data: sessionsData, error: sessErr }] =
      await Promise.all([
        supabase
          .from("substitute_classes")
          .select("*")
          .eq("teacher_id", uid)
          .order("updated_at", { ascending: false }),
        supabase
          .from("substitute_sessions")
          .select("*")
          .eq("teacher_id", uid)
          .order("session_number", { ascending: true }),
      ]);

    if (!clsErr && !sessErr && classesData) {
      const sessionsByClass = new Map<string, SubstituteSession[]>();
      for (const sRow of sessionsData ?? []) {
        const mapped = mapSessionRow(sRow);
        const list = sessionsByClass.get(mapped.substituteClassId) ?? [];
        list.push(mapped);
        sessionsByClass.set(mapped.substituteClassId, list);
      }

      return classesData.map((row) => ({
        id: row.id,
        courseId: row.course_id,
        courseName: row.course_name,
        classCode: row.class_code,
        notes: row.notes,
        students: sanitizeSubstituteStudents(row.students),
        sessions: sessionsByClass.get(row.id) ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    if (
      !isMissingSubstituteTableError(clsErr) &&
      !isMissingSubstituteTableError(sessErr)
    ) {
      return [];
    }
  }

  return listFallbackSubstituteClasses(uid);
}

/** Lấy chi tiết 1 lớp dạy thay cùng toàn bộ các buổi của lớp đó. */
export async function getSubstituteClass(
  classId: string,
  teacherId?: string
): Promise<SubstituteClass | null> {
  const supabase = await createClient();
  let uid = teacherId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid || !classId) return null;

  if (!substituteTablesMissing) {
    const [{ data: clsRow, error: clsErr }, { data: sessRows, error: sessErr }] =
      await Promise.all([
        supabase
          .from("substitute_classes")
          .select("*")
          .eq("id", classId)
          .eq("teacher_id", uid)
          .maybeSingle(),
        supabase
          .from("substitute_sessions")
          .select("*")
          .eq("substitute_class_id", classId)
          .eq("teacher_id", uid)
          .order("session_number", { ascending: true }),
      ]);

    if (!clsErr && !sessErr) {
      if (!clsRow) return null;
      return {
        id: clsRow.id,
        courseId: clsRow.course_id,
        courseName: clsRow.course_name,
        classCode: clsRow.class_code,
        notes: clsRow.notes,
        students: sanitizeSubstituteStudents(clsRow.students),
        sessions: (sessRows ?? []).map(mapSessionRow),
        createdAt: clsRow.created_at,
        updatedAt: clsRow.updated_at,
      };
    }

    if (
      !isMissingSubstituteTableError(clsErr) &&
      !isMissingSubstituteTableError(sessErr)
    ) {
      return null;
    }
  }

  return getFallbackSubstituteClass(uid, classId);
}

export interface ImportedSubstituteSessionInput {
  sessionNumber: number;
  title?: string;
  content?: string;
  sessionDate?: string;
  sessionFormat?: SessionFormat;
  /** Map tên học viên (chuẩn hóa hoặc nguyên văn) -> nhận xét/vắng mặt kéo từ LMS. */
  reviewsByStudentName: Record<
    string,
    { comment?: string; isAbsent?: boolean }
  >;
}

export interface CreateSubstituteClassInput {
  classCode: string;
  courseId?: string | null;
  courseName?: string;
  notes?: string;
  sessionNumber: number;
  sessionTitle?: string;
  sessionContent?: string;
  sessionFormat?: SessionFormat;
  sessionDate?: string;
  rawStudentNames?: string;
  /** Danh sách vắng sẵn (VD kéo từ điểm danh MindX LMS). */
  absentNames?: string[];
  /** Các buổi + nhận xét đã lưu kéo trực tiếp từ MindX LMS (VD Buổi 1, Buổi 2...). */
  initialSessions?: ImportedSubstituteSessionInput[];
}

function buildReviewsMapForStudents(
  students: SubstituteStudent[],
  reviewsByStudentName: Record<string, { comment?: string; isAbsent?: boolean }>,
  fallbackAbsentKeys?: Set<string>
): Record<string, SubstituteReviewEntry> {
  const normalizedIncoming = new Map<string, { comment?: string; isAbsent?: boolean }>();
  for (const [name, data] of Object.entries(reviewsByStudentName)) {
    const key = normalizeStudentNameKey(name);
    if (key) normalizedIncoming.set(key, data);
  }

  const out: Record<string, SubstituteReviewEntry> = {};
  for (const s of students) {
    const key = normalizeStudentNameKey(s.full_name);
    const hit = normalizedIncoming.get(key);
    const isAbsent = Boolean(hit?.isAbsent || fallbackAbsentKeys?.has(key));
    const comment = (hit?.comment ?? "").trim();

    if (isAbsent) {
      out[s.id] = {
        strengths: [],
        improvements: [],
        ai_generated_comment: null,
        is_absent: true,
      };
    } else if (comment) {
      out[s.id] = {
        strengths: [],
        improvements: [],
        ai_generated_comment: comment,
        is_absent: false,
      };
    }
  }
  return out;
}

/** Tạo lớp dạy thay mới kèm buổi dạy thay đầu tiên (hoặc nhiều buổi + nhận xét kéo từ LMS). */
export async function createSubstituteClassQuick(
  input: CreateSubstituteClassInput
): Promise<{
  id?: string;
  sessionId?: string;
  sessionIdsByNumber?: Record<number, string>;
  studentMap?: Record<string, string>;
  error?: string;
}> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) {
    return { error: "Chỉ giáo viên mới được tạo lớp dạy thay." };
  }

  const classCode = normalizeSubstituteClassCode(input.classCode);
  if (!classCode) {
    return { error: "Vui lòng nhập mã lớp dạy thay (VD: BH-CSA06, ONL-JSB12)." };
  }

  const primarySessionNumber = Math.min(
    100,
    Math.max(1, Math.round(input.sessionNumber || 1))
  );
  let resolvedCourseName = (input.courseName ?? "").trim();
  const courseId = input.courseId?.trim() || null;

  if (courseId && !resolvedCourseName) {
    const { data: course } = await supabase
      .from("courses")
      .select("code, name")
      .eq("id", courseId)
      .maybeSingle();
    if (course) {
      resolvedCourseName = `${course.code} — ${course.name}`;
    }
  }

  const parsedNames = parseBulkStudentNames(input.rawStudentNames ?? "");
  // Bổ sung thêm tên học viên xuất hiện trong initialSessions (nếu giáo viên chưa sửa danh sách)
  const extraNames: string[] = [];
  for (const sess of input.initialSessions ?? []) {
    for (const name of Object.keys(sess.reviewsByStudentName ?? {})) {
      extraNames.push(name);
    }
  }
  const students = mergeSubstituteStudents(
    mergeSubstituteStudents([], parsedNames),
    parsedNames.length > 0 ? [] : extraNames
  );

  const absentKeySet = new Set(
    (input.absentNames ?? []).map((n) => normalizeStudentNameKey(n))
  );
  const studentMap: Record<string, string> = {};
  for (const s of students) {
    studentMap[normalizeStudentNameKey(s.full_name)] = s.id;
  }

  const nowIso = new Date().toISOString();
  const primaryTitle =
    (input.sessionTitle ?? "").trim() || `Buổi ${primarySessionNumber}`;
  const primaryContent = (input.sessionContent ?? "").trim() || null;
  const primaryDate = (input.sessionDate ?? "").trim() || null;
  const primaryFlags = flagsFromFormat(input.sessionFormat);

  // Gộp danh sách buổi cần tạo (nhiều buổi kéo từ LMS + đảm bảo luôn có primarySessionNumber)
  const sessionsToCreateMap = new Map<
    number,
    {
      sessionNumber: number;
      title: string;
      content: string | null;
      sessionDate: string | null;
      flags: ReturnType<typeof flagsFromFormat>;
      reviews: Record<string, SubstituteReviewEntry>;
    }
  >();

  for (const imported of input.initialSessions ?? []) {
    const num = Math.min(100, Math.max(1, Math.round(imported.sessionNumber || 1)));
    const isPrimary = num === primarySessionNumber;
    sessionsToCreateMap.set(num, {
      sessionNumber: num,
      title: isPrimary
        ? primaryTitle
        : (imported.title ?? "").trim() || `Buổi ${num}`,
      content: isPrimary
        ? (primaryContent ?? ((imported.content ?? "").trim() || null))
        : (imported.content ?? "").trim() || null,
      sessionDate:
        (imported.sessionDate ?? "").trim() || (isPrimary ? primaryDate : null),
      flags: isPrimary ? primaryFlags : flagsFromFormat(imported.sessionFormat),
      reviews: buildReviewsMapForStudents(
        students,
        imported.reviewsByStudentName ?? {},
        isPrimary ? absentKeySet : undefined
      ),
    });
  }

  if (!sessionsToCreateMap.has(primarySessionNumber)) {
    sessionsToCreateMap.set(primarySessionNumber, {
      sessionNumber: primarySessionNumber,
      title: primaryTitle,
      content: primaryContent,
      sessionDate: primaryDate,
      flags: primaryFlags,
      reviews: buildReviewsMapForStudents(students, {}, absentKeySet),
    });
  }

  const sessionsToCreate = Array.from(sessionsToCreateMap.values()).sort(
    (a, b) => a.sessionNumber - b.sessionNumber
  );

  if (!substituteTablesMissing) {
    const { data: createdClass, error: clsErr } = await supabase
      .from("substitute_classes")
      .insert({
        teacher_id: user.id,
        course_id: courseId,
        course_name: resolvedCourseName,
        class_code: classCode,
        notes: (input.notes ?? "").trim() || null,
        students: students as unknown as Json,
      })
      .select("id")
      .single();

    if (!clsErr && createdClass) {
      const { data: createdSessions, error: sessErr } = await supabase
        .from("substitute_sessions")
        .insert(
          sessionsToCreate.map((s) => ({
            substitute_class_id: createdClass.id,
            teacher_id: user.id,
            session_number: s.sessionNumber,
            title: s.title,
            content: s.content,
            session_date: s.sessionDate,
            is_periodic_test: s.flags.is_periodic_test,
            is_project_period: s.flags.is_project_period,
            is_final_presentation: s.flags.is_final_presentation,
            reviews: s.reviews as unknown as Json,
          }))
        )
        .select("id, session_number");

      if (sessErr) {
        return { error: `Đã tạo lớp nhưng lỗi tạo buổi đầu: ${sessErr.message}` };
      }

      const sessionIdsByNumber: Record<number, string> = {};
      for (const row of createdSessions ?? []) {
        sessionIdsByNumber[row.session_number] = row.id;
      }

      revalidateSubstitute(createdClass.id);
      return {
        id: createdClass.id,
        sessionId:
          sessionIdsByNumber[primarySessionNumber] ?? createdSessions?.[0]?.id,
        sessionIdsByNumber,
        studentMap,
      };
    }

    if (!isMissingSubstituteTableError(clsErr)) {
      return { error: `Không tạo được lớp dạy thay: ${clsErr?.message ?? "lỗi không rõ"}` };
    }
  }

  // Fallback lưu qua zalo_templates (RLS chỉ teacher sở hữu)
  const sessionIdsByNumber: Record<number, string> = {};
  const fallbackSessions: SubstituteSession[] = sessionsToCreate.map((s) => {
    const sid = createLocalUuid();
    sessionIdsByNumber[s.sessionNumber] = sid;
    return {
      id: sid,
      substituteClassId: "",
      sessionNumber: s.sessionNumber,
      title: s.title,
      content: s.content,
      reviewContext: null,
      sessionDate: s.sessionDate,
      isPeriodicTest: s.flags.is_periodic_test,
      isProjectPeriod: s.flags.is_project_period,
      isFinalPresentation: s.flags.is_final_presentation,
      reviews: s.reviews,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });

  const draftClass: SubstituteClass = {
    id: createLocalUuid(),
    courseId,
    courseName: resolvedCourseName,
    classCode,
    notes: (input.notes ?? "").trim() || null,
    students,
    sessions: fallbackSessions,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const encoded = encodeSubstituteClassFallback(draftClass);
  const { data: inserted, error: fbErr } = await supabase
    .from("zalo_templates")
    .insert({
      teacher_id: user.id,
      name: encoded.name,
      template_text: encoded.template_text,
    })
    .select("id")
    .single();

  if (fbErr || !inserted) {
    return { error: `Không tạo được lớp dạy thay: ${fbErr?.message ?? "lỗi không rõ"}` };
  }

  const synced: SubstituteClass = {
    ...draftClass,
    id: inserted.id,
    sessions: draftClass.sessions.map((s) => ({
      ...s,
      substituteClassId: inserted.id,
    })),
  };
  await saveFallbackSubstituteClass(user.id, synced);
  revalidateSubstitute(inserted.id);
  return {
    id: inserted.id,
    sessionId:
      sessionIdsByNumber[primarySessionNumber] ?? fallbackSessions[0]?.id,
    sessionIdsByNumber,
    studentMap,
  };
}

/** Cập nhật thông tin lớp dạy thay (mã lớp, khóa học, ghi chú). */
export async function updateSubstituteClass(input: {
  id: string;
  classCode: string;
  courseId?: string | null;
  courseName?: string;
  notes?: string;
}): Promise<ActionResult> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return { error: "Phiên đăng nhập hết hạn." };

  const classCode = normalizeSubstituteClassCode(input.classCode);
  if (!classCode) return { error: "Mã lớp không được để trống." };

  const courseId = input.courseId?.trim() || null;
  let courseName = (input.courseName ?? "").trim();
  if (courseId && !courseName) {
    const { data: course } = await supabase
      .from("courses")
      .select("code, name")
      .eq("id", courseId)
      .maybeSingle();
    if (course) courseName = `${course.code} — ${course.name}`;
  }

  if (!substituteTablesMissing) {
    const { error } = await supabase
      .from("substitute_classes")
      .update({
        class_code: classCode,
        course_id: courseId,
        course_name: courseName,
        notes: (input.notes ?? "").trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("teacher_id", user.id);

    if (!error) {
      revalidateSubstitute(input.id);
      return { success: "Đã cập nhật thông tin lớp dạy thay." };
    }
    if (!isMissingSubstituteTableError(error)) {
      return { error: `Không cập nhật được: ${error.message}` };
    }
  }

  const existing = await getFallbackSubstituteClass(user.id, input.id);
  if (!existing) return { error: "Không tìm thấy lớp dạy thay." };
  const res = await saveFallbackSubstituteClass(user.id, {
    ...existing,
    classCode,
    courseId,
    courseName,
    notes: (input.notes ?? "").trim() || null,
  });
  if (res.error) return res;
  revalidateSubstitute(input.id);
  return { success: "Đã cập nhật thông tin lớp dạy thay." };
}

/**
 * XÓA SẠCH lớp dạy thay (cùng toàn bộ các buổi và nhận xét bên trong)
 * khi giáo viên không còn dạy thay lớp đó nữa. Không ảnh hưởng lớp cố định.
 */
export async function deleteSubstituteClass(id: string): Promise<ActionResult> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return { error: "Phiên đăng nhập hết hạn." };
  if (!id) return { error: "Thiếu mã lớp cần xóa." };

  if (!substituteTablesMissing) {
    const { error } = await supabase
      .from("substitute_classes")
      .delete()
      .eq("id", id)
      .eq("teacher_id", user.id);

    if (!error) {
      revalidateSubstitute();
      return { success: "Đã xóa lớp dạy thay." };
    }
    if (!isMissingSubstituteTableError(error)) {
      return { error: `Không xóa được lớp: ${error.message}` };
    }
  }

  const { error } = await supabase
    .from("zalo_templates")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id)
    .like("name", `${SUBSTITUTE_CLASS_FALLBACK_PREFIX}%`);
  if (error) return { error: `Không xóa được lớp: ${error.message}` };

  revalidateSubstitute();
  return { success: "Đã xóa lớp dạy thay." };
}

/** Thêm danh sách học viên (dán nhiều dòng hoặc từng em) vào lớp dạy thay. */
export async function addSubstituteStudents(input: {
  substituteClassId: string;
  rawNames: string;
}): Promise<{ addedCount?: number; students?: SubstituteStudent[]; error?: string }> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return { error: "Phiên đăng nhập hết hạn." };

  const names = parseBulkStudentNames(input.rawNames);
  if (names.length === 0) {
    return { error: "Vui lòng nhập ít nhất 1 tên học viên." };
  }

  const cls = await getSubstituteClass(input.substituteClassId, user.id);
  if (!cls) return { error: "Không tìm thấy lớp dạy thay." };

  const merged = mergeSubstituteStudents(cls.students, names);
  const addedCount = merged.length - cls.students.length;
  if (addedCount === 0) {
    return { error: "Tất cả tên học viên vừa nhập đã có trong danh sách." };
  }

  if (!substituteTablesMissing) {
    const { error } = await supabase
      .from("substitute_classes")
      .update({
        students: merged as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cls.id)
      .eq("teacher_id", user.id);

    if (!error) {
      revalidateSubstitute(cls.id);
      return { addedCount, students: merged };
    }
    if (!isMissingSubstituteTableError(error)) {
      return { error: `Không thêm được học viên: ${error.message}` };
    }
  }

  const res = await saveFallbackSubstituteClass(user.id, {
    ...cls,
    students: merged,
  });
  if (res.error) return { error: res.error };
  revalidateSubstitute(cls.id);
  return { addedCount, students: merged };
}

/** Đồng bộ danh sách học viên + điểm danh + toàn bộ nhận xét đã lưu từ MindX LMS vào lớp dạy thay hiện có. */
export async function syncSubstituteRosterFromLms(input: {
  substituteClassId: string;
  sessionId?: string;
  students: { fullName: string; isAbsent?: boolean; comment?: string }[];
  importedSessions?: ImportedSubstituteSessionInput[];
}): Promise<{
  addedCount?: number;
  importedCommentsCount?: number;
  createdSessionsCount?: number;
  studentMap?: Record<string, string>;
  sessionIdsByNumber?: Record<number, string>;
  error?: string;
}> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return { error: "Phiên đăng nhập hết hạn." };

  const cls = await getSubstituteClass(input.substituteClassId, user.id);
  if (!cls) return { error: "Không tìm thấy lớp dạy thay." };

  const allIncomingNames = [
    ...input.students.map((s) => s.fullName),
    ...(input.importedSessions ?? []).flatMap((sess) =>
      Object.keys(sess.reviewsByStudentName ?? {})
    ),
  ].filter(Boolean);
  const merged = mergeSubstituteStudents(cls.students, allIncomingNames);
  const addedCount = merged.length - cls.students.length;
  const studentMap: Record<string, string> = {};
  for (const s of merged) {
    studentMap[normalizeStudentNameKey(s.full_name)] = s.id;
  }

  // Nếu caller không truyền importedSessions nhưng có comment/absent ở buổi đang mở -> đóng gói cho buổi đó
  const activeSession = input.sessionId
    ? cls.sessions.find((s) => s.id === input.sessionId)
    : undefined;
  const effectiveImportedSessions: ImportedSubstituteSessionInput[] =
    input.importedSessions && input.importedSessions.length > 0
      ? input.importedSessions
      : activeSession
        ? [
            {
              sessionNumber: activeSession.sessionNumber,
              reviewsByStudentName: Object.fromEntries(
                input.students.map((s) => [
                  s.fullName,
                  { comment: s.comment, isAbsent: s.isAbsent },
                ])
              ),
            },
          ]
        : [];

  const nowIso = new Date().toISOString();
  let importedCommentsCount = 0;
  let createdSessionsCount = 0;
  const sessionIdsByNumber: Record<number, string> = {};
  for (const s of cls.sessions) {
    sessionIdsByNumber[s.sessionNumber] = s.id;
  }

  /** Gộp nhận xét kéo từ LMS vào buổi có sẵn (chỉ điền ô còn trống, không đè nhận xét GV vừa sửa ở CodeLuma). */
  function mergeSessionReviews(
    existing: Record<string, SubstituteReviewEntry>,
    incoming: Record<string, SubstituteReviewEntry>
  ): { next: Record<string, SubstituteReviewEntry>; addedComments: number } {
    const next = { ...existing };
    let addedComments = 0;
    for (const [sid, inc] of Object.entries(incoming)) {
      const cur = next[sid];
      if (!cur) {
        next[sid] = inc;
        if (inc.ai_generated_comment) addedComments++;
      } else if (
        !cur.ai_generated_comment &&
        inc.ai_generated_comment &&
        !cur.is_absent
      ) {
        next[sid] = {
          ...cur,
          ai_generated_comment: inc.ai_generated_comment,
          is_absent: false,
        };
        addedComments++;
      } else if (
        inc.is_absent &&
        !cur.is_absent &&
        !cur.ai_generated_comment &&
        cur.strengths.length === 0 &&
        cur.improvements.length === 0
      ) {
        next[sid] = {
          strengths: [],
          improvements: [],
          ai_generated_comment: null,
          is_absent: true,
        };
      }
    }
    return { next, addedComments };
  }

  if (!substituteTablesMissing) {
    const { error: clsErr } = await supabase
      .from("substitute_classes")
      .update({
        students: merged as unknown as Json,
        updated_at: nowIso,
      })
      .eq("id", cls.id)
      .eq("teacher_id", user.id);

    if (!clsErr) {
      for (const imp of effectiveImportedSessions) {
        const num = Math.min(100, Math.max(1, Math.round(imp.sessionNumber || 1)));
        const incomingMap = buildReviewsMapForStudents(
          merged,
          imp.reviewsByStudentName ?? {}
        );
        const existingSess = cls.sessions.find((s) => s.sessionNumber === num);

        if (existingSess) {
          const { next, addedComments } = mergeSessionReviews(
            existingSess.reviews,
            incomingMap
          );
          importedCommentsCount += addedComments;
          const nextContent =
            existingSess.content?.trim() || (imp.content ?? "").trim() || null;
          const nextTitle = !isGenericSessionTitle(num, existingSess.title)
            ? existingSess.title!.trim()
            : (imp.title ?? "").trim() || `Buổi ${num}`;
          await supabase
            .from("substitute_sessions")
            .update({
              title: nextTitle,
              content: nextContent,
              reviews: next as unknown as Json,
              updated_at: nowIso,
            })
            .eq("id", existingSess.id)
            .eq("teacher_id", user.id);
        } else {
          const flags = flagsFromFormat(imp.sessionFormat);
          const { data: created } = await supabase
            .from("substitute_sessions")
            .insert({
              substitute_class_id: cls.id,
              teacher_id: user.id,
              session_number: num,
              title: (imp.title ?? "").trim() || `Buổi ${num}`,
              content: (imp.content ?? "").trim() || null,
              session_date: (imp.sessionDate ?? "").trim() || null,
              is_periodic_test: flags.is_periodic_test,
              is_project_period: flags.is_project_period,
              is_final_presentation: flags.is_final_presentation,
              reviews: incomingMap as unknown as Json,
            })
            .select("id")
            .single();

          if (created?.id) {
            sessionIdsByNumber[num] = created.id;
            createdSessionsCount++;
            importedCommentsCount += Object.values(incomingMap).filter(
              (r) => Boolean(r.ai_generated_comment)
            ).length;
          }
        }
      }

      revalidateSubstitute(cls.id);
      return {
        addedCount,
        importedCommentsCount,
        createdSessionsCount,
        studentMap,
        sessionIdsByNumber,
      };
    }
    if (!isMissingSubstituteTableError(clsErr)) {
      return { error: `Không đồng bộ được danh sách: ${clsErr.message}` };
    }
  }

  // Fallback mode
  const nextSessions = [...cls.sessions];
  for (const imp of effectiveImportedSessions) {
    const num = Math.min(100, Math.max(1, Math.round(imp.sessionNumber || 1)));
    const incomingMap = buildReviewsMapForStudents(
      merged,
      imp.reviewsByStudentName ?? {}
    );
    const idx = nextSessions.findIndex((s) => s.sessionNumber === num);
    if (idx >= 0) {
      const existingSess = nextSessions[idx];
      const { next, addedComments } = mergeSessionReviews(
        existingSess.reviews,
        incomingMap
      );
      importedCommentsCount += addedComments;
      nextSessions[idx] = {
        ...existingSess,
        title: !isGenericSessionTitle(num, existingSess.title)
          ? existingSess.title!.trim()
          : (imp.title ?? "").trim() || `Buổi ${num}`,
        content: existingSess.content?.trim() || (imp.content ?? "").trim() || null,
        reviews: next,
        updatedAt: nowIso,
      };
    } else {
      const flags = flagsFromFormat(imp.sessionFormat);
      const newId = createLocalUuid();
      sessionIdsByNumber[num] = newId;
      createdSessionsCount++;
      importedCommentsCount += Object.values(incomingMap).filter(
        (r) => Boolean(r.ai_generated_comment)
      ).length;
      nextSessions.push({
        id: newId,
        substituteClassId: cls.id,
        sessionNumber: num,
        title: (imp.title ?? "").trim() || `Buổi ${num}`,
        content: (imp.content ?? "").trim() || null,
        reviewContext: null,
        sessionDate: (imp.sessionDate ?? "").trim() || null,
        isPeriodicTest: flags.is_periodic_test,
        isProjectPeriod: flags.is_project_period,
        isFinalPresentation: flags.is_final_presentation,
        reviews: incomingMap,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }
  nextSessions.sort((a, b) => a.sessionNumber - b.sessionNumber);

  const res = await saveFallbackSubstituteClass(user.id, {
    ...cls,
    students: merged,
    sessions: nextSessions,
  });
  if (res.error) return { error: res.error };
  revalidateSubstitute(cls.id);
  return {
    addedCount,
    importedCommentsCount,
    createdSessionsCount,
    studentMap,
    sessionIdsByNumber,
  };
}

/** Đổi tên hoặc xếp loại học lực (Giỏi/Khá/TB/Cần cố gắng) của 1 học viên trong lớp dạy thay. */
export async function updateSubstituteStudent(input: {
  substituteClassId: string;
  studentId: string;
  fullName?: string;
  academicLevel?: string | null;
}): Promise<ActionResult> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return { error: "Phiên đăng nhập hết hạn." };

  const cls = await getSubstituteClass(input.substituteClassId, user.id);
  if (!cls) return { error: "Không tìm thấy lớp dạy thay." };

  let changed = false;
  const nextStudents = cls.students.map((s) => {
    if (s.id !== input.studentId) return s;
    changed = true;
    const nextName =
      typeof input.fullName === "string" && input.fullName.trim()
        ? input.fullName.trim().slice(0, 100)
        : s.full_name;
    const nextLevel =
      input.academicLevel === undefined
        ? s.academic_level
        : input.academicLevel && isAcademicLevel(input.academicLevel)
          ? input.academicLevel
          : null;
    return { ...s, full_name: nextName, academic_level: nextLevel };
  });

  if (!changed) return { error: "Không tìm thấy học viên trong lớp." };

  if (!substituteTablesMissing) {
    const { error } = await supabase
      .from("substitute_classes")
      .update({
        students: nextStudents as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cls.id)
      .eq("teacher_id", user.id);

    if (!error) {
      revalidateSubstitute(cls.id);
      return { success: "Đã cập nhật học viên." };
    }
    if (!isMissingSubstituteTableError(error)) {
      return { error: `Không cập nhật được: ${error.message}` };
    }
  }

  const res = await saveFallbackSubstituteClass(user.id, {
    ...cls,
    students: nextStudents,
  });
  if (res.error) return res;
  revalidateSubstitute(cls.id);
  return { success: "Đã cập nhật học viên." };
}

/** Xóa 1 học viên khỏi lớp dạy thay (dọn luôn nhận xét của em đó trong các buổi dạy thay). */
export async function removeSubstituteStudent(input: {
  substituteClassId: string;
  studentId: string;
}): Promise<ActionResult> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return { error: "Phiên đăng nhập hết hạn." };

  const cls = await getSubstituteClass(input.substituteClassId, user.id);
  if (!cls) return { error: "Không tìm thấy lớp dạy thay." };

  const nextStudents = cls.students.filter((s) => s.id !== input.studentId);

  if (!substituteTablesMissing) {
    const { error } = await supabase
      .from("substitute_classes")
      .update({
        students: nextStudents as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cls.id)
      .eq("teacher_id", user.id);

    if (!error) {
      // Dọn key nhận xét mồ côi trong các buổi
      for (const sess of cls.sessions) {
        if (input.studentId in sess.reviews) {
          const nextReviews = { ...sess.reviews };
          delete nextReviews[input.studentId];
          await supabase
            .from("substitute_sessions")
            .update({ reviews: nextReviews as unknown as Json })
            .eq("id", sess.id)
            .eq("teacher_id", user.id);
        }
      }
      revalidateSubstitute(cls.id);
      return { success: "Đã xóa học viên khỏi lớp dạy thay." };
    }
    if (!isMissingSubstituteTableError(error)) {
      return { error: `Không xóa được học viên: ${error.message}` };
    }
  }

  const nextSessions = cls.sessions.map((sess) => {
    if (!(input.studentId in sess.reviews)) return sess;
    const nextReviews = { ...sess.reviews };
    delete nextReviews[input.studentId];
    return { ...sess, reviews: nextReviews };
  });
  const res = await saveFallbackSubstituteClass(user.id, {
    ...cls,
    students: nextStudents,
    sessions: nextSessions,
  });
  if (res.error) return res;
  revalidateSubstitute(cls.id);
  return { success: "Đã xóa học viên khỏi lớp dạy thay." };
}

/** Thêm 1 buổi dạy thay mới trong lớp dạy thay đang có (VD tuần sau dạy thay tiếp buổi kế). */
export async function createSubstituteSession(input: {
  substituteClassId: string;
  sessionNumber: number;
  title?: string;
  content?: string;
  sessionFormat?: SessionFormat;
  sessionDate?: string;
}): Promise<{ sessionId?: string; error?: string }> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return { error: "Phiên đăng nhập hết hạn." };

  const sessionNumber = Math.min(100, Math.max(1, Math.round(input.sessionNumber || 1)));
  const cls = await getSubstituteClass(input.substituteClassId, user.id);
  if (!cls) return { error: "Không tìm thấy lớp dạy thay." };

  if (cls.sessions.some((s) => s.sessionNumber === sessionNumber)) {
    return { error: `Buổi ${sessionNumber} đã tồn tại trong lớp ${cls.classCode}.` };
  }

  const flags = flagsFromFormat(input.sessionFormat);
  const title = (input.title ?? "").trim() || `Buổi ${sessionNumber}`;
  const content = (input.content ?? "").trim() || null;
  const sessionDate = (input.sessionDate ?? "").trim() || null;
  const nowIso = new Date().toISOString();

  if (!substituteTablesMissing) {
    const { data, error } = await supabase
      .from("substitute_sessions")
      .insert({
        substitute_class_id: cls.id,
        teacher_id: user.id,
        session_number: sessionNumber,
        title,
        content,
        session_date: sessionDate,
        is_periodic_test: flags.is_periodic_test,
        is_project_period: flags.is_project_period,
        is_final_presentation: flags.is_final_presentation,
        reviews: {} as Json,
      })
      .select("id")
      .single();

    if (!error && data) {
      await supabase
        .from("substitute_classes")
        .update({ updated_at: nowIso })
        .eq("id", cls.id)
        .eq("teacher_id", user.id);
      revalidateSubstitute(cls.id);
      return { sessionId: data.id };
    }
    if (!isMissingSubstituteTableError(error)) {
      if (error?.code === "23505") {
        return { error: `Buổi ${sessionNumber} đã tồn tại.` };
      }
      return { error: `Không tạo được buổi: ${error?.message ?? "lỗi không rõ"}` };
    }
  }

  const newSess: SubstituteSession = {
    id: createLocalUuid(),
    substituteClassId: cls.id,
    sessionNumber,
    title,
    content,
    reviewContext: null,
    sessionDate,
    isPeriodicTest: flags.is_periodic_test,
    isProjectPeriod: flags.is_project_period,
    isFinalPresentation: flags.is_final_presentation,
    reviews: {},
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const res = await saveFallbackSubstituteClass(user.id, {
    ...cls,
    sessions: [...cls.sessions, newSess].sort(
      (a, b) => a.sessionNumber - b.sessionNumber
    ),
  });
  if (res.error) return { error: res.error };
  revalidateSubstitute(cls.id);
  return { sessionId: newSess.id };
}

/** Cập nhật thông tin 1 buổi dạy thay (tiêu đề, nội dung, bối cảnh, hình thức, ngày). */
export async function updateSubstituteSession(input: {
  substituteClassId: string;
  sessionId: string;
  title: string;
  content: string;
  reviewContext: string;
  sessionDate: string;
  sessionFormat: SessionFormat;
}): Promise<ActionResult> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return { error: "Phiên đăng nhập hết hạn." };

  const flags = flagsFromFormat(input.sessionFormat);
  const nowIso = new Date().toISOString();

  if (!substituteTablesMissing) {
    const { error } = await supabase
      .from("substitute_sessions")
      .update({
        title: input.title.trim() || null,
        content: input.content.trim() || null,
        review_context: input.reviewContext.trim() || null,
        session_date: input.sessionDate.trim() || null,
        is_periodic_test: flags.is_periodic_test,
        is_project_period: flags.is_project_period,
        is_final_presentation: flags.is_final_presentation,
        updated_at: nowIso,
      })
      .eq("id", input.sessionId)
      .eq("teacher_id", user.id);

    if (!error) {
      await supabase
        .from("substitute_classes")
        .update({ updated_at: nowIso })
        .eq("id", input.substituteClassId)
        .eq("teacher_id", user.id);
      revalidateSubstitute(input.substituteClassId);
      return { success: "Đã lưu nội dung buổi dạy thay." };
    }
    if (!isMissingSubstituteTableError(error)) {
      return { error: `Không lưu được buổi học: ${error.message}` };
    }
  }

  const cls = await getFallbackSubstituteClass(user.id, input.substituteClassId);
  if (!cls) return { error: "Không tìm thấy lớp dạy thay." };
  const nextSessions = cls.sessions.map((s) =>
    s.id === input.sessionId
      ? {
          ...s,
          title: input.title.trim() || null,
          content: input.content.trim() || null,
          reviewContext: input.reviewContext.trim() || null,
          sessionDate: input.sessionDate.trim() || null,
          isPeriodicTest: flags.is_periodic_test,
          isProjectPeriod: flags.is_project_period,
          isFinalPresentation: flags.is_final_presentation,
          updatedAt: nowIso,
        }
      : s
  );
  const res = await saveFallbackSubstituteClass(user.id, {
    ...cls,
    sessions: nextSessions,
  });
  if (res.error) return res;
  revalidateSubstitute(cls.id);
  return { success: "Đã lưu nội dung buổi dạy thay." };
}

/** Xóa 1 buổi dạy thay cụ thể trong lớp dạy thay. */
export async function deleteSubstituteSession(input: {
  substituteClassId: string;
  sessionId: string;
}): Promise<ActionResult> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return { error: "Phiên đăng nhập hết hạn." };

  if (!substituteTablesMissing) {
    const { error } = await supabase
      .from("substitute_sessions")
      .delete()
      .eq("id", input.sessionId)
      .eq("teacher_id", user.id);

    if (!error) {
      revalidateSubstitute(input.substituteClassId);
      return { success: "Đã xóa buổi dạy thay." };
    }
    if (!isMissingSubstituteTableError(error)) {
      return { error: `Không xóa được buổi: ${error.message}` };
    }
  }

  const cls = await getFallbackSubstituteClass(user.id, input.substituteClassId);
  if (!cls) return { error: "Không tìm thấy lớp dạy thay." };
  const res = await saveFallbackSubstituteClass(user.id, {
    ...cls,
    sessions: cls.sessions.filter((s) => s.id !== input.sessionId),
  });
  if (res.error) return res;
  revalidateSubstitute(input.substituteClassId);
  return { success: "Đã xóa buổi dạy thay." };
}

/**
 * Lưu nhận xét 1 học viên trong buổi dạy thay — giữ ĐÚNG chữ ký FormData của `saveReview`
 * để tái sử dụng nguyên vẹn component `ReviewEditor` & `ReviewList`.
 */
export async function saveSubstituteStudentReview(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const substituteClassId = String(formData.get("substitute_class_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const isAbsent = formData.get("is_absent") === "true";

  if (!substituteClassId || !sessionId || !studentId) {
    return { error: "Thiếu thông tin buổi dạy thay / học viên." };
  }

  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const strengths = isAbsent ? [] : formData.getAll("strengths").map(String);
  const improvements = isAbsent
    ? []
    : formData.getAll("improvements").map(String);
  const aiComment = isAbsent
    ? ""
    : String(formData.get("ai_comment") ?? "").trim();

  const entry: SubstituteReviewEntry = {
    strengths,
    improvements,
    ai_generated_comment: aiComment || null,
    is_absent: isAbsent,
  };
  const nowIso = new Date().toISOString();

  if (!substituteTablesMissing) {
    const { data: sessRow, error: readErr } = await supabase
      .from("substitute_sessions")
      .select("id, reviews")
      .eq("id", sessionId)
      .eq("substitute_class_id", substituteClassId)
      .eq("teacher_id", user.id)
      .maybeSingle();

    if (!readErr && sessRow) {
      const currentReviews = sanitizeSubstituteReviews(sessRow.reviews);
      const nextReviews: Record<string, SubstituteReviewEntry> = {
        ...currentReviews,
        [studentId]: entry,
      };
      const { error: updErr } = await supabase
        .from("substitute_sessions")
        .update({
          reviews: nextReviews as unknown as Json,
          updated_at: nowIso,
        })
        .eq("id", sessionId)
        .eq("teacher_id", user.id);

      if (updErr) {
        return { error: `Không lưu được nhận xét: ${updErr.message}` };
      }

      await supabase
        .from("substitute_classes")
        .update({ updated_at: nowIso })
        .eq("id", substituteClassId)
        .eq("teacher_id", user.id);

      revalidateSubstitute(substituteClassId);
      return { success: isAbsent ? "Đã đánh dấu vắng mặt." : "Đã lưu nhận xét." };
    }

    if (!isMissingSubstituteTableError(readErr)) {
      return { error: `Không tìm thấy buổi dạy thay: ${readErr?.message ?? ""}` };
    }
  }

  const cls = await getFallbackSubstituteClass(user.id, substituteClassId);
  if (!cls) return { error: "Không tìm thấy lớp dạy thay." };

  const nextSessions = cls.sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          reviews: { ...s.reviews, [studentId]: entry },
          updatedAt: nowIso,
        }
      : s
  );
  const res = await saveFallbackSubstituteClass(user.id, {
    ...cls,
    sessions: nextSessions,
  });
  if (res.error) return res;

  revalidateSubstitute(substituteClassId);
  return { success: isAbsent ? "Đã đánh dấu vắng mặt." : "Đã lưu nhận xét." };
}

export interface CurriculumTemplateOption {
  classCode: string;
  sessionNumber: number;
  title: string;
  content: string;
  sessionFormat: SessionFormat;
}

/**
 * Tìm nội dung buổi học cùng số buổi từ các lớp cố định của chính giáo viên
 * (ưu tiên cùng khóa học) để chép nhanh 1 chạm vào buổi dạy thay.
 */
export async function listCurriculumTemplatesForSubstitute(input: {
  courseId?: string | null;
  sessionNumber: number;
}): Promise<CurriculumTemplateOption[]> {
  const { supabase, user, isTeacher } = await requireTeacherUser();
  if (!user || !isTeacher) return [];

  const classQuery = supabase
    .from("classes")
    .select("id, class_code, course_id")
    .eq("teacher_id", user.id);

  const { data: classes } = input.courseId
    ? await classQuery.eq("course_id", input.courseId)
    : await classQuery;

  if (!classes || classes.length === 0) return [];

  const classCodeById = new Map(classes.map((c) => [c.id, c.class_code]));
  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "class_id, session_number, title, content, is_periodic_test, is_project_period, is_final_presentation"
    )
    .in("class_id", classes.map((c) => c.id))
    .eq("session_number", input.sessionNumber);

  const results: CurriculumTemplateOption[] = [];
  for (const s of sessions ?? []) {
    if (!s.content?.trim() && !s.title?.trim()) continue;
    const format: SessionFormat = s.is_final_presentation
      ? "final_presentation"
      : s.is_periodic_test
        ? "periodic_test"
        : s.is_project_period
          ? "project_period"
          : "standard";
    results.push({
      classCode: classCodeById.get(s.class_id) ?? "",
      sessionNumber: s.session_number,
      title: s.title ?? `Buổi ${s.session_number}`,
      content: s.content ?? "",
      sessionFormat: format,
    });
  }

  return results.sort((a, b) =>
    a.classCode.localeCompare(b.classCode, "vi", { numeric: true })
  );
}

/** FormData wrapper cho ConfirmDialog: xóa sạch lớp dạy thay (kèm redirect tùy chọn). */
export async function deleteSubstituteClassForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "");
  if (!id) return;
  await deleteSubstituteClass(id);
  if (redirectTo) {
    redirect(redirectTo);
  }
}

/** FormData wrapper cho ConfirmDialog: xóa 1 buổi dạy thay. */
export async function deleteSubstituteSessionForm(formData: FormData): Promise<void> {
  const substituteClassId = String(formData.get("substitute_class_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  if (!substituteClassId || !sessionId) return;
  await deleteSubstituteSession({ substituteClassId, sessionId });
}

/** FormData wrapper cho ConfirmDialog: xóa 1 học viên khỏi lớp dạy thay. */
export async function removeSubstituteStudentForm(formData: FormData): Promise<void> {
  const substituteClassId = String(formData.get("substitute_class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!substituteClassId || !studentId) return;
  await removeSubstituteStudent({ substituteClassId, studentId });
}
