// Đọc dữ liệu đề bài Checkpoints công khai dành cho học viên — không cần đăng nhập.
// Chỉ server — trang học viên xem đề là Server Component, dùng createAdminClient.
import "server-only";

import { cache } from "react";

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

  if (TEXT_EXTENSIONS.includes(ext)) {
    const { data: blob, error } = await admin.storage
      .from(SPEC_BUCKET)
      .download(path);
    if (!error && blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (!looksEncrypted(bytes)) {
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

  if (ext === "docx") {
    const { data: blob, error } = await admin.storage
      .from(SPEC_BUCKET)
      .download(path);
    if (!error && blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (!looksEncrypted(bytes)) {
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
export const loadPublicCheckpoint = cache(
  async (assignmentId: string): Promise<PublicCheckpointPayload | null> => {
    if (!assignmentId || !UUID_PATTERN.test(assignmentId)) {
      return null;
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("assignments")
      .select(
        "id, course_id, session_number, title, spec_file_path, instructions, attachment_file_paths, courses(id, code, name)"
      )
      .eq("id", assignmentId)
      .single();

    if (error || !data) {
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
      data.attachment_file_paths
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
);
