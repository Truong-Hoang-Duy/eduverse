// Đọc dữ liệu đề bài Checkpoints công khai dành cho học viên — không cần đăng nhập.
// Chỉ server — trang học viên xem đề là Server Component, dùng createAdminClient.
import "server-only";

import {
  cleanInstructionsForDisplay,
  extractAttachmentPaths,
  getDisplayFileName,
  isCheckpointAssignment,
} from "@/lib/assignment-utils";
import { docxToText } from "@/lib/docx-text";
import { looksEncrypted } from "@/lib/file-check";
import { SPEC_BUCKET } from "@/lib/spec-storage";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AssignmentSpecFile {
  path: string;
  fileName: string;
  isMain: boolean;
  kind: "text" | "image" | "pdf" | "download";
  content?: string;
  url?: string;
}

export interface PublicCheckpointPayload {
  id: string;
  title: string;
  sessionNumber: number;
  courseCode: string;
  courseName: string;
  instructions: string;
  files: AssignmentSpecFile[];
}

const TEXT_EXTENSIONS = [
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "sql",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "c",
  "cpp",
  "cs",
  "html",
  "css",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


async function loadFileContent(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
  isMain: boolean
): Promise<AssignmentSpecFile | null> {
  const fileName = getDisplayFileName(path);
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  // Tạo signed URL có thời hạn 10 phút (600s) cho học viên xem/tải
  const { data: signed } = await admin.storage
    .from(SPEC_BUCKET)
    .createSignedUrl(path, 600);
  const downloadUrl = signed?.signedUrl;

  const needsContent = TEXT_EXTENSIONS.includes(ext) || ext === "docx";
  if (needsContent) {
    const { data: blob, error } = await admin.storage
      .from(SPEC_BUCKET)
      .download(path);

    if (!error && blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (!looksEncrypted(bytes)) {
        if (ext === "docx") {
          const text = docxToText(bytes);
          if (text) {
            return {
              path,
              fileName,
              isMain,
              kind: "text",
              content: text,
              url: downloadUrl,
            };
          }
        } else {
          return {
            path,
            fileName,
            isMain,
            kind: "text",
            content: new TextDecoder().decode(bytes),
            url: downloadUrl,
          };
        }
      }
    }
  }

  const isImg = /^(png|jpe?g|gif|webp|svg)$/i.test(ext);
  const kind: AssignmentSpecFile["kind"] =
    ext === "pdf" ? "pdf" : isImg ? "image" : "download";

  return {
    path,
    fileName,
    isMain,
    kind,
    url: downloadUrl,
  };
}


/**
 * Đọc dữ liệu đề bài Checkpoint công khai dành cho học viên (không cần đăng nhập).
 * Bắt buộc tiêu đề đề bài phải chứa từ khóa 'checkpoint' hoặc 'checkpoints'.
 * Mọi trường hợp khác (ID sai, đề không phải checkpoint, đề không tồn tại) đều trả về null.
 */
/**
 * Tìm đề bài theo UUID hoặc các định dạng alias thân thiện (csa-5, csa, 5...).
 */
export async function findAssignmentRecord(
  admin: ReturnType<typeof createAdminClient>,
  identifier: string
) {
  const clean = String(identifier ?? "").trim();
  if (!clean) return null;

  async function querySingle(id: string) {
    const { data } = await admin
      .from("assignments")
      .select(
        "id, course_id, session_number, title, spec_file_path, instructions, courses(id, code, name)"
      )
      .eq("id", id)
      .maybeSingle();

    return data ?? null;
  }

  // 1. Nếu là UUID trực tiếp
  if (UUID_PATTERN.test(clean)) {
    return querySingle(clean);
  }

  // 2. Alias dạng [Mã khóa]-[Số buổi]: csa-5, csa_5, csa-buoi-5, csa5, csb-9...
  const courseSessionMatch = clean.match(
    /^([a-zA-Z0-9]+)[-_]?(?:buoi[-_]?)?(\d+)$/i
  );
  if (courseSessionMatch) {
    const code = courseSessionMatch[1];
    const session = Number(courseSessionMatch[2]);
    const { data: courses } = await admin
      .from("courses")
      .select("id")
      .ilike("code", code);

    if (courses && courses.length > 0) {
      const courseIds = courses.map((c) => c.id);
      const { data } = await admin
        .from("assignments")
        .select(
          "id, course_id, session_number, title, spec_file_path, instructions, courses(id, code, name)"
        )
        .in("course_id", courseIds)
        .eq("session_number", session)
        .maybeSingle();

      if (data) return data;
    }
  }

  // 3. Alias chỉ có số buổi: "5", "buoi-5", "buoi5"
  const sessionOnlyMatch = clean.match(/^(?:buoi[-_]?)?(\d+)$/i);
  if (sessionOnlyMatch) {
    const session = Number(sessionOnlyMatch[1]);
    const { data: fbList } = await admin
      .from("assignments")
      .select(
        "id, course_id, session_number, title, spec_file_path, instructions, courses(id, code, name)"
      )
      .eq("session_number", session);

    if (fbList && fbList.length > 0) {
      const checkpoints = fbList.filter((a) =>
        isCheckpointAssignment(a.title)
      );
      if (checkpoints.length > 0) {
        // Ưu tiên lớp CSA nếu tìm thấy
        const found =
          checkpoints.find(
            (a) =>
              (Array.isArray(a.courses) ? a.courses[0] : a.courses)?.code?.toUpperCase() === "CSA"
          ) ?? checkpoints[0];
        return found;
      }
    }
  }

  // 4. Alias chỉ có mã khóa: "csa", "csb"
  const { data: courses } = await admin
    .from("courses")
    .select("id")
    .ilike("code", clean);

  if (courses && courses.length > 0) {
    const courseIds = courses.map((c) => c.id);
    const { data: fbList } = await admin
      .from("assignments")
      .select(
        "id, course_id, session_number, title, spec_file_path, instructions, courses(id, code, name)"
      )
      .in("course_id", courseIds)
      .order("session_number", { ascending: false });

    if (fbList && fbList.length > 0) {
      const checkpoints = fbList.filter((a) =>
        isCheckpointAssignment(a.title)
      );
      if (checkpoints.length > 0) return checkpoints[0];
    }
  }

  return null;
}

/**
 * Chỉ lấy tiêu đề của đề bài Checkpoint để phục vụ generateMetadata (siêu nhẹ, không tải file).
 */
export async function loadCheckpointTitle(
  identifier: string
): Promise<string | null> {
  if (!identifier) return null;
  const admin = createAdminClient();
  const data = await findAssignmentRecord(admin, identifier);
  if (!data || !isCheckpointAssignment(data.title)) return null;
  return data.title;
}

/**
 * Đọc dữ liệu đề bài Checkpoint công khai dành cho học viên (không cần đăng nhập).
 * Bắt buộc tiêu đề đề bài phải chứa từ khóa 'checkpoint' hoặc 'checkpoints'.
 * Mọi trường hợp khác (ID sai, đề không phải checkpoint, đề không tồn tại) đều trả về null.
 */
export async function loadPublicCheckpoint(
  identifier: string
): Promise<PublicCheckpointPayload | null> {
  if (!identifier) return null;



  const admin = createAdminClient();
  const data = await findAssignmentRecord(admin, identifier);

  if (!data) {
    return null;
  }



    // BẮT BUỘC: Chỉ các đề bài có chữ Checkpoint/Checkpoints mới được xem công khai
    if (!isCheckpointAssignment(data.title)) {
      return null;
    }

    const course = Array.isArray(data.courses)
      ? data.courses[0]
      : data.courses;

    const attachmentPaths = extractAttachmentPaths(
      data.instructions,
      (data as { attachment_file_paths?: string[] | null }).attachment_file_paths
    );

    const pathsToLoad = [
      ...(data.spec_file_path
        ? [{ path: data.spec_file_path, isMain: true }]
        : []),
      ...attachmentPaths.map((p) => ({ path: p, isMain: false })),
    ];

    const files: AssignmentSpecFile[] = [];
    for (const item of pathsToLoad) {
      const f = await loadFileContent(admin, item.path, item.isMain);
      if (f) files.push(f);
    }

    return {
      id: data.id,
      title: data.title,
      sessionNumber: data.session_number,
      courseCode: course?.code ?? "",
      courseName: course?.name ?? "",
      instructions: cleanInstructionsForDisplay(data.instructions),
      files,
    };
  }

