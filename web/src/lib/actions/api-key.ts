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
 * Lấy API key riêng của người đang đăng nhập ĐỂ GỌI AI. Trả null (→ ai-service
 * dùng key hệ thống) khi: chưa đặt key, HOẶC đã đặt nhưng công tắc `use_own_key`
 * đang TẮT (user muốn tạm dùng key hệ thống mà không xóa key riêng).
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
    .select("gemini_api_key, use_own_key")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data?.use_own_key) return null;
  return data.gemini_api_key || null;
}

export interface ApiKeyInfo {
  /** Key đã che để hiển thị (AIzaSyD•••••••••••v4k2), null nếu chưa đặt. */
  maskedKey: string | null;
  /** Công tắc "dùng key riêng" đang bật — chỉ có ý nghĩa khi đã đặt key. */
  useOwnKey: boolean;
}

/** Trạng thái key cho UI hồ sơ: che key + công tắc. Đọc riêng ô công tắc nên
 *  KHÔNG dùng getMyApiKey() (hàm đó trả null khi tắt, sẽ mất mặt nạ key). */
export async function getMyApiKeyInfo(): Promise<ApiKeyInfo> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { maskedKey: null, useOwnKey: true };

  const { data } = await supabase
    .from("user_secrets")
    .select("gemini_api_key, use_own_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const key = data?.gemini_api_key || null;
  return {
    maskedKey: key
      ? `${key.slice(0, 8)}${"•".repeat(12)}${key.slice(-4)}`
      : null,
    useOwnKey: data?.use_own_key ?? true,
  };
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

  // Vừa dán key mới thì bật luôn công tắc dùng key riêng — không ai lưu key
  // xong lại muốn nó tắt.
  const { error } = await supabase.from("user_secrets").upsert(
    {
      user_id: user.id,
      gemini_api_key: key,
      use_own_key: true,
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

/**
 * Bật/tắt dùng key riêng mà KHÔNG xóa key. Tắt → getMyApiKey() trả null →
 * ai-service dùng key hệ thống. Chặn bật khi chưa có key (bật cũng vô nghĩa).
 */
export async function setUseOwnKey(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { data: existing } = await supabase
    .from("user_secrets")
    .select("gemini_api_key")
    .eq("user_id", user.id)
    .maybeSingle();
  if (enabled && !existing?.gemini_api_key) {
    return { error: "Chưa có key riêng để bật — hãy nhập key trước." };
  }

  const { error } = await supabase
    .from("user_secrets")
    .update({ use_own_key: enabled, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) {
    return { error: `Không đổi được: ${error.message}` };
  }

  revalidatePath("/profile");
  return {
    success: enabled
      ? "Đã bật — các tính năng AI dùng key riêng của bạn."
      : "Đã tắt — tạm dùng key hệ thống, key riêng vẫn được lưu.",
  };
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
