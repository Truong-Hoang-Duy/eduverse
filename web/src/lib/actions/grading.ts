"use server";

import { revalidatePath } from "next/cache";

import { getMyApiKey } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import { looksEncrypted } from "@/lib/file-check";
import {
  removeSpecFiles,
  sanitizeFileName,
  SPEC_BUCKET,
  SPEC_MAX_BYTES,
} from "@/lib/spec-storage";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// ---------- Đề bài (assignments) — thứ DUY NHẤT được lưu ----------

/**
 * File đề đi qua chính action này chứ KHÔNG upload sẵn từ client lúc chọn file:
 * upload sớm thì đổi file, đóng popup giữa chừng hay tạo hụt đều bỏ lại file rác
 * trong bucket mà không ai xóa. Ở đây file chỉ lên Storage sau khi đã kiểm xong,
 * và tạo dòng hỏng thì dọn lại ngay.
 */
export async function createAssignment(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const courseId = String(formData.get("course_id") ?? "");
  const sessionNumber = Number(formData.get("session_number") ?? 0);
  const title = String(formData.get("title") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const file = formData.get("spec_file");

  if (!courseId || !sessionNumber || !title) {
    return { error: "Vui lòng chọn khóa, số buổi và nhập tiêu đề." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Chưa chọn file đề bài." };
  }
  if (file.size > SPEC_MAX_BYTES) {
    return { error: "File đề nặng quá 8MB — hãy dùng file .txt/.md hoặc nén ảnh lại." };
  }
  // Word đời cũ trích chữ không ra — báo ngay lúc tạo đề, đừng để AI chấm mới lỗi.
  if (/\.(doc|xls|ppt)$/i.test(file.name)) {
    return {
      error: `File "${file.name}" là định dạng Office đời cũ, hệ thống không đọc được chữ. Hãy mở bằng Word rồi "Lưu thành" .docx (hoặc .pdf) và thử lại.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (looksEncrypted(bytes)) {
    return {
      error: `File "${file.name}" đang bị phần mềm bảo mật của công ty mã hóa nên nội dung thật không đọc được — AI sẽ chấm sai. Hãy gõ đề vào Notepad, lưu thành .txt rồi thử lại.`,
    };
  }

  const supabase = await createClient();
  const path = `${courseId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(SPEC_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream" });
  if (uploadError) {
    return { error: `Upload file đề thất bại: ${uploadError.message}` };
  }

  const { error } = await supabase.from("assignments").insert({
    course_id: courseId,
    session_number: sessionNumber,
    title,
    spec_file_path: path,
    instructions: instructions || null,
  });
  if (error) {
    await removeSpecFiles(supabase, [path]);
    if (error.code === "23505") {
      return { error: `Buổi ${sessionNumber} của khóa này đã có đề — mỗi buổi một đề.` };
    }
    return { error: `Không tạo được đề: ${error.message}` };
  }

  revalidatePath("/teacher/assignments");
  return { success: `Đã tạo đề cho buổi ${sessionNumber}.` };
}

/** Chỉ đổi tiêu đề — không đụng file đề, số buổi, hay khóa học. */
export async function updateAssignmentTitle(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!id || !title) {
    return { error: "Vui lòng nhập tiêu đề." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ title })
    .eq("id", id);
  if (error) {
    return { error: `Không đổi được tên đề: ${error.message}` };
  }

  revalidatePath("/teacher/assignments");
  return { success: "Đã đổi tên đề." };
}

export async function deleteAssignment(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  // Đọc path TRƯỚC khi xóa dòng — xóa xong là không còn đường tìm lại file.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("spec_file_path")
    .eq("id", id)
    .single();

  await supabase.from("assignments").delete().eq("id", id);
  await removeSpecFiles(supabase, [assignment?.spec_file_path ?? null]);

  revalidatePath("/teacher/assignments");
}

/** Đuôi file mở ra đọc thẳng dạng chữ; còn lại xem bằng link ký (ảnh/PDF). */
const TEXT_EXTENSIONS = [
  "txt", "md", "markdown", "json", "csv", "sql",
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "html", "css",
];

export type AssignmentSpec =
  | { kind: "text"; fileName: string; content: string }
  | { kind: "image" | "pdf" | "download"; fileName: string; url: string };

/**
 * Đọc file đề đã lưu để GV xem lại trên giao diện. Bucket là private nên ảnh/PDF
 * phải đi qua link ký ngắn hạn; file chữ trả thẳng nội dung.
 */
export async function getAssignmentSpec(
  assignmentId: string
): Promise<{ spec?: AssignmentSpec; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  // RLS (assignments_teacher_all): GV của khóa khác không thấy dòng nào.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("spec_file_path")
    .eq("id", assignmentId)
    .single();
  if (!assignment) {
    return { error: "Không tìm thấy đề bài này (hoặc đề thuộc khóa của giáo viên khác)." };
  }
  if (!assignment.spec_file_path) {
    return { error: "Đề bài này chưa có file đính kèm." };
  }

  const path = assignment.spec_file_path;
  const fileName = path.split("/").pop() ?? "đề bài";
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  const { data: blob, error } = await supabase.storage
    .from("assignment-specs")
    .download(path);
  if (error || !blob) {
    return { error: `Không tải được file đề: ${error?.message ?? "không rõ lỗi"}` };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (looksEncrypted(bytes)) {
    return {
      error:
        "File đề này bị phần mềm bảo mật của công ty mã hóa từ lúc upload nên không đọc được nội dung thật — AI cũng sẽ chấm sai. Hãy xóa đề này và tạo lại bằng file .txt/.md.",
    };
  }

  if (TEXT_EXTENSIONS.includes(ext)) {
    return { spec: { kind: "text", fileName, content: new TextDecoder().decode(bytes) } };
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("assignment-specs")
    .createSignedUrl(path, 600);
  if (signErr || !signed) {
    return { error: `Không mở được file đề: ${signErr?.message ?? "không rõ lỗi"}` };
  }

  // .docx không xem thẳng trong trình duyệt được (giải nén ZIP + đọc XML là việc
  // của ai-service, phía Node không có sẵn thư viện zip) → cho tải về xem bằng
  // Word. AI vẫn chấm bình thường vì ai-service tự trích chữ từ file này.
  const kind: AssignmentSpec["kind"] =
    ext === "pdf" ? "pdf" : ext === "docx" ? "download" : "image";

  return { spec: { kind, fileName, url: signed.signedUrl } };
}

// ---------- Chấm bài — KHÔNG lưu gì, chỉ trả kết quả để copy ----------

export interface GradeInputFile {
  name: string;
  mimeType: string;
  contentB64: string;
}

export interface GradeResult {
  score: number;
  bullets: string[];
}

/**
 * Chấm bài làm của 1 học sinh. File gửi thẳng nội dung sang ai-service,
 * không upload Storage, không ghi DB — tải lại trang là mất kết quả.
 */
export async function gradeFiles(input: {
  assignmentId: string;
  files: GradeInputFile[];
}): Promise<{ grade?: GradeResult; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }
  if (input.files.length === 0) {
    return { error: "Chưa chọn file bài làm." };
  }

  // RLS chỉ cho giáo viên của khóa đọc được đề này.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("title, instructions, spec_file_path, courses(name)")
    .eq("id", input.assignmentId)
    .single();
  if (!assignment) {
    return { error: "Không tìm thấy đề bài." };
  }
  if (!assignment.spec_file_path) {
    return { error: "Đề bài chưa có file — tạo lại đề với file đính kèm." };
  }

  try {
    const grade = await callAiService<GradeResult>("/grade-submission", {
      api_key: await getMyApiKey(),
      spec_file_path: assignment.spec_file_path,
      files: input.files.map((f) => ({
        name: f.name,
        mime_type: f.mimeType || null,
        content_b64: f.contentB64,
      })),
      course_name:
        (assignment.courses as unknown as { name: string } | null)?.name ?? "",
      assignment_title: assignment.title,
      instructions: assignment.instructions,
    });
    return { grade };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return {
      error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy).",
    };
  }
}
