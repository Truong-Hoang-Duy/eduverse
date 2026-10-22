"use server";

import { revalidatePath } from "next/cache";

import { getAiConfig } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import {
  cleanInstructionsForDisplay,
  encodeInstructionsWithAttachments,
  extractAttachmentPaths,
  getDisplayFileName,
} from "@/lib/assignment-utils";
import { docxToText } from "@/lib/docx-text";
import { looksEncrypted } from "@/lib/file-check";
import {
  removeSpecFiles,
  sanitizeFileName,
  SPEC_BUCKET,
  SPEC_MAX_BYTES,
} from "@/lib/spec-storage";
import {
  emptyTally,
  GRADING_BUDGET,
  type SkipTally,
} from "@/lib/submission-files";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { unzipSubmission } from "@/lib/zip-submission";

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
  const attachmentFilesRaw = formData.getAll("attachment_files");

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

  // Validate các file đính kèm/dữ liệu bổ sung (nếu có)
  const attachmentFiles = attachmentFilesRaw.filter(
    (f): f is File => f instanceof File && f.size > 0
  );

  for (const att of attachmentFiles) {
    if (att.size > SPEC_MAX_BYTES) {
      return {
        error: `File đính kèm "${att.name}" nặng quá 8MB — hãy nén lại hoặc giảm bớt dung lượng.`,
      };
    }
    if (/\.(doc|xls|ppt)$/i.test(att.name)) {
      return {
        error: `File đính kèm "${att.name}" là định dạng Office đời cũ, hệ thống không đọc được chữ. Hãy lưu lại dạng mới hơn và thử lại.`,
      };
    }
  }

  const supabase = await createClient();
  const path = `${courseId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(SPEC_BUCKET)
    .upload(path, bytes, { contentType: file.type || "application/octet-stream" });
  if (uploadError) {
    return { error: `Upload file đề thất bại: ${uploadError.message}` };
  }

  // Upload các file đính kèm
  const uploadedAttPaths: string[] = [];
  for (const att of attachmentFiles) {
    const attBytes = new Uint8Array(await att.arrayBuffer());
    if (looksEncrypted(attBytes)) {
      await removeSpecFiles(supabase, [path, ...uploadedAttPaths]);
      return {
        error: `File đính kèm "${att.name}" đang bị phần mềm bảo mật mã hóa không thể đọc được nội dung.`,
      };
    }
    const attPath = `${courseId}/${Date.now()}-att-${sanitizeFileName(att.name)}`;
    const { error: attUploadError } = await supabase.storage
      .from(SPEC_BUCKET)
      .upload(attPath, attBytes, {
        contentType: att.type || "application/octet-stream",
      });
    if (attUploadError) {
      await removeSpecFiles(supabase, [path, ...uploadedAttPaths]);
      return {
        error: `Upload file đính kèm "${att.name}" thất bại: ${attUploadError.message}`,
      };
    }
    uploadedAttPaths.push(attPath);
  }

  // Lưu thông tin đề bài vào database (mã hóa metadata đính kèm vào instructions để tương thích 100%)
  const encodedInstructions = encodeInstructionsWithAttachments(
    instructions,
    uploadedAttPaths
  );

  const { error } = await supabase.from("assignments").insert({
    course_id: courseId,
    session_number: sessionNumber,
    title,
    spec_file_path: path,
    attachment_file_paths: uploadedAttPaths,
    instructions: encodedInstructions,
  });

  if (error) {
    // Nếu lỗi do cột attachment_file_paths chưa có trong DB (chưa chạy migration)
    if (
      error.message?.includes("attachment_file_paths") ||
      error.code === "42703"
    ) {
      const { error: fallbackError } = await supabase
        .from("assignments")
        .insert({
          course_id: courseId,
          session_number: sessionNumber,
          title,
          spec_file_path: path,
          instructions: encodedInstructions,
        });

      if (fallbackError) {
        await removeSpecFiles(supabase, [path, ...uploadedAttPaths]);
        if (fallbackError.code === "23505") {
          return {
            error: `Buổi ${sessionNumber} của khóa này đã có đề — mỗi buổi một đề.`,
          };
        }
        return { error: `Không tạo được đề: ${fallbackError.message}` };
      }
    } else {
      await removeSpecFiles(supabase, [path, ...uploadedAttPaths]);
      if (error.code === "23505") {
        return {
          error: `Buổi ${sessionNumber} của khóa này đã có đề — mỗi buổi một đề.`,
        };
      }
      return { error: `Không tạo được đề: ${error.message}` };
    }
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
  const filesToDelete: string[] = [];
  const { data: assignment, error } = await supabase
    .from("assignments")
    .select("spec_file_path, instructions, attachment_file_paths")
    .eq("id", id)
    .single();

  if (!error && assignment) {
    if (assignment.spec_file_path) filesToDelete.push(assignment.spec_file_path);
    const attPaths = extractAttachmentPaths(
      assignment.instructions,
      assignment.attachment_file_paths
    );
    filesToDelete.push(...attPaths);
  } else {
    const { data: fallback } = await supabase
      .from("assignments")
      .select("spec_file_path, instructions")
      .eq("id", id)
      .single();
    if (fallback?.spec_file_path) filesToDelete.push(fallback.spec_file_path);
    if (fallback?.instructions) {
      filesToDelete.push(...extractAttachmentPaths(fallback.instructions, null));
    }
  }

  await supabase.from("assignments").delete().eq("id", id);
  if (filesToDelete.length > 0) {
    await removeSpecFiles(supabase, filesToDelete);
  }

  revalidatePath("/teacher/assignments");
}

/**
 * Đính kèm thêm file dữ liệu vào một đề bài ĐÃ CÓ SẴN mà không cần tạo lại đề.
 */
export async function attachAssignmentFiles(
  assignmentId: string,
  formData: FormData
): Promise<ActionResult> {
  const filesRaw = formData.getAll("attachment_files");
  const files = filesRaw.filter(
    (f): f is File => f instanceof File && f.size > 0
  );

  if (files.length === 0) {
    return { error: "Vui lòng chọn ít nhất một file để đính kèm." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  // Đọc thông tin đề bài hiện tại
  let courseId = "";
  let currentInstructions: string | null = null;
  let currentAttPaths: string[] | null = null;

  const { data: assignment, error: fetchErr } = await supabase
    .from("assignments")
    .select("course_id, spec_file_path, instructions, attachment_file_paths")
    .eq("id", assignmentId)
    .single();

  if (!fetchErr && assignment) {
    courseId = assignment.course_id;
    currentInstructions = assignment.instructions;
    currentAttPaths = assignment.attachment_file_paths;
  } else {
    const { data: fallback, error: fbErr } = await supabase
      .from("assignments")
      .select("course_id, spec_file_path, instructions")
      .eq("id", assignmentId)
      .single();
    if (fbErr || !fallback) {
      return { error: "Không tìm thấy đề bài." };
    }
    courseId = fallback.course_id;
    currentInstructions = fallback.instructions;
    currentAttPaths = null;
  }

  const existingPaths = extractAttachmentPaths(
    currentInstructions,
    currentAttPaths
  );

  for (const f of files) {
    if (f.size > SPEC_MAX_BYTES) {
      return {
        error: `File "${f.name}" nặng quá 8MB — hãy nén lại hoặc giảm bớt dung lượng.`,
      };
    }
    if (/\.(doc|xls|ppt)$/i.test(f.name)) {
      return {
        error: `File "${f.name}" là định dạng Office đời cũ, hệ thống không đọc được chữ.`,
      };
    }
  }

  const newUploadedPaths: string[] = [];
  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (looksEncrypted(bytes)) {
      await removeSpecFiles(supabase, newUploadedPaths);
      return {
        error: `File "${f.name}" bị phần mềm bảo mật mã hóa, không thể tải lên.`,
      };
    }
    const attPath = `${courseId}/${Date.now()}-att-${sanitizeFileName(f.name)}`;
    const { error: uploadErr } = await supabase.storage
      .from(SPEC_BUCKET)
      .upload(attPath, bytes, {
        contentType: f.type || "application/octet-stream",
      });
    if (uploadErr) {
      await removeSpecFiles(supabase, newUploadedPaths);
      return {
        error: `Upload file "${f.name}" thất bại: ${uploadErr.message}`,
      };
    }
    newUploadedPaths.push(attPath);
  }

  const allAttachmentPaths = [...existingPaths, ...newUploadedPaths];
  const updatedInstructions = encodeInstructionsWithAttachments(
    currentInstructions,
    allAttachmentPaths
  );

  // Thử cập nhật cả attachment_file_paths và instructions
  const { error: updateErr } = await supabase
    .from("assignments")
    .update({
      attachment_file_paths: allAttachmentPaths,
      instructions: updatedInstructions,
    })
    .eq("id", assignmentId);

  if (updateErr) {
    // Fallback nếu cột attachment_file_paths chưa có trong DB
    const { error: fbUpdateErr } = await supabase
      .from("assignments")
      .update({
        instructions: updatedInstructions,
      })
      .eq("id", assignmentId);

    if (fbUpdateErr) {
      await removeSpecFiles(supabase, newUploadedPaths);
      return {
        error: `Không thể cập nhật đề bài: ${fbUpdateErr.message}`,
      };
    }
  }

  revalidatePath("/teacher/assignments");
  return {
    success: `Đã đính kèm thêm ${newUploadedPaths.length} tệp dữ liệu vào đề bài.`,
  };
}

/**
 * Xóa một file đính kèm khỏi đề bài và dọn sạch Storage.
 */
export async function removeAssignmentAttachment(
  assignmentId: string,
  filePath: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  let currentInstructions: string | null = null;
  let currentAttPaths: string[] | null = null;

  const { data: assignment, error: fetchErr } = await supabase
    .from("assignments")
    .select("instructions, attachment_file_paths")
    .eq("id", assignmentId)
    .single();

  if (!fetchErr && assignment) {
    currentInstructions = assignment.instructions;
    currentAttPaths = assignment.attachment_file_paths;
  } else {
    const { data: fallback, error: fbErr } = await supabase
      .from("assignments")
      .select("instructions")
      .eq("id", assignmentId)
      .single();
    if (fbErr || !fallback) {
      return { error: "Không tìm thấy đề bài." };
    }
    currentInstructions = fallback.instructions;
    currentAttPaths = null;
  }

  const existingPaths = extractAttachmentPaths(
    currentInstructions,
    currentAttPaths
  );
  const remainingPaths = existingPaths.filter((p) => p !== filePath);
  const updatedInstructions = encodeInstructionsWithAttachments(
    currentInstructions,
    remainingPaths
  );

  const { error: updateErr } = await supabase
    .from("assignments")
    .update({
      attachment_file_paths: remainingPaths,
      instructions: updatedInstructions,
    })
    .eq("id", assignmentId);

  if (updateErr) {
    await supabase
      .from("assignments")
      .update({
        instructions: updatedInstructions,
      })
      .eq("id", assignmentId);
  }

  // Dọn dẹp file trong Storage
  await removeSpecFiles(supabase, [filePath]);

  revalidatePath("/teacher/assignments");
  return { success: "Đã xóa tệp dữ liệu khỏi đề bài." };
}

/** Đuôi file mở ra đọc thẳng dạng chữ; còn lại xem bằng link ký (ảnh/PDF/tải về). */
const TEXT_EXTENSIONS = [
  "txt", "md", "markdown", "json", "csv", "sql",
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "html", "css",
];

export interface AssignmentSpecFile {
  path: string;
  fileName: string;
  isMain: boolean;
  kind: "text" | "image" | "pdf" | "download";
  content?: string;
  url?: string;
}

export type AssignmentSpec =
  | { kind: "text"; fileName: string; content: string; url?: string }
  | { kind: "image" | "pdf" | "download"; fileName: string; url: string };

async function loadSpecFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
  isMain: boolean
): Promise<{ file?: AssignmentSpecFile; error?: string }> {
  const fileName = getDisplayFileName(path);
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  // Tạo signed URL có thời hạn 10 phút (600s) cho mọi file để hỗ trợ xem/tải
  const { data: signed } = await supabase.storage
    .from(SPEC_BUCKET)
    .createSignedUrl(path, 600);
  const downloadUrl = signed?.signedUrl;

  if (TEXT_EXTENSIONS.includes(ext)) {
    const { data: blob, error } = await supabase.storage
      .from(SPEC_BUCKET)
      .download(path);
    if (!error && blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (looksEncrypted(bytes)) {
        return {
          error: `File "${fileName}" bị phần mềm bảo mật mã hóa nên không đọc được nội dung thật.`,
        };
      }
      return {
        file: {
          path,
          fileName,
          isMain,
          kind: "text",
          content: new TextDecoder().decode(bytes),
          url: downloadUrl,
        },
      };
    }
  }

  if (ext === "docx") {
    const { data: blob, error } = await supabase.storage
      .from(SPEC_BUCKET)
      .download(path);
    if (!error && blob) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (looksEncrypted(bytes)) {
        return {
          error: `File "${fileName}" bị phần mềm bảo mật mã hóa nên không đọc được nội dung thật.`,
        };
      }
      const text = docxToText(bytes);
      if (text) {
        return {
          file: {
            path,
            fileName,
            isMain,
            kind: "text",
            content: text,
            url: downloadUrl,
          },
        };
      }
    }
  }

  const isImg = /^(png|jpe?g|gif|webp|svg)$/i.test(ext);
  const kind: AssignmentSpecFile["kind"] =
    ext === "pdf" ? "pdf" : isImg ? "image" : "download";

  return {
    file: {
      path,
      fileName,
      isMain,
      kind,
      url: downloadUrl,
    },
  };
}

/**
 * Đọc file đề và các file dữ liệu đính kèm đã lưu để GV xem lại trên giao diện.
 * Trả về file đề chính (`spec`) và đầy đủ danh sách tất cả file (`files`) để xem và tải về.
 */
export async function getAssignmentSpec(
  assignmentId: string
): Promise<{
  spec?: AssignmentSpec;
  files?: AssignmentSpecFile[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  // RLS (assignments_teacher_all): GV của khóa khác không thấy dòng nào.
  let assignment: {
    spec_file_path: string | null;
    instructions: string | null;
    attachment_file_paths?: string[] | null;
  } | null = null;

  const { data, error } = await supabase
    .from("assignments")
    .select("spec_file_path, instructions, attachment_file_paths")
    .eq("id", assignmentId)
    .single();

  if (error || !data) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("assignments")
      .select("spec_file_path, instructions")
      .eq("id", assignmentId)
      .single();
    if (fallbackError || !fallback) {
      return {
        error:
          "Không tìm thấy đề bài này (hoặc đề thuộc khóa của giáo viên khác).",
      };
    }
    assignment = fallback;
  } else {
    assignment = data;
  }

  if (!assignment.spec_file_path) {
    return { error: "Đề bài này chưa có file đính kèm." };
  }

  const attachmentPaths = extractAttachmentPaths(
    assignment.instructions,
    assignment.attachment_file_paths
  );

  const pathsToLoad = [
    { path: assignment.spec_file_path, isMain: true },
    ...attachmentPaths.map((p) => ({
      path: p,
      isMain: false,
    })),
  ];

  const files: AssignmentSpecFile[] = [];
  for (const item of pathsToLoad) {
    const res = await loadSpecFile(supabase, item.path, item.isMain);
    if (res.error && item.isMain) {
      return { error: res.error };
    }
    if (res.file) {
      files.push(res.file);
    }
  }

  if (files.length === 0) {
    return { error: "Không tải được file đề bài." };
  }

  const mainFile = files.find((f) => f.isMain) ?? files[0];
  const spec: AssignmentSpec =
    mainFile.kind === "text"
      ? {
          kind: "text",
          fileName: mainFile.fileName,
          content: mainFile.content ?? "",
          url: mainFile.url,
        }
      : {
          kind: mainFile.kind,
          fileName: mainFile.fileName,
          url: mainFile.url ?? "",
        };

  return { spec, files };
}

// ---------- Chấm bài — KHÔNG lưu gì, chỉ trả kết quả để copy ----------

export interface GradeInputFile {
  /** Đường dẫn tương đối nếu lấy từ thư mục/zip ("js/app.js"), để AI thấy bố cục. */
  name: string;
  mimeType: string;
  contentB64: string;
  /** Số byte gốc (không phải độ dài base64) — dùng để guard ngân sách. */
  size: number;
}

/** Buổi 5/9 (lâu lâu 14) có cả lý thuyết trắc nghiệm lẫn thực hành. */
export type GradingMode = "quiz" | "practice" | "both";

export interface QuizAnswer {
  cau: number;
  dung: boolean;
  /** Rỗng khi em bỏ trống câu đó. */
  em_chon: string;
  dap_an_dung: string;
  /** Một câu ngắn vì sao sai — chỉ có ở câu sai. */
  giai_thich: string;
}

export interface QuizResult {
  tong_so: number;
  so_dung: number;
  cau_hoi: QuizAnswer[];
}

/**
 * Hai phần chấm TÁCH BẠCH (user chốt 2026-07-31): đúng hết trắc nghiệm mà code
 * sai thì một điểm gộp sẽ che mất vấn đề.
 *
 * `score`/`bullets` là phần THỰC HÀNH — null/rỗng khi chỉ chấm trắc nghiệm.
 * `quiz` null khi chỉ chấm thực hành. ai-service tự dọn theo `mode` GV chọn.
 */
export interface GradeResult {
  score: number | null;
  bullets: string[];
  quiz: QuizResult | null;
}

/**
 * Giải nén .zip bài làm cho tab bài tập hàng ngày.
 *
 * Khác đường sản phẩm cuối khóa ở chỗ GIỮ nhị phân (ảnh chụp code, PDF scan,
 * Word) nên trả base64 chứ không trả chữ. File KHÔNG được lưu ở đâu — bytes chỉ
 * nằm trong RAM của request này.
 */
export async function extractZipForGrading(input: { zipB64: string }): Promise<{
  files?: GradeInputFile[];
  skipped?: SkipTally;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const res = unzipSubmission(
    input.zipB64,
    { keepImages: true, keepDocuments: true },
    GRADING_BUDGET
  );
  if (res.error) return { error: res.error };

  const files: GradeInputFile[] = (res.entries ?? []).map((entry) => ({
    name: entry.name,
    // Đuôi file là đủ để ai-service phân loại (`bytes_to_part`); trong .zip
    // không có thông tin mime nào để lấy.
    mimeType: "",
    contentB64: Buffer.from(entry.data).toString("base64"),
    size: entry.data.length,
  }));

  return { files, skipped: res.skipped ?? emptyTally() };
}

/**
 * Chấm bài làm của 1 học sinh. File gửi thẳng nội dung sang ai-service,
 * không upload Storage, không ghi DB — tải lại trang là mất kết quả.
 */
export async function gradeFiles(input: {
  assignmentId: string;
  files: GradeInputFile[];
  /** Mặc định "practice" — giữ nguyên hành vi cho mọi lời gọi cũ. */
  mode?: GradingMode;
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
  if (input.files.length > GRADING_BUDGET.maxFiles) {
    return {
      error: `Tối đa ${GRADING_BUDGET.maxFiles} file mỗi lượt — hãy bỏ bớt file không cần chấm.`,
    };
  }
  // Guard THẬT ở server: vượt `bodySizeLimit` thì Next.js báo lỗi rất mờ mịt.
  const total = input.files.reduce((sum, f) => sum + f.size, 0);
  if (total > GRADING_BUDGET.maxTotalBytes) {
    return {
      error: "Tổng dung lượng file quá lớn — hãy bỏ bớt file lớn rồi thử lại.",
    };
  }

  // RLS chỉ cho giáo viên của khóa đọc được đề này.
  interface AssignmentForGrading {
    title: string;
    instructions: string | null;
    spec_file_path: string | null;
    attachment_file_paths?: string[] | null;
    courses: unknown;
  }

  let assignment: AssignmentForGrading | null = null;

  const resWithAtt = await supabase
    .from("assignments")
    .select(
      "title, instructions, spec_file_path, attachment_file_paths, courses(name)"
    )
    .eq("id", input.assignmentId)
    .single();

  if (resWithAtt.error || !resWithAtt.data) {
    const fallbackRes = await supabase
      .from("assignments")
      .select("title, instructions, spec_file_path, courses(name)")
      .eq("id", input.assignmentId)
      .single();
    if (!fallbackRes.data) {
      return { error: "Không tìm thấy đề bài." };
    }
    assignment = fallbackRes.data;
  } else {
    assignment = resWithAtt.data;
  }

  if (!assignment) {
    return { error: "Không tìm thấy đề bài." };
  }

  if (!assignment.spec_file_path) {
    return { error: "Đề bài chưa có file — tạo lại đề với file đính kèm." };
  }

  const attachmentPaths = extractAttachmentPaths(
    assignment.instructions,
    assignment.attachment_file_paths
  );

  const aiConfig = await getAiConfig();
  if (!aiConfig.ok) {
    return { error: aiConfig.error };
  }

  try {
    const grade = await callAiService<GradeResult>("/grade-submission", {
      api_key: aiConfig.api_key,
      provider: aiConfig.provider,
      spec_file_path: assignment.spec_file_path,
      attachment_file_paths: attachmentPaths,
      files: input.files.map((f) => ({
        name: f.name,
        mime_type: f.mimeType || null,
        content_b64: f.contentB64,
      })),
      course_name:
        (assignment.courses as unknown as { name: string } | null)?.name ?? "",
      assignment_title: assignment.title,
      instructions: cleanInstructionsForDisplay(assignment.instructions),
      mode: input.mode ?? "practice",
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

