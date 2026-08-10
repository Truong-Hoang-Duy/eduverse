"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewCombo } from "@/lib/actions/review-combos";

/**
 * Áp "bộ combo" cho một ô nhận xét: chọn 1 bộ lưu sẵn → GỘP vào lựa chọn hiện
 * tại (không ghi đè). Mỗi bộ giờ CHỈ một loại — điểm mạnh HOẶC cần cải thiện
 * (yêu cầu user 2026-08-06) — nên gom theo 2 SelectGroup để dễ tìm.
 *
 * Việc TẠO/XÓA/SỬA bộ nằm ở trang Cài đặt (combo-manager), KHÔNG ở đây — ở mỗi
 * học viên chỉ chọn áp cho nhanh (yêu cầu user 2026-07-27). GOM vào MỘT
 * dropdown thay vì một hàng nút rời (yêu cầu user 2026-08-05, lần thử trước
 * bung hết combo thành nút thì tràn 4-5 dòng khi GV có nhiều bộ) — vẫn LUÔN
 * hiện ngay cạnh phần điểm mạnh/cải thiện, không giấu trong accordion phụ.
 */
export function ComboBar({
  combos,
  onApply,
}: {
  combos: ReviewCombo[];
  onApply: (strengths: string[], improvements: string[]) => void;
}) {
  if (combos.length === 0) return null;

  const strengthCombos = combos.filter((c) => c.type === "strength");
  const improvementCombos = combos.filter((c) => c.type === "improvement");

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
        {strengthCombos.length > 0 && (
          <SelectGroup>
            <SelectLabel>💪 Tích cực</SelectLabel>
            {strengthCombos.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {improvementCombos.length > 0 && (
          <SelectGroup>
            <SelectLabel>🎯 Cải thiện</SelectLabel>
            {improvementCombos.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
