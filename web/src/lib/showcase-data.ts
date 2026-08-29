// Đọc dữ liệu trang triển lãm công khai. Chỉ server — trang phụ huynh là Server
// Component, không có gì chạy ở client cần hàm này.
import "server-only";

import { cache } from "react";

import type { ShowcasePayload } from "@/lib/showcase";
import { isShowcaseToken } from "@/lib/showcase";
import { createClient } from "@/lib/supabase/server";

/**
 * Lấy toàn bộ nội dung trang theo token.
 *
 * Trả về `null` cho MỌI trường hợp không xem được (token sai, giáo viên đã tắt,
 * đã hết hạn) — cố ý không phân biệt, khớp với hàm SQL: phân biệt là xác nhận hộ
 * kẻ dò token rằng nó từng tồn tại.
 *
 * Client dùng anon key: chính RPC `get_showcase` (SECURITY DEFINER) mới là nơi
 * kiểm token, ở đây không có bảng nào đọc thẳng.
 *
 * Bọc `cache()` vì `generateMetadata` và chính trang đều gọi — không bọc là mỗi
 * lượt phụ huynh mở trang tốn HAI vòng truy vấn (cùng cách `get-profile.ts` làm).
 */
export const loadShowcase = cache(
  async (token: string): Promise<ShowcasePayload | null> => {
    // Chặn chuỗi rác trước khi đi tới DB — đỡ một vòng mạng cho mọi URL bịa.
    if (!isShowcaseToken(token)) return null;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_showcase", {
      p_token: token,
    });

    if (error || !data) return null;
    return data as unknown as ShowcasePayload;
  }
);
