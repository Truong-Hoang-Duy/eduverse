/**
 * Domain helpers cho không gian "Lớp dạy thay" (khi giáo viên nhận dạy thay lớp của GV khác).
 *
 * Nguyên tắc thiết kế:
 * - Tách biệt 100% khỏi `classes`, `enrollments`, `profiles` để học viên lớp dạy thay
 *   không cần tài khoản CodeLuma, không làm nhiễu thống kê/Gallery/đăng ký học viên,
 *   và giáo viên có thể xóa sạch lớp dạy thay + mọi buổi của lớp đó bất cứ lúc nào.
 * - Hỗ trợ song song bảng `substitute_classes` + `substitute_sessions` và cơ chế dự phòng
 *   an toàn (prefix `__SUBSTITUTE_CLASS__:`) nếu DB live chưa kịp áp file migration SQL.
 */

import { isAcademicLevel } from "@/lib/academic-levels";

export const SUBSTITUTE_CLASS_FALLBACK_PREFIX = "__SUBSTITUTE_CLASS__:";

/**
 * Ngữ cảnh bổ sung truyền cho AI khi viết nhận xét buổi dạy thay:
 * giúp AI tập trung phản ánh biểu hiện thực tế trong buổi hôm nay và KHÔNG bịa
 * lời so sánh "so với các buổi trước" khi không có lịch sử buổi trước.
 */
export const SUBSTITUTE_TEACHING_AI_NOTE =
  "Bối cảnh bổ sung: Thầy là giáo viên nhận dạy thay buổi học này (không phải giáo viên dạy cố định từ đầu khóa). Chỉ nhận xét dựa trên biểu hiện thực tế của em trong buổi hôm nay và dữ liệu được cung cấp; tuyệt đối không tự suy diễn hay so sánh với các buổi học trước nếu không có lịch sử kèm theo.";

export interface SubstituteStudent {
  id: string;
  full_name: string;
  academic_level: string | null;
}

export interface SubstituteReviewEntry {
  strengths: string[];
  improvements: string[];
  ai_generated_comment: string | null;
  is_absent: boolean;
}

export interface SubstituteSession {
  id: string;
  substituteClassId: string;
  sessionNumber: number;
  title: string | null;
  content: string | null;
  reviewContext: string | null;
  sessionDate: string | null;
  isPeriodicTest: boolean;
  isProjectPeriod: boolean;
  isFinalPresentation: boolean;
  reviews: Record<string, SubstituteReviewEntry>;
  createdAt: string;
  updatedAt: string;
}

export interface SubstituteClass {
  id: string;
  courseId: string | null;
  courseName: string;
  classCode: string;
  notes: string | null;
  students: SubstituteStudent[];
  sessions: SubstituteSession[];
  createdAt: string;
  updatedAt: string;
}

/** Chuẩn hóa mã lớp dạy thay (chấp nhận cả dạng BH-CSA06, ONL-JSB12, JSB05...). */
export function normalizeSubstituteClassCode(raw: string): string {
  return raw
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase()
    .slice(0, 40);
}

/** Chuẩn hóa tên học viên để đối chiếu không trùng lặp. */
export function normalizeStudentNameKey(name: string): string {
  return name
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Tách danh sách họ tên dán hàng loạt (mỗi dòng 1 em hoặc phân tách dấu chấm phẩy):
 * tự bỏ số thứ tự đầu dòng (`1. `, `2) `, `- `, `• `), bỏ dòng trống và lọc trùng.
 */
export function parseBulkStudentNames(rawText: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawLine of rawText.split(/\r?\n|;/)) {
    const cleaned = rawLine
      .replace(/^\s*(?:\d+[.)\-:]\s*|[-•*+]\s+)/, "")
      .replace(/\t+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    if (!cleaned) continue;

    const key = normalizeStudentNameKey(cleaned);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

/** Sinh ID ngắn ổn định cho học viên/buổi dạy thay (dùng crypto.randomUUID khi có). */
export function createLocalUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Gộp thêm danh sách tên mới vào roster sẵn có (bỏ qua tên đã tồn tại không phân biệt hoa/thường).
 */
export function mergeSubstituteStudents(
  existing: SubstituteStudent[],
  incomingNames: string[],
  idFactory: () => string = createLocalUuid
): SubstituteStudent[] {
  const seen = new Set(existing.map((s) => normalizeStudentNameKey(s.full_name)));
  const merged = [...existing];

  for (const name of incomingNames) {
    const trimmed = name.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, 100);
    if (!trimmed) continue;
    const key = normalizeStudentNameKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: idFactory(),
      full_name: trimmed,
      academic_level: null,
    });
  }

  return merged;
}

/** Làm sạch dữ liệu JSONB `students` đọc từ DB. */
export function sanitizeSubstituteStudents(raw: unknown): SubstituteStudent[] {
  if (!Array.isArray(raw)) return [];
  const result: SubstituteStudent[] = [];
  const seenIds = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : "";
    const fullName =
      typeof rec.full_name === "string" ? rec.full_name.trim().slice(0, 100) : "";
    if (!id || !fullName || seenIds.has(id)) continue;
    seenIds.add(id);

    const rawLevel =
      typeof rec.academic_level === "string" ? rec.academic_level : null;
    result.push({
      id,
      full_name: fullName,
      academic_level: rawLevel && isAcademicLevel(rawLevel) ? rawLevel : null,
    });
  }

  return result;
}

/** Làm sạch dữ liệu JSONB `reviews` đọc từ DB. */
export function sanitizeSubstituteReviews(
  raw: unknown
): Record<string, SubstituteReviewEntry> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: Record<string, SubstituteReviewEntry> = {};

  for (const [studentId, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!studentId || !val || typeof val !== "object" || Array.isArray(val)) continue;
    const rec = val as Record<string, unknown>;
    const strengths = Array.isArray(rec.strengths)
      ? rec.strengths.filter((s): s is string => typeof s === "string")
      : [];
    const improvements = Array.isArray(rec.improvements)
      ? rec.improvements.filter((s): s is string => typeof s === "string")
      : [];
    const comment =
      typeof rec.ai_generated_comment === "string" && rec.ai_generated_comment.trim()
        ? rec.ai_generated_comment.trim()
        : null;
    const isAbsent = Boolean(rec.is_absent);

    result[studentId] = {
      strengths: isAbsent ? [] : strengths,
      improvements: isAbsent ? [] : improvements,
      ai_generated_comment: isAbsent ? null : comment,
      is_absent: isAbsent,
    };
  }

  return result;
}

/** Đếm số học viên đã được xử lý (đã nhận xét hoặc đánh vắng) trong 1 buổi dạy thay. */
export function countHandledInSubstituteSession(
  session: SubstituteSession,
  students: SubstituteStudent[]
): number {
  let count = 0;
  for (const s of students) {
    const rev = session.reviews[s.id];
    if (!rev) continue;
    if (
      rev.is_absent ||
      rev.strengths.length > 0 ||
      rev.improvements.length > 0 ||
      Boolean(rev.ai_generated_comment?.trim())
    ) {
      count++;
    }
  }
  return count;
}

/** Kiểm tra tiêu đề buổi có chỉ là nhãn mặc định "Buổi N" hay trống không. */
export function isGenericSessionTitle(
  sessionNumber: number,
  title?: string | null
): boolean {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return true;
  const re = new RegExp(`^buổi\\s*${sessionNumber}$`, "i");
  return re.test(trimmed);
}

/**
 * Định dạng tiêu đề khối "Nội dung Buổi N" tránh lặp chữ "Buổi N: Buổi N"
 * (VD: title="Buổi 2" -> "Nội dung Buổi 2"; title="Buổi 2: Thu thập dữ liệu" -> "Nội dung Buổi 2: Thu thập dữ liệu").
 */
export function formatSubstituteSessionHeading(
  sessionNumber: number,
  title?: string | null
): string {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return `Nội dung Buổi ${sessionNumber}`;

  const prefixRe = new RegExp(
    `^buổi\\s*${sessionNumber}\\s*(?:[:\\-–—]\\s*)?`,
    "i"
  );
  const subtitle = trimmed.replace(prefixRe, "").trim();
  return subtitle
    ? `Nội dung Buổi ${sessionNumber}: ${subtitle}`
    : `Nội dung Buổi ${sessionNumber}`;
}

/** Gắn ngữ cảnh dạy thay vào `sessionContext` khi gọi AI (tránh trùng lặp nếu đã có). */
export function withSubstituteTeachingContext(
  sessionContext: string | null | undefined,
  isSubstituteTeaching?: boolean
): string | undefined {
  const base = (sessionContext ?? "").trim();
  if (!isSubstituteTeaching) return base || undefined;
  if (base.includes(SUBSTITUTE_TEACHING_AI_NOTE)) return base;
  return base ? `${base}\n${SUBSTITUTE_TEACHING_AI_NOTE}` : SUBSTITUTE_TEACHING_AI_NOTE;
}

/** Mã hóa lớp dạy thay (gồm cả danh sách buổi) sang dòng fallback khi DB chưa chạy migration. */
export function encodeSubstituteClassFallback(cls: SubstituteClass): {
  name: string;
  template_text: string;
} {
  return {
    name: `${SUBSTITUTE_CLASS_FALLBACK_PREFIX}${cls.classCode}:${cls.id}`,
    template_text: JSON.stringify(cls),
  };
}

/** Giải mã dòng fallback từ `zalo_templates` thành `SubstituteClass`. */
export function decodeSubstituteClassFallback(row: {
  id: string;
  name: string;
  template_text: string;
  created_at?: string;
}): SubstituteClass | null {
  if (!row.name.startsWith(SUBSTITUTE_CLASS_FALLBACK_PREFIX)) return null;
  try {
    const parsed = JSON.parse(row.template_text) as Partial<SubstituteClass>;
    if (!parsed || typeof parsed !== "object" || !parsed.classCode) return null;

    const classId = row.id;
    const students = sanitizeSubstituteStudents(parsed.students);
    const rawSessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    const sessions: SubstituteSession[] = rawSessions
      .filter((s): s is SubstituteSession => Boolean(s && typeof s === "object"))
      .map((s) => ({
        id: typeof s.id === "string" && s.id ? s.id : createLocalUuid(),
        substituteClassId: classId,
        sessionNumber:
          typeof s.sessionNumber === "number" && s.sessionNumber >= 1
            ? Math.min(100, Math.round(s.sessionNumber))
            : 1,
        title: typeof s.title === "string" ? s.title : null,
        content: typeof s.content === "string" ? s.content : null,
        reviewContext: typeof s.reviewContext === "string" ? s.reviewContext : null,
        sessionDate: typeof s.sessionDate === "string" ? s.sessionDate : null,
        isPeriodicTest: Boolean(s.isPeriodicTest),
        isProjectPeriod: Boolean(s.isProjectPeriod),
        isFinalPresentation: Boolean(s.isFinalPresentation),
        reviews: sanitizeSubstituteReviews(s.reviews),
        createdAt: typeof s.createdAt === "string" ? s.createdAt : row.created_at ?? new Date().toISOString(),
        updatedAt: typeof s.updatedAt === "string" ? s.updatedAt : row.created_at ?? new Date().toISOString(),
      }))
      .sort((a, b) => a.sessionNumber - b.sessionNumber);

    return {
      id: classId,
      courseId: typeof parsed.courseId === "string" ? parsed.courseId : null,
      courseName: typeof parsed.courseName === "string" ? parsed.courseName : "",
      classCode: normalizeSubstituteClassCode(parsed.classCode),
      notes: typeof parsed.notes === "string" ? parsed.notes : null,
      students,
      sessions,
      createdAt:
        typeof parsed.createdAt === "string"
          ? parsed.createdAt
          : (row.created_at ?? new Date().toISOString()),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : (row.created_at ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}
