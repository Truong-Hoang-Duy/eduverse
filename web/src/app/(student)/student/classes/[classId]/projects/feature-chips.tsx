"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Nhập danh sách chức năng dạng chip: gõ + Enter (hoặc nút Thêm) để thêm, bấm ✕ để
 * bỏ. Thay cho textarea "mỗi dòng một" dễ lỗi. Không quản state — cha giữ mảng.
 */
export function FeatureChips({
  features,
  onChange,
  inputId,
  max,
  featureMaxLength,
}: {
  features: string[];
  onChange: (next: string[]) => void;
  inputId?: string;
  /** Số chức năng tối đa — khi đạt, khóa ô nhập. */
  max?: number;
  /** Độ dài tối đa mỗi chức năng. */
  featureMaxLength?: number;
}) {
  const [draft, setDraft] = useState("");
  const atMax = max !== undefined && features.length >= max;

  function add() {
    if (atMax) return;
    const value = draft.trim();
    if (!value) return;
    // Bỏ trùng (không phân biệt hoa/thường).
    if (!features.some((f) => f.toLowerCase() === value.toLowerCase())) {
      onChange([...features, value]);
    }
    setDraft("");
  }

  function remove(feature: string) {
    onChange(features.filter((f) => f !== feature));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Đừng submit cả form khi thêm chức năng.
              e.preventDefault();
              add();
            }
          }}
          placeholder={atMax ? `Đã đạt tối đa ${max} chức năng` : "VD: Đăng nhập — gõ rồi Enter"}
          maxLength={featureMaxLength}
          disabled={atMax}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={!draft.trim() || atMax}
        >
          Thêm
        </Button>
      </div>

      {atMax && (
        <p className="text-xs text-muted-foreground">
          Đã đạt tối đa {max} chức năng.
        </p>
      )}

      {features.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {features.map((feature) => (
            <Badge
              key={feature}
              variant="secondary"
              className="cursor-pointer gap-1 rounded-md font-normal"
              onClick={() => remove(feature)}
              title="Bấm để bỏ"
            >
              {feature}
              <span className="text-muted-foreground">✕</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
