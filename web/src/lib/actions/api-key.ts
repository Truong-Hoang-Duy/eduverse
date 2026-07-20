"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

// KHÔNG chốt cứng theo prefix "AIza" — key Gemini có thể đến từ nhiều nguồn
// khác nhau (project Cloud, tổ chức khác...) và định dạng thật do Google quyết
// định, có thể đổi bất cứ lúc nào. Chỉ chặn những thứ CHẮC CHẮN không phải key
// (rỗng, quá ngắn, dán nhầm cả câu có khoảng trắng/xuống dòng). Key sai thật
// sự sẽ bị Gemini từ chối khi gọi thật — ai-service dịch lỗi đó thành
// BAD_KEY_MESSAGE tiếng Việt rõ ràng (xem ai-service/app/gemini.py).
const KEY_PATTERN = /^\S{20,}$/;

/**
 * Lấy API key riêng của người đang đăng nhập. Trả null nếu chưa đặt →
 * ai-service sẽ dùng key mặc định trong biến môi trường.
 *
 * RLS `user_secrets_own` chỉ cho chính chủ đọc, kể cả giáo viên cũng không
 * đọc được key của học viên.
 */
export async function getMyApiKey(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_secrets")
    .select("gemini_api_key")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.gemini_api_key || null;
}

/** Che key khi hiển thị: AIzaSyD...v4k2 */
export async function getMyApiKeyMasked(): Promise<string | null> {
  const key = await getMyApiKey();
  if (!key) return null;
  return `${key.slice(0, 8)}${"•".repeat(12)}${key.slice(-4)}`;
}

export async function saveApiKey(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const key = String(formData.get("api_key") ?? "").trim();

  if (!key) {
    return { error: "Nhập API key hoặc bấm Xóa key nếu muốn dùng key mặc định." };
  }
  if (!KEY_PATTERN.test(key)) {
    return {
      error:
        "API key có vẻ chưa đúng — key thường dài trên 20 ký tự và không có khoảng trắng. Copy lại toàn bộ key nhé.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase.from("user_secrets").upsert(
    {
      user_id: user.id,
      gemini_api_key: key,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    return { error: `Không lưu được: ${error.message}` };
  }

  revalidatePath("/profile");
  return { success: "Đã lưu API key. Các tính năng AI của bạn sẽ dùng key này." };
}

export async function deleteApiKey(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("user_secrets").delete().eq("user_id", user.id);
  revalidatePath("/profile");
}
