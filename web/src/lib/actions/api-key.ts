"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export type AiProvider = "gemini" | "openai";

// KHÔNG chốt cứng theo prefix ("AIza", "sk-"...) — key Gemini/OpenAI có thể
// đến từ nhiều nguồn khác nhau và định dạng thật do từng bên quyết định, có
// thể đổi bất cứ lúc nào (sự cố 2026-07-18: chặn nhầm key Gemini hợp lệ
// không bắt đầu "AIza"). Chỉ chặn những thứ CHẮC CHẮN không phải key (rỗng,
// quá ngắn, dán nhầm cả câu có khoảng trắng/xuống dòng) — dùng CHUNG cho cả
// 2 provider. Key sai thật sự sẽ bị chính provider từ chối khi gọi thật.
const KEY_PATTERN = /^\S{20,}$/;

function mask(key: string | null): string | null {
  return key ? `${key.slice(0, 8)}${"•".repeat(12)}${key.slice(-4)}` : null;
}

interface SecretsRow {
  gemini_api_key: string | null;
  use_own_key: boolean;
  openai_api_key: string | null;
  provider: string;
}

/** Đọc dòng `user_secrets` của người đang đăng nhập, null nếu chưa có phiên. */
async function readMySecrets(): Promise<SecretsRow | null | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return undefined;

  const { data } = await supabase
    .from("user_secrets")
    .select("gemini_api_key, use_own_key, openai_api_key, provider")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
}

export interface ApiKeyInfo {
  /** Provider đang chọn để gọi AI — mặc định "gemini". */
  provider: AiProvider;
  gemini: {
    /** Key đã che để hiển thị (AIzaSyD•••••••••••v4k2), null nếu chưa đặt. */
    maskedKey: string | null;
    /** Công tắc "dùng key riêng" — chỉ có ý nghĩa khi đã đặt key. */
    useOwnKey: boolean;
  };
  openai: {
    /** Key đã che, null nếu chưa đặt. KHÔNG có "useOwnKey" — OpenAI không có
     *  key hệ thống nên chỉ có 2 trạng thái: có key riêng hoặc không dùng được. */
    maskedKey: string | null;
  };
}

/** Trạng thái đầy đủ cho UI trang Hồ sơ: provider đang chọn + key đã che của cả 2. */
export async function getMyApiKeyInfo(): Promise<ApiKeyInfo> {
  const empty: ApiKeyInfo = {
    provider: "gemini",
    gemini: { maskedKey: null, useOwnKey: true },
    openai: { maskedKey: null },
  };
  const row = await readMySecrets();
  if (row === undefined) return empty;

  return {
    provider: (row?.provider as AiProvider) ?? "gemini",
    gemini: {
      maskedKey: mask(row?.gemini_api_key ?? null),
      useOwnKey: row?.use_own_key ?? true,
    },
    openai: {
      maskedKey: mask(row?.openai_api_key ?? null),
    },
  };
}

export type AiConfigResult =
  | { ok: true; provider: AiProvider; api_key: string | null }
  | { ok: false; error: string };

/**
 * Cấu hình AI để gọi ai-service: provider đang chọn + key tương ứng. Dùng ở
 * ĐẦU mọi action gọi AI, thay cho `getMyApiKey()` cũ (chỉ biết mỗi Gemini).
 *
 * - **Gemini**: chưa đặt key riêng HOẶC đã tắt công tắc `use_own_key` →
 *   `api_key: null`, ai-service tự dùng key hệ thống (hành vi cũ, không đổi).
 * - **OpenAI**: KHÔNG BAO GIỜ có key hệ thống — chưa nhập key riêng thì CHẶN
 *   ngay ở đây (`ok: false`), KHÔNG được tự ý gọi bằng key nào khác (yêu cầu
 *   bảo mật 2026-08-31). Mọi action gọi AI phải kiểm `ok` trước khi gọi
 *   `callAiService`.
 */
export async function getAiConfig(): Promise<AiConfigResult> {
  const row = await readMySecrets();
  if (row === undefined) return { ok: true, provider: "gemini", api_key: null };

  const provider = (row?.provider as AiProvider) ?? "gemini";

  if (provider === "openai") {
    if (!row?.openai_api_key) {
      return {
        ok: false,
        error:
          "Bạn đang chọn dùng OpenAI nhưng chưa nhập API key riêng. Vào trang Hồ sơ nhập key OpenAI, hoặc chuyển lại về dùng Gemini.",
      };
    }
    return { ok: true, provider, api_key: row.openai_api_key };
  }

  return {
    ok: true,
    provider,
    api_key: row?.use_own_key ? row?.gemini_api_key || null : null,
  };
}

/**
 * Chuyển provider đang dùng — KHÔNG cần nhập lại key nếu đã có sẵn. Chặn
 * chuyển sang "openai" khi chưa có key riêng (hệ thống không có key mặc định
 * cho OpenAI); chuyển về "gemini" luôn cho phép (có key hệ thống dự phòng).
 */
export async function setProvider(provider: AiProvider): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  if (provider === "openai") {
    const { data: existing } = await supabase
      .from("user_secrets")
      .select("openai_api_key")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing?.openai_api_key) {
      return { error: "Chưa có OpenAI API key — hãy nhập key trước." };
    }
  }

  const { error } = await supabase.from("user_secrets").upsert(
    { user_id: user.id, provider, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) {
    return { error: `Không đổi được: ${error.message}` };
  }

  revalidatePath("/profile");
  return {
    success:
      provider === "openai"
        ? "Đã chuyển sang dùng OpenAI (gpt-5.6-luna) — dùng key riêng của bạn."
        : "Đã chuyển về dùng Gemini.",
  };
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

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

  // Vừa dán key mới thì bật luôn công tắc dùng key riêng VÀ chuyển sang dùng
  // Gemini — không ai lưu key xong lại muốn nó tắt hoặc dùng provider khác.
  const { error } = await supabase.from("user_secrets").upsert(
    {
      user_id: user.id,
      gemini_api_key: key,
      use_own_key: true,
      provider: "gemini",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    return { error: `Không lưu được: ${error.message}` };
  }

  revalidatePath("/profile");
  return { success: "Đã lưu API key Gemini. Các tính năng AI của bạn sẽ dùng key này." };
}

/**
 * Bật/tắt dùng key Gemini riêng mà KHÔNG xóa key. Tắt → getAiConfig() trả
 * api_key null khi provider="gemini" → ai-service dùng key hệ thống. Chặn
 * bật khi chưa có key (bật cũng vô nghĩa).
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
      ? "Đã bật — các tính năng AI dùng key Gemini riêng của bạn."
      : "Đã tắt — tạm dùng key hệ thống, key riêng vẫn được lưu.",
  };
}

/** Chỉ xóa CỘT key Gemini (không đụng openai_api_key/provider của dòng chung). */
export async function deleteApiKey(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_secrets")
    .update({
      gemini_api_key: null,
      use_own_key: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  revalidatePath("/profile");
}

// ---------------------------------------------------------------------------
// OpenAI (opt-in, KHÔNG có key hệ thống)
// ---------------------------------------------------------------------------

export async function saveOpenAiApiKey(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const key = String(formData.get("openai_api_key") ?? "").trim();

  if (!key) {
    return { error: "Nhập API key OpenAI hoặc bấm Xóa key nếu muốn thôi dùng." };
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

  // Vừa dán key mới thì tự chuyển sang dùng OpenAI luôn — cùng nếp với Gemini.
  // Mỗi tài khoản tự lưu key CỦA RIÊNG MÌNH — RLS "user_secrets_own" chỉ cho
  // chính chủ ghi dòng của mình, không ai chia sẻ/dùng chung key được.
  const { error } = await supabase.from("user_secrets").upsert(
    {
      user_id: user.id,
      openai_api_key: key,
      provider: "openai",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    return { error: `Không lưu được: ${error.message}` };
  }

  revalidatePath("/profile");
  return {
    success: "Đã lưu API key OpenAI. Các tính năng AI của bạn sẽ dùng OpenAI (gpt-5.6-luna).",
  };
}

/** Xóa key OpenAI → KHÔNG được ở lại provider "openai" (không có key hệ
 *  thống dự phòng cho provider này trong bất kỳ trường hợp nào), tự rơi về
 *  Gemini. Không đụng gemini_api_key/use_own_key của dòng chung. */
export async function deleteOpenAiApiKey(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_secrets")
    .update({
      openai_api_key: null,
      provider: "gemini",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);
  revalidatePath("/profile");
}
