// Trạng thái nhận xét — hàm THUẦN, KHÔNG "use client" nên cả Server Component
// (page.tsx) lẫn Client Component (review-editor/review-list) đều gọi được.
// Trước đây các hàm này nằm trong review-editor.tsx ("use client") → page.tsx
// gọi bị lỗi "Attempted to call from the server but it's on the client".

export interface ExistingReview {
  strengths: string[];
  improvements: string[];
  advice: string | null;
  ai_generated_comment: string | null;
  academic_level: string | null;
  is_absent: boolean;
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
