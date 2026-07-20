"use client";

import { useActionState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addReviewOption,
  deleteReviewOption,
  seedDefaultOptions,
} from "@/lib/actions/settings";
import { SKILL_GROUPS, skillGroupLabel } from "@/lib/skill-groups";
import type { ActionResult } from "@/lib/types";

export interface OptionRow {
  id: string;
  category: string;
  label: string;
  skill_group: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  strength: "💪 Điểm mạnh",
  improvement: "🎯 Cần cải thiện",
};

function OptionColumn({
  category,
  options,
}: {
  category: "strength" | "improvement";
  options: OptionRow[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    addReviewOption,
    {}
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{CATEGORY_LABELS[category]}</p>
      <ul className="space-y-2">
        {options.map((opt) => (
          <li
            key={opt.id}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
          >
            <span className="min-w-0">
              {opt.label}
              <Badge variant="outline" className="ml-2 rounded-md text-xs font-normal">
                {skillGroupLabel(opt.skill_group)}
              </Badge>
            </span>
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  aria-label={`Xóa ${opt.label}`}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                >
                  ✕
                </button>
              }
              title="Xóa lựa chọn này?"
              description={`"${opt.label}" sẽ không còn hiện khi nhận xét học viên. Các nhận xét đã lưu trước đó không bị ảnh hưởng.`}
              action={deleteReviewOption}
              fields={{ id: opt.id }}
            />
          </li>
        ))}
        {options.length === 0 && (
          <li className="text-sm text-muted-foreground">Chưa có lựa chọn nào.</li>
        )}
      </ul>
      <form action={formAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="category" value={category} />
        <Input
          name="label"
          placeholder="Thêm lựa chọn mới..."
          className="h-8 min-w-40 flex-1"
        />
        <Select name="skill_group" defaultValue="other">
          <SelectTrigger size="sm" className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SKILL_GROUPS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Thêm
        </Button>
      </form>
      <FormMessage result={state} />
    </div>
  );
}

export function OptionManager({ options }: { options: OptionRow[] }) {
  return (
    <div className="space-y-4">
      {options.length === 0 && (
        <form action={seedDefaultOptions}>
          <Button type="submit" size="sm" variant="secondary">
            ⚡ Thêm nhanh bộ lựa chọn mặc định
          </Button>
          <Badge variant="outline" className="ml-2 text-xs">
            12 lựa chọn gợi ý sẵn
          </Badge>
        </form>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <OptionColumn
          category="strength"
          options={options.filter((o) => o.category === "strength")}
        />
        <OptionColumn
          category="improvement"
          options={options.filter((o) => o.category === "improvement")}
        />
      </div>
    </div>
  );
}
