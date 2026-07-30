"use server";

import { getMyApiKey } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import { looksEncrypted } from "@/lib/file-check";
import {
  emptyTally,
  PROJECT_BUDGET,
  skipReasonFor,
  stripCommonRoot,
  totalBytes,
  type SkipTally,
  type SubmissionFile,
} from "@/lib/submission-files";
import { createClient } from "@/lib/supabase/server";
import { listZipEntries } from "@/lib/zip";

/**
 * Nhận xét sản phẩm cuối khóa — công cụ ĐỘC LẬP giống chấm bài tập: file bài làm
 * và kết quả nhận xét KHÔNG lưu ở đâu cả, tải lại trang là mất.
 */

export interface ProjectReview {
  diem_manh: string[];
  can_cai_thien: string[];
  goi_y: string[];
}

/** Trần cho chính file .zip gửi lên (trước khi giải nén). */
const ZIP_MAX_BYTES = 6 * 1024 * 1024;

/**
 * Giải nén .zip ngay trên server rồi trả về danh sách file dạng chữ.
 *
 * Giải nén ở server (không phải trình duyệt) để dùng lại `lib/zip.ts` đã có —
 * đỡ phải viết bộ đọc ZIP thứ hai cho client. GV vẫn xem/bỏ tick được vì danh
 * sách được trả về đầy đủ trước khi bấm nhận xét.
 */
export async function extractZipFiles(input: { zipB64: string }): Promise<{
  files?: SubmissionFile[];
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

  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(input.zipB64, "base64"));
  } catch {
    return { error: "File .zip gửi lên bị lỗi, hãy thử lại." };
  }

  if (bytes.length === 0) {
    return { error: "File .zip rỗng." };
  }
  if (bytes.length > ZIP_MAX_BYTES) {
    return {
      error: `File .zip nặng ${Math.round(bytes.length / 1024 / 1024)}MB, quá 6MB. Hãy giải nén rồi chọn thư mục thay vì gửi cả file nén.`,
    };
  }

  const skipped = emptyTally();
  const decoder = new TextDecoder("utf-8", { fatal: false });

  // `keep` chặn theo TÊN trước khi bung dữ liệu → node_modules không vào RAM.
  const entries = listZipEntries(bytes, (name) => {
    const reason = skipReasonFor(name);
    if (reason) {
      skipped[reason] += 1;
      return false;
    }
    return true;
  });

  if (entries.length === 0) {
    return {
      error:
        "Trong file .zip không có file code nào đọc được (chỉ có ảnh, file nén, hoặc thư mục sinh tự động).",
    };
  }

  const files: SubmissionFile[] = [];
  for (const entry of entries) {
    if (entry.data.length > PROJECT_BUDGET.maxFileBytes) {
      skipped["too-big"] += 1;
      continue;
    }
    if (looksEncrypted(entry.data)) {
      skipped.junk += 1;
      continue;
    }
    files.push({
      path: entry.name,
      content: decoder.decode(entry.data),
      size: entry.data.length,
    });
  }

  if (files.length === 0) {
    return { error: "Mọi file trong .zip đều quá lớn hoặc không đọc được." };
  }

  return { files: stripCommonRoot(files), skipped };
}

/** Gửi sản phẩm cho AI nhận xét. KHÔNG có điểm số — chỉ 3 nhóm nhận xét. */
export async function reviewProject(input: {
  courseId?: string;
  notes?: string;
  files: SubmissionFile[];
}): Promise<{ review?: ProjectReview; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  if (input.files.length === 0) {
    return { error: "Chưa có file nào của sản phẩm." };
  }
  if (input.files.length > PROJECT_BUDGET.maxFiles) {
    return {
      error: `Tối đa ${PROJECT_BUDGET.maxFiles} file mỗi lần — hãy bỏ tick những file không cần nhận xét.`,
    };
  }
  // Guard THẬT ở server: client đã cảnh báo nhưng vượt trần bodySizeLimit thì
  // Next.js báo lỗi rất mờ mịt, GV không hiểu vì sao.
  if (totalBytes(input.files) > PROJECT_BUDGET.maxTotalBytes) {
    return {
      error: "Tổng dung lượng file quá lớn — hãy bỏ tick những file lớn rồi thử lại.",
    };
  }

  // RLS: chỉ khóa của chính GV này mới đọc được tên.
  let courseName = "";
  if (input.courseId) {
    const { data: course } = await supabase
      .from("courses")
      .select("name")
      .eq("id", input.courseId)
      .single();
    courseName = course?.name ?? "";
  }

  try {
    const review = await callAiService<ProjectReview>("/review-project", {
      api_key: await getMyApiKey(),
      files: input.files.map((f) => ({ path: f.path, content: f.content })),
      course_name: courseName,
      notes: input.notes?.trim() || null,
    });
    return { review };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return {
      error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy).",
    };
  }
}
