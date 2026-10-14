"use server";

import {
  EDUCATIONAL_MODERATION_WARNING,
  checkEducationalContent,
} from "@/lib/content-moderation";
import {
  SHOWCASE_COMMENT_MAX,
  isShowcaseToken,
  type MyRating,
} from "@/lib/showcase";
import { createClient } from "@/lib/supabase/server";

/**
 * Hành động của KHÁCH VÃNG LAI trên trang triển lãm — người gọi không đăng nhập.
 *
 * Vì ai cầm link cũng gọi được, mọi hàng rào thật (token còn hạn không, giáo
 * viên có bật mục này không, có spam không) đều nằm trong RPC SECURITY DEFINER ở
 * DB. Phần kiểm ở đây chỉ để báo lỗi tử tế và đỡ một vòng mạng.
 */

/** Thông điệp lỗi từ `raise exception` trong RPC đã là tiếng Việt, đưa thẳng ra. */
function rpcErrorMessage(message: string, fallback: string): string {
  const clean = message.trim();
  return clean && !clean.includes("PGRST") ? clean : fallback;
}

export interface RateShowcaseResult {
  rating?: MyRating;
  error?: string;
}

/**
 * Chấm điểm + nhận xét ẨN DANH cho một em. Gọi lại là SỬA bài chấm cũ của chính
 * máy đó, không tạo dòng mới.
 *
 * Tiêu chí nào bỏ trống thì truyền `null` — phụ huynh không nghe được phần
 * thuyết trình vẫn chấm được sản phẩm.
 */
export async function rateShowcaseProject(input: {
  token: string;
  projectId: string;
  visitorId: string;
  product: number | null;
  presentation: number | null;
  creativity: number | null;
  comment: string;
}): Promise<RateShowcaseResult> {
  if (!isShowcaseToken(input.token)) {
    return { error: "Link này không còn hiệu lực." };
  }

  const comment = input.comment.trim();
  if (comment.length > SHOWCASE_COMMENT_MAX) {
    return { error: `Cảm nghĩ & góp ý tối đa ${SHOWCASE_COMMENT_MAX} ký tự.` };
  }

  if (comment) {
    const check = checkEducationalContent(comment);
    if (!check.isAppropriate) {
      return { error: check.message ?? EDUCATIONAL_MODERATION_WARNING };
    }
  }

  const scores = [input.product, input.presentation, input.creativity];
  if (scores.every((s) => s === null) && !comment) {
    return { error: "Hãy chấm ít nhất một tiêu chí hoặc viết cảm nghĩ & góp ý." };
  }
  if (scores.some((s) => s !== null && (s < 1 || s > 5))) {
    return { error: "Điểm phải từ 1 đến 5 sao." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rate_showcase_project", {
    p_token: input.token,
    p_project_id: input.projectId,
    p_visitor_id: input.visitorId,
    p_product: input.product,
    p_presentation: input.presentation,
    p_creativity: input.creativity,
    p_comment: comment || null,
  });

  if (error) {
    return { error: rpcErrorMessage(error.message, "Không gửi được cảm nghĩ & góp ý.") };
  }
  return { rating: data as unknown as MyRating };
}

/**
 * Bài chấm của CHÍNH máy đang xem — để mở lại trang vẫn thấy mình đã chấm những
 * em nào và sửa được.
 *
 * `visitorId` chỉ nằm trong localStorage của máy đó, không hiện ở đâu trên
 * trang, nên không ai đọc được bài chấm của người khác.
 */
export async function loadMyShowcaseRatings(
  token: string,
  visitorId: string
): Promise<MyRating[]> {
  if (!isShowcaseToken(token)) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_showcase_ratings", {
    p_token: token,
    p_visitor_id: visitorId,
  });

  if (error || !data) return [];
  return data as unknown as MyRating[];
}

export interface ToggleHeartResult {
  count?: number;
  reacted?: boolean;
  error?: string;
}

/**
 * Thả tim / bỏ tim cho một sản phẩm — một chạm, khác với chấm điểm là phải nghĩ.
 *
 * `visitorId` là chuỗi ngẫu nhiên trình duyệt tự sinh và giữ trong localStorage
 * — không định danh ai, chỉ để một máy đếm một tim và bấm lại là bỏ.
 */
export async function toggleShowcaseHeart(input: {
  token: string;
  projectId: string;
  visitorId: string;
}): Promise<ToggleHeartResult> {
  if (!isShowcaseToken(input.token)) {
    return { error: "Link này không còn hiệu lực." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_showcase_reaction", {
    p_token: input.token,
    p_project_id: input.projectId,
    p_visitor_id: input.visitorId,
  });

  if (error) {
    return { error: rpcErrorMessage(error.message, "Không thả tim được.") };
  }

  const result = data as unknown as { count: number; reacted: boolean };
  return { count: result.count, reacted: result.reacted };
}

/** Đếm lượt mở trang. Client gọi MỘT lần mỗi trình duyệt (xem `showcase-view`). */
export async function trackShowcaseView(token: string): Promise<void> {
  if (!isShowcaseToken(token)) return;

  const supabase = await createClient();
  await supabase.rpc("bump_showcase_view", { p_token: token });
}

/** Đọc nhanh id học sinh đang thuyết trình (dùng cho polling nhẹ từ điện thoại phụ huynh). */
export async function getShowcaseSpotlight(token: string): Promise<string | null> {
  if (!isShowcaseToken(token)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_showcase_spotlight", {
    p_token: token,
  });

  if (error || !data || typeof data !== "object") return null;
  const row = data as { spotlight_project_id?: string | null };
  return row.spotlight_project_id ?? null;
}
