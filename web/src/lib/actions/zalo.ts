"use server";

import { getMyApiKey } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import { createClient } from "@/lib/supabase/server";

interface ReviewRow {
  strengths: string[];
  improvements: string[];
  profiles: { full_name: string } | null;
}

/** Tổng hợp tình hình lớp sau 1 buổi và ghép vào mẫu tin Zalo đã chọn. */
export async function generateZaloSummary(input: {
  sessionId: string;
  templateId: string;
}): Promise<{ message?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const [{ data: session }, { data: template }, { data: reviewsData }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("title, content, session_number, classes(class_code)")
        .eq("id", input.sessionId)
        .single(),
      supabase
        .from("zalo_templates")
        .select("template_text")
        .eq("id", input.templateId)
        .single(),
      supabase
        .from("student_reviews")
        .select("strengths, improvements, profiles!student_reviews_student_id_fkey(full_name)")
        .eq("session_id", input.sessionId),
    ]);

  if (!session) {
    return { error: "Không tìm thấy buổi học." };
  }
  if (!template) {
    return { error: "Chưa chọn mẫu tin — tạo mẫu trong trang Cài đặt." };
  }

  const reviews = (reviewsData ?? []) as unknown as ReviewRow[];
  if (reviews.length === 0) {
    return {
      error: "Buổi này chưa có nhận xét học viên nào — hãy nhận xét trước khi tạo tin.",
    };
  }

  const classCode =
    (session as unknown as { classes: { class_code: string } | null }).classes
      ?.class_code ?? "";

  try {
    const data = await callAiService<{ message: string }>(
      "/generate-zalo-summary",
      {
        api_key: await getMyApiKey(),
        class_code: classCode,
        session_title: session.title ?? `Buổi ${session.session_number}`,
        session_content: session.content ?? "",
        reviews: reviews.map((r) => ({
          student_name: r.profiles?.full_name ?? "Học viên",
          strengths: r.strengths,
          improvements: r.improvements,
        })),
        template_text: template.template_text,
      }
    );
    return { message: data.message };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return { error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy)." };
  }
}
