"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewCombo } from "@/lib/actions/review-combos";

/**
 * Thanh áp "bộ combo" cho một ô nhận xét: chọn 1 bộ lưu sẵn → GỘP cả bộ điểm
 * mạnh/cải thiện vào lựa chọn hiện tại (không ghi đè).
 *
 * Việc TẠO/XÓA bộ nằm ở trang Cài đặt (combo-manager), KHÔNG ở đây — ở mỗi học
 * viên chỉ chọn áp cho nhanh (yêu cầu user 2026-07-27).
 */
export function ComboBar({
  combos,
  onApply,
}: {
  combos: ReviewCombo[];
  onApply: (strengths: string[], improvements: string[]) => void;
}) {
  if (combos.length === 0) return null;

  function applyById(id: string) {
    const combo = combos.find((c) => c.id === id);
    if (combo) onApply(combo.strengths, combo.improvements);
  }

  return (
    <Select value="" onValueChange={applyById}>
      <SelectTrigger
        size="sm"
        className="h-7 w-[190px] text-xs"
        aria-label="Áp dụng bộ combo lưu sẵn"
      >
        <SelectValue placeholder="⚡ Áp dụng bộ combo..." />
      </SelectTrigger>
      <SelectContent>
        {combos.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name} ({c.strengths.length}+{c.improvements.length})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
