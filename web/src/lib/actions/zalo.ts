"use server";

import { getAiConfig } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import { createClient } from "@/lib/supabase/server";

interface ReviewRow {
  strengths: string[];
  improvements: string[];
  is_absent: boolean;
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

  const { data: session } = await supabase
    .from("sessions")
    .select("class_id, title, content, session_number, classes(class_code)")
    .eq("id", input.sessionId)
    .single();
  if (!session) {
    return { error: "Không tìm thấy buổi học." };
  }

  const [{ data: template }, { data: reviewsData }, { data: enrollmentsData }] =
    await Promise.all([
      supabase
        .from("zalo_templates")
        .select("template_text")
        .eq("id", input.templateId)
        .single(),
      supabase
        .from("student_reviews")
        .select("strengths, improvements, is_absent, profiles!student_reviews_student_id_fkey(full_name)")
        .eq("session_id", input.sessionId),
      supabase.from("enrollments").select("student_id").eq("class_id", session.class_id),
    ]);

  if (!template) {
    return { error: "Chưa chọn mẫu tin — tạo mẫu trong trang Cài đặt." };
  }

  // Loại học viên vắng mặt khỏi tin tổng hợp — buổi này em không học nên
  // không có gì để báo phụ huynh (yêu cầu user 2026-07-27).
  const reviews = ((reviewsData ?? []) as unknown as ReviewRow[]).filter(
    (r) => !r.is_absent
  );
  if (reviews.length === 0) {
    return {
      error: "Buổi này chưa có nhận xét học viên nào — hãy nhận xét trước khi tạo tin.",
    };
  }

  const classCode =
    (session as unknown as { classes: { class_code: string } | null }).classes
      ?.class_code ?? "";
  // Lớp chỉ có 1 học viên (dạy kèm 1-1) → prompt đổi sang nhận xét riêng em
  // đó thay vì khái quát chung cả lớp (yêu cầu user 2026-07-21).
  const isOneOnOne = (enrollmentsData ?? []).length === 1;

  const aiConfig = await getAiConfig();
  if (!aiConfig.ok) {
    return { error: aiConfig.error };
  }

  const sessionLabel = session.title ?? `Buổi ${session.session_number}`;

  try {
    const data = await callAiService<{ tom_tat: string; loi_nhan: string }>(
      "/generate-zalo-summary",
      {
        api_key: aiConfig.api_key,
        provider: aiConfig.provider,
        class_code: classCode,
        session_title: sessionLabel,
        session_content: session.content ?? "",
        reviews: reviews.map((r) => ({
          student_name: r.profiles?.full_name ?? "Học viên",
          strengths: r.strengths,
          improvements: r.improvements,
        })),
        is_one_on_one: isOneOnOne,
      }
    );
    // Ghép vào mẫu bằng string replace THUẦN (không qua AI) — mẫu GV đã chọn
    // được giữ NGUYÊN VĂN (kể cả markup **/_ và khoảng trắng), chỉ 4
    // placeholder cố định {ten_lop} {buoi} {tom_tat} {loi_nhan} được thay.
    const message = template.template_text
      .replaceAll("{ten_lop}", classCode)
      .replaceAll("{buoi}", sessionLabel)
      .replaceAll("{tom_tat}", data.tom_tat)
      .replaceAll("{loi_nhan}", data.loi_nhan);
    return { message };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: `Lỗi AI: ${err.message}` };
    }
    return { error: "Lỗi hệ thống khi tạo tin nhắn Zalo" };
  }
}

export async function generateSessionGreeting({
  classCode,
  courseName,
  teacherName,
}: {
  classCode: string;
  courseName: string;
  teacherName: string;
}) {
  const aiConfig = await getAiConfig();
  if (!aiConfig.ok) {
    return { error: aiConfig.error };
  }

  try {
    const data = await callAiService<{ greeting: string }>(
      "/generate-greeting",
      {
        api_key: aiConfig.api_key,
        provider: aiConfig.provider,
        class_code: classCode,
        course_name: courseName,
        teacher_name: teacherName,
      }
    );
    return { greeting: data.greeting };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: `Lỗi AI: ${err.message}` };
    }
    return { error: "Lỗi hệ thống khi tạo lời chào" };
  }
}
