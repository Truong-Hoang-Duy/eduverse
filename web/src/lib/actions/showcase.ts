"use server";

import { revalidatePath } from "next/cache";

import {
  DEFAULT_EXPIRY_PRESET,
  EXPIRY_PRESETS,
  expiryFromPreset,
  generateShowcaseToken,
  SHOWCASE_INTRO_MAX,
  type ExpiryPreset,
} from "@/lib/showcase";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Link triển lãm gửi phụ huynh — phía GIÁO VIÊN.
 *
 * Mọi action ở đây đi qua client thường (anon key + cookie phiên), nên policy
 * `class_showcases_teacher_all` là thứ chặn thật: giáo viên lớp khác gọi cũng
 * không đụng được dòng của lớp này. KHÔNG dùng service-role ở đây.
 *
 * Phần dành cho khách vãng lai nằm ở `showcase-public.ts`.
 */

function revalidateClass(classId: string): void {
  revalidatePath(`/teacher/classes/${classId}`);
}

function isExpiryPreset(value: string): value is ExpiryPreset {
  return EXPIRY_PRESETS.some((p) => p.value === value);
}

/**
 * Bật link (tạo dòng + token nếu lớp chưa có) hoặc gia hạn link đang có.
 *
 * Bật lại một link đã tắt GIỮ NGUYÊN token cũ: giáo viên có thể đã gửi link cho
 * phụ huynh từ trước. Muốn khai tử link cũ thì dùng `rotateShowcaseToken`.
 */
export async function enableShowcase(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const classId = String(formData.get("class_id") ?? "");
  const rawPreset = String(formData.get("expiry") ?? DEFAULT_EXPIRY_PRESET);
  if (!classId) return { error: "Thiếu lớp." };
  if (!isExpiryPreset(rawPreset)) return { error: "Hạn dùng không hợp lệ." };

  const supabase = await createClient();
  const expiresAt = expiryFromPreset(rawPreset);

  const { data: existing } = await supabase
    .from("class_showcases")
    .select("id")
    .eq("class_id", classId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("class_showcases")
        .update({
          is_enabled: true,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    : await supabase.from("class_showcases").insert({
        class_id: classId,
        token: generateShowcaseToken(),
        is_enabled: true,
        expires_at: expiresAt,
      });

  if (error) {
    return { error: `Không bật được link: ${error.message}` };
  }

  revalidateClass(classId);
  return { success: "Đã bật link cho phụ huynh." };
}

/** Tắt link — dữ liệu (bài chấm, tim) giữ nguyên, bật lại là có ngay. */
export async function disableShowcase(formData: FormData): Promise<void> {
  const classId = String(formData.get("class_id") ?? "");
  if (!classId) return;

  const supabase = await createClient();
  await supabase
    .from("class_showcases")
    .update({ is_enabled: false, updated_at: new Date().toISOString() })
    .eq("class_id", classId);

  revalidateClass(classId);
}

/**
 * Đổi token — link cũ chết ngay lập tức.
 *
 * Đây là đường THU HỒI duy nhất khi link đã bị chuyển tiếp ra ngoài phạm vi
 * mong muốn: xóa dòng rồi tạo lại thì mất luôn bài chấm, nên chỉ đổi token.
 */
export async function rotateShowcaseToken(formData: FormData): Promise<void> {
  const classId = String(formData.get("class_id") ?? "");
  if (!classId) return;

  const supabase = await createClient();
  await supabase
    .from("class_showcases")
    .update({
      token: generateShowcaseToken(),
      updated_at: new Date().toISOString(),
    })
    .eq("class_id", classId);

  revalidateClass(classId);
}

/** Lời ngỏ + công tắc tương tác + danh sách em được ẩn khỏi trang. */
export async function saveShowcaseSettings(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const classId = String(formData.get("class_id") ?? "");
  if (!classId) return { error: "Thiếu lớp." };

  const intro = String(formData.get("intro") ?? "").trim();
  if (intro.length > SHOWCASE_INTRO_MAX) {
    return { error: `Lời ngỏ tối đa ${SHOWCASE_INTRO_MAX} ký tự.` };
  }

  // Checkbox không tick thì KHÔNG có trong FormData — vắng mặt = tắt.
  const allowRatings = formData.get("allow_ratings") !== null;
  const allowReactions = formData.get("allow_reactions") !== null;
  const showRatingResults = formData.get("show_rating_results") !== null;
  const hidden = formData
    .getAll("hidden_student_ids")
    .map((v) => String(v))
    .filter(Boolean);

  const supabase = await createClient();
  const { error } = await supabase
    .from("class_showcases")
    .update({
      intro: intro || null,
      allow_ratings: allowRatings,
      allow_reactions: allowReactions,
      show_rating_results: showRatingResults,
      hidden_student_ids: hidden,
      updated_at: new Date().toISOString(),
    })
    .eq("class_id", classId);

  if (error) {
    return { error: `Không lưu được: ${error.message}` };
  }

  revalidateClass(classId);
  return { success: "Đã lưu thiết lập trang phụ huynh." };
}

/**
 * Gỡ một bài chấm của khách — kiểm duyệt SAU khi đã hiện (user chốt 2026-08-29).
 *
 * Gỡ là mất CẢ điểm lẫn nhận xét của lượt đó: bài chấm ẩn danh nên không có
 * đường nào "chỉ xóa chữ mà giữ điểm" cho ra hồn, và thứ giáo viên cần gỡ luôn
 * là một lượt chấm không tử tế chứ không phải riêng câu chữ.
 */
export async function deleteShowcaseRating(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("showcase_ratings").delete().eq("id", id);

  if (classId) revalidateClass(classId);
}

/**
 * Ghi nhận hoặc hủy học sinh đang thuyết trình trên sân khấu (Live Spotlight).
 */
export async function setSpotlightProject(
  classId: string,
  projectId: string | null
): Promise<ActionResult> {
  if (!classId) return { error: "Thiếu lớp." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_showcases")
    .update({
      spotlight_project_id: projectId,
      updated_at: new Date().toISOString(),
    })
    .eq("class_id", classId);

  if (error) {
    return { error: `Không thể cập nhật: ${error.message}` };
  }

  revalidateClass(classId);
  return { success: projectId ? "Đã bật thuyết trình." : "Đã tắt thuyết trình." };
}

/**
 * Lấy số lượng thiết bị thực tế đang xem triển lãm theo thời gian thực (dành cho màn hình TV).
 */
export async function getShowcaseLiveViewCount(
  classId: string
): Promise<number | null> {
  if (!classId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_showcases")
    .select("view_count")
    .eq("class_id", classId)
    .maybeSingle();

  if (error || !data) return null;
  return data.view_count;
}

/**
 * Đặt lại số lượt kết nối về 0 khi bắt đầu phiên chiếu TV đón tiếp phụ huynh.
 */
export async function resetShowcaseViewCount(
  classId: string
): Promise<ActionResult> {
  if (!classId) return { error: "Thiếu lớp." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_showcases")
    .update({ view_count: 0 })
    .eq("class_id", classId);

  if (error) {
    return { error: `Không thể đặt lại bộ đếm: ${error.message}` };
  }

  return { success: "Đã đặt lại số thiết bị kết nối về 0." };
}
