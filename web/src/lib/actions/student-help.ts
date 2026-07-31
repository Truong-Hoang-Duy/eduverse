"use server";

import { getMyApiKey } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import { GRADING_BUDGET } from "@/lib/submission-files";
import { createClient } from "@/lib/supabase/server";

import type { GradeInputFile } from "./grading";

/**
 * Gợi ý cho học viên đang bí — công cụ ĐỘC LẬP như chấm bài: code em gửi và lời
 * gợi ý KHÔNG lưu ở đâu cả, tải lại trang là mất. Chỉ đề bài là thứ đã có sẵn
 * trong DB từ trước.
 *
 * Khác `gradeFiles` ở hai chỗ cốt lõi:
 * - KHÔNG chấm điểm — em đang hỏi bài chứ không nộp bài.
 * - `files` được phép RỖNG: đó là ca "em chưa biết bắt đầu từ đâu", chỉ cần đề.
 *
 * Dùng chung `GradeInputFile` (base64) chứ không phải đường chữ của sản phẩm
 * cuối khóa, vì em hay CHỤP MÀN HÌNH code/giao diện gửi qua Zalo.
 */
export interface StudentHelp {
  /** Em đang làm được tới đâu — rỗng khi em chưa gửi code. */
  dang_o_dau: string;
  /** Lỗi cụ thể cần sửa — rỗng khi em chưa gửi code. */
  can_sua: string[];
  /** Việc làm tiếp, theo thứ tự. LUÔN có ít nhất một bước. */
  cac_buoc: string[];
}

export async function helpStudent(input: {
  assignmentId: string;
  files: GradeInputFile[];
  /** Câu em nhắn hỏi, GV chép lại — thường rõ hơn nhiều so với đoán từ code. */
  question?: string;
}): Promise<{ help?: StudentHelp; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }
  if (!input.assignmentId) {
    return { error: "Hãy chọn đề bài em đang làm." };
  }

  // CỐ Ý không chặn khi `files` rỗng — đó là ca hợp lệ "em chưa biết làm gì".
  if (input.files.length > GRADING_BUDGET.maxFiles) {
    return {
      error: `Tối đa ${GRADING_BUDGET.maxFiles} file mỗi lượt — hãy bỏ bớt file không cần xem.`,
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
    const help = await callAiService<StudentHelp>("/help-student", {
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
      question: input.question?.trim() || null,
    });
    return { help };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return {
      error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy).",
    };
  }
}
