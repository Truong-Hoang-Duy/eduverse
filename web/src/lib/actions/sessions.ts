"use server";

import { revalidatePath } from "next/cache";

import { getMyApiKey } from "@/lib/actions/api-key";
import { applyReviewsFromSession } from "@/lib/actions/reviews";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function updateSession(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const reviewContext = String(formData.get("review_context") ?? "").trim();
  const isPeriodicTest = formData.get("is_periodic_test") === "true";
  const sessionDate = String(formData.get("session_date") ?? "").trim();
  // Rỗng = GV không chọn áp nhận xét từ buổi nào (mặc định).
  const copyFromSessionId = String(
    formData.get("copy_from_session_id") ?? ""
  ).trim();

  if (!id) {
    return { error: "Thiếu thông tin buổi học." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({
      title: title || null,
      content: content || null,
      review_context: reviewContext || null,
      is_periodic_test: isPeriodicTest,
      session_date: sessionDate || null,
    })
    .eq("id", id);
  if (error) {
    return { error: `Không lưu được: ${error.message}` };
  }

  revalidatePath(`/teacher/sessions/${id}`);

  // GV chọn "áp nhận xét giống buổi..." thì nút Lưu làm luôn cả việc đó (user
  // chốt 2026-08-06: một nút, không tách ra). Nội dung buổi ĐÃ lưu ở trên rồi
  // nên phần này hỏng cũng không kéo theo — chỉ báo lỗi riêng.
  if (copyFromSessionId) {
    const result = await applyReviewsFromSession({
      sessionId: id,
      sourceSessionId: copyFromSessionId,
    });
    if (result.error) {
      return { error: `Đã lưu nội dung, nhưng không áp được nhận xét: ${result.error}` };
    }
    const parts = [
      `Đã lưu nội dung và áp nhận xét cho ${result.applied} em`,
      `AI viết được ${result.generated} em`,
    ];
    if (result.aiFailed > 0) {
      // Gần như luôn là hết lượt Gemini (20 lượt/NGÀY, tính theo Google Cloud
      // project) — nói rõ việc cần làm thay vì để GV tưởng hỏng.
      parts.push(
        `${result.aiFailed} em chưa có nhận xét (thường do hết lượt Gemini) — đổi key ở trang Hồ sơ rồi bấm "AI tạo nhận xét" ở từng em`
      );
    }
    return { success: `${parts.join(". ")}.` };
  }

  return { success: "Đã lưu nội dung buổi học." };
}

/** Buổi trước gần nhất tối đa lấy làm ngữ cảnh cho gợi ý nội dung buổi học. */
const MAX_PRIOR_SESSIONS = 5;

interface SessionWithClassRow {
  class_id: string;
  session_number: number;
  classes: { class_code: string; courses: { name: string } | null } | null;
}

interface PriorSessionRow {
  session_number: number;
  content: string | null;
}

/**
 * Gợi ý nội dung buổi học từ ghi chú thô của GV, có tham khảo nội dung các
 * buổi TRƯỚC trong cùng lớp — KHÔNG lưu gì vào DB, chỉ trả text để GV tự copy
 * hoặc điền vào ô chính rồi tự bấm Lưu.
 */
export async function suggestSessionContent(input: {
  sessionId: string;
  draftText: string;
}): Promise<{ content?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }
  if (!input.draftText.trim()) {
    return { error: "Nhập ghi chú/ý muốn dạy trước khi xin gợi ý." };
  }

  const { data: sessionData } = await supabase
    .from("sessions")
    .select("class_id, session_number, classes(class_code, courses(name))")
    .eq("id", input.sessionId)
    .single();
  if (!sessionData) {
    return { error: "Không tìm thấy buổi học." };
  }
  const session = sessionData as unknown as SessionWithClassRow;

  const { data: priorData } = await supabase
    .from("sessions")
    .select("session_number, content")
    .eq("class_id", session.class_id)
    .lt("session_number", session.session_number)
    .not("content", "is", null)
    .order("session_number", { ascending: false })
    .limit(MAX_PRIOR_SESSIONS);

  const priorSessions = ((priorData ?? []) as PriorSessionRow[])
    .filter((s): s is { session_number: number; content: string } => Boolean(s.content))
    .sort((a, b) => a.session_number - b.session_number)
    .map((s) => ({ session_number: s.session_number, content: s.content }));

  try {
    const data = await callAiService<{ bullets: string[] }>(
      "/suggest-session-content",
      {
        api_key: await getMyApiKey(),
        course_name: session.classes?.courses?.name ?? "",
        class_code: session.classes?.class_code ?? "",
        session_number: session.session_number,
        draft_text: input.draftText,
        prior_sessions: priorSessions,
      }
    );
    // Ghép ở ĐÂY chứ không để ai-service trả chuỗi sẵn: ký tự đầu dòng do web
    // quyết định (thống nhất với chỗ khác), và `sessions.content` vẫn là text
    // nên cột DB lẫn các prompt đọc nó không phải đổi gì.
    return { content: data.bullets.map((line) => `- ${line}`).join("\n") };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return { error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy)." };
  }
}
