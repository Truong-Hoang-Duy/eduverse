"use server";

import { revalidatePath } from "next/cache";

import { getAiConfig } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import {
  type CodeSnippet,
  decodeSnippetFallback,
  DEFAULT_STARTER_SNIPPETS,
  encodeSnippetFallback,
  inferCodeSnippetSuggestion,
  normalizeSnippetCategory,
  SNIPPET_FALLBACK_PREFIX,
  type SnippetCategory,
} from "@/lib/code-snippets";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function revalidateSnippets(): void {
  revalidatePath("/teacher/snippets");
  revalidatePath("/student/snippets");
}

// Ghi nhớ trạng thái bảng code_snippets trên DB live để tránh gọi lặp lại bảng chưa tạo
let codeSnippetsTableMissing = false;

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  const missing =
    code === "42P01" ||
    code === "PGRST205" ||
    code === "405" ||
    msg.includes("code_snippets") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("method not allowed");
  if (missing) {
    codeSnippetsTableMissing = true;
  }
  return missing;
}

/**
 * Lấy danh sách các đoạn code trong Sổ tay Code của giáo viên.
 * Nếu giáo viên lần đầu mở Sổ tay (chưa có đoạn code nào), tự động khởi tạo sẵn mẫu %matplotlib inline.
 */
export async function listMySnippets(teacherId?: string): Promise<CodeSnippet[]> {
  const supabase = await createClient();
  let uid = teacherId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) return [];

  if (!codeSnippetsTableMissing) {
    const { data, error } = await supabase
      .from("code_snippets")
      .select(
        "id, title, code, usage_guide, category, is_pinned, created_at, updated_at"
      )
      .eq("teacher_id", uid)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      if (data.length === 0) {
        const seedRows = DEFAULT_STARTER_SNIPPETS.map((s) => ({
          teacher_id: uid,
          title: s.title,
          code: s.code,
          usage_guide: s.usageGuide,
          category: s.category,
          is_pinned: s.isPinned,
        }));
        const { data: inserted } = await supabase
          .from("code_snippets")
          .insert(seedRows)
          .select(
            "id, title, code, usage_guide, category, is_pinned, created_at, updated_at"
          );
        if (inserted && inserted.length > 0) {
          return inserted.map((r) => ({
            id: r.id,
            title: r.title,
            code: r.code,
            usageGuide: r.usage_guide,
            category: normalizeSnippetCategory(r.category),
            isPinned: r.is_pinned,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));
        }
      }

      return data.map((r) => ({
        id: r.id,
        title: r.title,
        code: r.code,
        usageGuide: r.usage_guide,
        category: normalizeSnippetCategory(r.category),
        isPinned: r.is_pinned,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }

    if (!isMissingTableError(error)) {
      return [];
    }
  }

  // Fallback sang zalo_templates nếu bảng code_snippets chưa được tạo trên DB live
  const { data: fbRows } = await supabase
    .from("zalo_templates")
    .select("id, name, template_text")
    .eq("teacher_id", uid)
    .like("name", `${SNIPPET_FALLBACK_PREFIX}%`);

  const decoded = (fbRows ?? [])
    .map(decodeSnippetFallback)
    .filter((x): x is CodeSnippet => x !== null);

  if (decoded.length === 0) {
    const nowIso = new Date().toISOString();
    const seeded: CodeSnippet[] = [];
    for (const s of DEFAULT_STARTER_SNIPPETS) {
      const encoded = encodeSnippetFallback({
        ...s,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      const { data: ins } = await supabase
        .from("zalo_templates")
        .insert({
          teacher_id: uid,
          name: encoded.name,
          template_text: encoded.template_text,
        })
        .select("id, name, template_text")
        .single();
      if (ins) {
        const item = decodeSnippetFallback(ins);
        if (item) seeded.push(item);
      }
    }
    return seeded;
  }

  return decoded.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * Lấy danh sách Sổ tay Code cho học viên xem (chỉ đọc).
 * Ưu tiên đọc từ bảng code_snippets (RLS cho phép authenticated select),
 * nếu DB live chưa có bảng code_snippets thì đọc qua admin client (chỉ lọc các dòng __CODE_SNIPPET__:).
 */
export async function listSnippetsForStudent(studentId?: string): Promise<CodeSnippet[]> {
  const supabase = await createClient();
  let uid = studentId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) return [];

  if (!codeSnippetsTableMissing) {
    const { data, error } = await supabase
      .from("code_snippets")
      .select(
        "id, title, code, usage_guide, category, is_pinned, created_at, updated_at"
      )
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      if (data.length === 0) {
        const nowIso = new Date().toISOString();
        return DEFAULT_STARTER_SNIPPETS.map((s, idx) => ({
          id: `starter-${idx}`,
          ...s,
          createdAt: nowIso,
          updatedAt: nowIso,
        }));
      }
      return data.map((r) => ({
        id: r.id,
        title: r.title,
        code: r.code,
        usageGuide: r.usage_guide,
        category: normalizeSnippetCategory(r.category),
        isPinned: r.is_pinned,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }

    isMissingTableError(error);
  }

  // Fallback đọc các dòng __CODE_SNIPPET__: từ zalo_templates qua server-side admin client
  try {
    const admin = createAdminClient();
    const { data: fbRows } = await admin
      .from("zalo_templates")
      .select("id, name, template_text")
      .like("name", `${SNIPPET_FALLBACK_PREFIX}%`);

    const decoded = (fbRows ?? [])
      .map(decodeSnippetFallback)
      .filter((x): x is CodeSnippet => x !== null);

    if (decoded.length === 0) {
      const nowIso = new Date().toISOString();
      return DEFAULT_STARTER_SNIPPETS.map((s, idx) => ({
        id: `starter-${idx}`,
        ...s,
        createdAt: nowIso,
        updatedAt: nowIso,
      }));
    }

    return decoded.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  } catch {
    const nowIso = new Date().toISOString();
    return DEFAULT_STARTER_SNIPPETS.map((s, idx) => ({
      id: `starter-${idx}`,
      ...s,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));
  }
}

export async function saveCodeSnippet(input: {
  id?: string;
  title: string;
  code: string;
  usageGuide: string;
  category: string;
  isPinned: boolean;
}): Promise<{ snippet?: CodeSnippet; error?: string }> {
  const code = input.code.trim();
  if (!code) {
    return { error: "Vui lòng nhập đoạn code cần lưu." };
  }

  const autoSuggested = inferCodeSnippetSuggestion(code, input.title);
  const title = input.title.trim() || autoSuggested.title;
  const usageGuide = input.usageGuide.trim() || autoSuggested.usageGuide;
  const category = normalizeSnippetCategory(
    input.category || autoSuggested.category
  );
  const isPinned = Boolean(input.isPinned);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const nowIso = new Date().toISOString();

  if (input.id) {
    const { data, error } = await supabase
      .from("code_snippets")
      .update({
        title,
        code,
        usage_guide: usageGuide,
        category,
        is_pinned: isPinned,
        updated_at: nowIso,
      })
      .eq("id", input.id)
      .eq("teacher_id", user.id)
      .select(
        "id, title, code, usage_guide, category, is_pinned, created_at, updated_at"
      )
      .single();

    if (!error && data) {
      revalidateSnippets();
      return {
        snippet: {
          id: data.id,
          title: data.title,
          code: data.code,
          usageGuide: data.usage_guide,
          category: normalizeSnippetCategory(data.category),
          isPinned: data.is_pinned,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      };
    }

    if (isMissingTableError(error)) {
      const { data: existing } = await supabase
        .from("zalo_templates")
        .select("id, name, template_text")
        .eq("id", input.id)
        .eq("teacher_id", user.id)
        .single();
      const prev = existing ? decodeSnippetFallback(existing) : null;
      const encoded = encodeSnippetFallback({
        title,
        code,
        usageGuide,
        category,
        isPinned,
        createdAt: prev?.createdAt ?? nowIso,
        updatedAt: nowIso,
      });
      const { data: updated, error: fbErr } = await supabase
        .from("zalo_templates")
        .update({
          name: encoded.name,
          template_text: encoded.template_text,
        })
        .eq("id", input.id)
        .eq("teacher_id", user.id)
        .select("id, name, template_text")
        .single();

      if (fbErr || !updated) {
        return { error: `Không cập nhật được: ${fbErr?.message ?? "Lỗi lưu"}` };
      }
      revalidateSnippets();
      const decoded = decodeSnippetFallback(updated);
      return decoded ? { snippet: decoded } : { error: "Lỗi giải mã dữ liệu." };
    }

    return { error: `Không cập nhật được: ${error?.message ?? "Lỗi lưu"}` };
  }

  // Thêm mới
  const { data, error } = await supabase
    .from("code_snippets")
    .insert({
      teacher_id: user.id,
      title,
      code,
      usage_guide: usageGuide,
      category,
      is_pinned: isPinned,
    })
    .select(
      "id, title, code, usage_guide, category, is_pinned, created_at, updated_at"
    )
    .single();

  if (!error && data) {
    revalidateSnippets();
    return {
      snippet: {
        id: data.id,
        title: data.title,
        code: data.code,
        usageGuide: data.usage_guide,
        category: normalizeSnippetCategory(data.category),
        isPinned: data.is_pinned,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  }

  if (isMissingTableError(error)) {
    const encoded = encodeSnippetFallback({
      title,
      code,
      usageGuide,
      category,
      isPinned,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    const { data: inserted, error: fbErr } = await supabase
      .from("zalo_templates")
      .insert({
        teacher_id: user.id,
        name: encoded.name,
        template_text: encoded.template_text,
      })
      .select("id, name, template_text")
      .single();

    if (fbErr || !inserted) {
      return { error: `Không thêm được: ${fbErr?.message ?? "Lỗi lưu"}` };
    }
    revalidateSnippets();
    const decoded = decodeSnippetFallback(inserted);
    return decoded ? { snippet: decoded } : { error: "Lỗi giải mã dữ liệu." };
  }

  return { error: `Không lưu được: ${error?.message ?? "Lỗi không xác định"}` };
}

export async function togglePinCodeSnippet(
  id: string,
  isPinned: boolean
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập hết hạn." };

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("code_snippets")
    .update({ is_pinned: isPinned, updated_at: nowIso })
    .eq("id", id)
    .eq("teacher_id", user.id);

  if (!error) {
    revalidateSnippets();
    return { ok: true };
  }

  if (isMissingTableError(error)) {
    const { data: existing } = await supabase
      .from("zalo_templates")
      .select("id, name, template_text")
      .eq("id", id)
      .eq("teacher_id", user.id)
      .single();
    const prev = existing ? decodeSnippetFallback(existing) : null;
    if (!prev) return { error: "Không tìm thấy đoạn code." };

    const encoded = encodeSnippetFallback({
      title: prev.title,
      code: prev.code,
      usageGuide: prev.usageGuide,
      category: prev.category,
      isPinned,
      createdAt: prev.createdAt,
      updatedAt: nowIso,
    });
    const { error: fbErr } = await supabase
      .from("zalo_templates")
      .update({
        name: encoded.name,
        template_text: encoded.template_text,
      })
      .eq("id", id)
      .eq("teacher_id", user.id);
    if (fbErr) return { error: fbErr.message };
    revalidateSnippets();
    return { ok: true };
  }

  return { error: error.message };
}

export async function deleteCodeSnippet(
  id: string
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập hết hạn." };

  const { error } = await supabase
    .from("code_snippets")
    .delete()
    .eq("id", id)
    .eq("teacher_id", user.id);

  if (!error) {
    revalidateSnippets();
    return { ok: true };
  }

  if (isMissingTableError(error)) {
    const { error: fbErr } = await supabase
      .from("zalo_templates")
      .delete()
      .eq("id", id)
      .eq("teacher_id", user.id);
    if (fbErr) return { error: fbErr.message };
    revalidateSnippets();
    return { ok: true };
  }

  return { error: error.message };
}

export async function suggestCodeSnippetWithAi(input: {
  code: string;
  teacherHint?: string;
}): Promise<{
  title?: string;
  usageGuide?: string;
  category?: SnippetCategory;
  error?: string;
}> {
  const code = input.code.trim();
  if (!code) {
    return {
      error: "Vui lòng dán đoạn code vào ô trước khi bấm '✨ AI soạn giúp'.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const aiConfig = await getAiConfig();
  if (!aiConfig.ok) {
    return inferCodeSnippetSuggestion(code, input.teacherHint);
  }

  try {
    const data = await callAiService<{
      title: string;
      usage_guide: string;
      category: string;
    }>("/suggest-code-snippet", {
      api_key: aiConfig.api_key,
      provider: aiConfig.provider,
      code,
      teacher_hint: input.teacherHint?.trim() || null,
    });

    return {
      title: data.title.trim(),
      usageGuide: data.usage_guide.trim(),
      category: normalizeSnippetCategory(data.category),
    };
  } catch (err) {
    if (err instanceof AiServiceError) {
      if (
        err.status === 404 ||
        err.status === 405 ||
        err.status >= 500
      ) {
        return inferCodeSnippetSuggestion(code, input.teacherHint);
      }
      return { error: err.message };
    }
    return inferCodeSnippetSuggestion(code, input.teacherHint);
  }
}
