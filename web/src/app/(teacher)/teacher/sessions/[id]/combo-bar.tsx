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
 * Áp "bộ combo" cho một ô nhận xét: chọn 1 bộ lưu sẵn → GỘP vào lựa chọn hiện
 * tại (không ghi đè).
 *
 * Mỗi bộ là một CHÂN DUNG học viên điền cả điểm mạnh + cần cải thiện + SPCK
 * trong MỘT lần bấm (user chốt 2026-08-28, đảo ngược việc chia loại của
 * 2026-08-06). Vì cùng đợt đó ô tìm-tích tự do đã bị gỡ, đây là đường DUY NHẤT
 * để thêm điểm mạnh/cần cải thiện — chia loại thì mỗi em phải áp 2-3 lượt.
 * Danh sách để PHẲNG, không còn tiêu đề nhóm.
 *
 * Việc TẠO/XÓA/SỬA bộ nằm ở trang Cài đặt (combo-manager), KHÔNG ở đây — ở mỗi
 * học viên chỉ chọn áp cho nhanh (yêu cầu user 2026-07-27). GOM vào MỘT
 * dropdown thay vì một hàng nút rời (yêu cầu user 2026-08-05, lần thử trước
 * bung hết combo thành nút thì tràn 4-5 dòng khi GV có nhiều bộ).
 */
export function ComboBar({
  combos,
  onApply,
}: {
  combos: ReviewCombo[];
  onApply: (
    strengths: string[],
    improvements: string[],
    projectNotes: string[]
  ) => void;
}) {
  if (combos.length === 0) return null;

  function applyById(id: string) {
    const combo = combos.find((c) => c.id === id);
    if (combo) onApply(combo.strengths, combo.improvements, combo.projectNotes);
  }

  return (
    <Select value="" onValueChange={applyById}>
      <SelectTrigger
        size="sm"
        className="h-7 w-[230px] text-xs"
        aria-label="Áp dụng bộ combo lưu sẵn"
      >
        <SelectValue placeholder="⚡ Áp dụng bộ combo..." />
      </SelectTrigger>
      <SelectContent>
        {combos.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
