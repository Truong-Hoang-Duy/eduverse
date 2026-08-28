// Trạng thái nhận xét — hàm THUẦN, KHÔNG "use client" nên cả Server Component
// (page.tsx) lẫn Client Component (review-editor/review-list) đều gọi được.
// Trước đây các hàm này nằm trong review-editor.tsx ("use client") → page.tsx
// gọi bị lỗi "Attempted to call from the server but it's on the client".

export interface ExistingReview {
  strengths: string[];
  improvements: string[];
  ai_generated_comment: string | null;
  is_absent: boolean;
}

/** Điểm mạnh/cải thiện của CHÍNH một em ở một buổi trước — nguồn copy "buổi
 *  trước". Đặt ở module thuần (không "use client") để cả page.tsx (server) lẫn
 *  review-list (client) dùng chung. */
export interface PriorSelection {
  sessionNumber: number;
  strengths: string[];
  improvements: string[];
}

/** Đã nhận xét khi có ít nhất 1 trong 3: điểm mạnh, cần cải thiện, hoặc nhận
 *  xét AI — dùng chung cho badge "Đã nhận xét" và bộ lọc Hoàn thành/Chưa. */
export function isReviewed(existing: ExistingReview | null): boolean {
  return Boolean(
    existing &&
      (existing.strengths.length > 0 ||
        existing.improvements.length > 0 ||
        existing.ai_generated_comment)
  );
}

/** Buổi coi như XONG với em đó khi đã nhận xét HOẶC đã đánh vắng. Dùng cho bộ
 *  đếm "X/Y" và bộ lọc trạng thái (đánh vắng cũng là một cách "xử lý xong"). */
export function isHandled(existing: ExistingReview | null): boolean {
  return Boolean(existing?.is_absent) || isReviewed(existing);
}

/**
 * Chữ ký của dòng nhận xét ĐÃ LƯU — ghép vào `key` của `ReviewEditor` để React
 * DỰNG LẠI ô đó khi dữ liệu dưới DB đổi.
 *
 * Vì sao cần: `ReviewEditor` khởi tạo state bằng `useState(existing?...)`, mà
 * `useState` chỉ đọc giá trị đầu ĐÚNG MỘT LẦN. Sau khi "áp nhận xét từ buổi
 * trước" ghi hàng loạt rồi `revalidatePath`, props mới xuống nhưng state cũ vẫn
 * y nguyên → GV bấm Lưu, thấy báo thành công, mà các ô bên dưới KHÔNG đổi cho
 * tới khi tải lại trang. Đổi `key` là cách rẻ nhất để ép đọc lại.
 *
 * Đổi key CHỈ ảnh hưởng đúng em có dữ liệu đổi — em khác đang sửa dở không mất
 * (trừ lúc áp hàng loạt, khi đó mọi em đều đổi và mất phần chưa lưu là đúng ý).
 */
export function reviewSignature(existing: ExistingReview | null): string {
  if (!existing) return "empty";
  return [
    existing.strengths.join("|"),
    existing.improvements.join("|"),
    existing.is_absent ? "1" : "0",
    existing.ai_generated_comment ?? "",
  ].join("~");
}
