"use client";

import { StarIcon } from "@/components/showcase/emblem";
import { RATING_MAX } from "@/lib/showcase";

/**
 * Hàng sao chấm điểm một tiêu chí.
 *
 * Nút to (44px) vì phụ huynh chấm bằng NGÓN TAY trên điện thoại, đang đứng, có
 * khi một tay còn cầm túi. Bấm lại đúng ngôi sao đang chọn = bỏ chấm tiêu chí đó
 * (mọi tiêu chí đều được phép bỏ trống).
 *
 * Sao vẽ bằng SVG theo màu đồng thau chứ không dùng emoji ⭐: emoji mỗi hệ điều
 * hành hiển thị một kiểu và luôn trông như giao diện mặc định.
 */
export function StarRating({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-sc-ink-soft">{hint}</p>}
      </div>
      <div className="flex items-center" role="group" aria-label={label}>
        {Array.from({ length: RATING_MAX }, (_, i) => i + 1).map((star) => {
          const active = value !== null && star <= value;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(value === star ? null : star)}
              aria-label={`${label}: ${star} sao`}
              aria-pressed={active}
              className={`flex size-11 items-center justify-center rounded-lg transition-transform hover:scale-110 ${
                active ? "text-sc-brass" : "text-sc-brass/35"
              }`}
            >
              <StarIcon filled={active} className="size-7" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Hàng sao CHỈ ĐỌC (hiện điểm trung bình) — làm tròn để đổ đầy. */
export function StarDisplay({ score }: { score: number }) {
  const rounded = Math.round(score);
  return (
    <span
      className="inline-flex items-center gap-1 text-sc-brass"
      title={`${score}/${RATING_MAX}`}
    >
      <span className="flex" aria-hidden>
        {Array.from({ length: RATING_MAX }, (_, i) => (
          <StarIcon key={i} filled={i < rounded} className="size-4" />
        ))}
      </span>
      <span className="text-sm font-medium">{score.toFixed(1)}</span>
    </span>
  );
}
