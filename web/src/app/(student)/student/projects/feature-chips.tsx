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
}: {
  features: string[];
  onChange: (next: string[]) => void;
  inputId?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
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
          placeholder="VD: Đăng nhập — gõ rồi Enter"
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          Thêm
        </Button>
      </div>

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
