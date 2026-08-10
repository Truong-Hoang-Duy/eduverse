"use client";

import { Button } from "@/components/ui/button";
import type { ReviewCombo } from "@/lib/actions/review-combos";

/**
 * Hàng nút áp "bộ combo" cho một ô nhận xét: bấm 1 bộ lưu sẵn → GỘP cả bộ
 * điểm mạnh/cải thiện vào lựa chọn hiện tại (không ghi đè).
 *
 * Việc TẠO/XÓA bộ nằm ở trang Cài đặt (combo-manager), KHÔNG ở đây — ở mỗi học
 * viên chỉ chọn áp cho nhanh (yêu cầu user 2026-07-27). Hiện dạng nút thay vì
 * dropdown Select (yêu cầu user 2026-08-05) — bấm thẳng, không cần mở ra
 * trước; chỉ hiện tên bộ, không kèm số lượng (3+2) dưới mỗi nút.
 */
export function ComboBar({
  combos,
  onApply,
}: {
  combos: ReviewCombo[];
  onApply: (strengths: string[], improvements: string[]) => void;
}) {
  if (combos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {combos.map((c) => (
        <Button
          key={c.id}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onApply(c.strengths, c.improvements)}
        >
          ⚡ {c.name}
        </Button>
      ))}
    </div>
  );
}
