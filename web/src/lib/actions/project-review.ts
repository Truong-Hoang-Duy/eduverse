"use server";

import { getAiConfig } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import {
  emptyTally,
  PROJECT_BUDGET,
  stripCommonRoot,
  totalBytes,
  type SkipTally,
  type SubmissionFile,
} from "@/lib/submission-files";
import { createClient } from "@/lib/supabase/server";
import { unzipSubmission } from "@/lib/zip-submission";

/**
 * Nhận xét sản phẩm cuối khóa — công cụ ĐỘC LẬP giống chấm bài tập: file bài làm
 * và kết quả nhận xét KHÔNG lưu ở đâu cả, tải lại trang là mất.
 */

export interface ProjectReview {
  diem_manh: string[];
  can_cai_thien: string[];
  goi_y: string[];
}

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

  // Sản phẩm cuối khóa chỉ đọc file chữ: ảnh là asset, PDF/Word không phải code.
  const res = unzipSubmission(input.zipB64, {}, PROJECT_BUDGET);
  if (res.error) return { error: res.error };

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const files: SubmissionFile[] = (res.entries ?? []).map((entry) => ({
    path: entry.name,
    content: decoder.decode(entry.data),
    size: entry.data.length,
  }));

  return { files: stripCommonRoot(files), skipped: res.skipped ?? emptyTally() };
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

  const aiConfig = await getAiConfig();
  if (!aiConfig.ok) {
    return { error: aiConfig.error };
  }

  try {
    const review = await callAiService<ProjectReview>("/review-project", {
      api_key: aiConfig.api_key,
      provider: aiConfig.provider,
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
