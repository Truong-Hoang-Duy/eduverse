"use client";

import { useActionState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addReviewOption,
  deleteReviewOption,
  seedDefaultOptions,
} from "@/lib/actions/settings";
import { SKILL_GROUPS } from "@/lib/skill-groups";
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

/** 1 nhóm kỹ năng trong 1 cột — thu gọn mặc định, mở ra mới thấy chi tiết +
 *  form thêm (đã ở đúng ngữ cảnh nhóm nên không cần chọn lại skill_group). */
function GroupAccordion({
  category,
  group,
  options,
}: {
  category: "strength" | "improvement";
  group: (typeof SKILL_GROUPS)[number];
  options: OptionRow[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    addReviewOption,
    {}
  );

  return (
    <details className="group rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-medium">{group.label}</span>
        <span className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-md text-xs font-normal">
            {options.length}
          </Badge>
          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
            ▼
          </span>
        </span>
      </summary>

      <div className="space-y-3 border-t p-3">
        <ul className="space-y-2">
          {options.map((opt) => (
            <li
              key={opt.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <span className="min-w-0">{opt.label}</span>
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
            <li className="text-sm text-muted-foreground">
              Nhóm này chưa có lựa chọn nào.
            </li>
          )}
        </ul>
        <form action={formAction} className="flex gap-2">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="skill_group" value={group.value} />
          <Input
            name="label"
            placeholder={`Thêm vào ${group.label}...`}
            className="h-8 flex-1"
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Thêm
          </Button>
        </form>
        <FormMessage result={state} />
      </div>
    </details>
  );
}

function OptionColumn({
  category,
  options,
}: {
  category: "strength" | "improvement";
  options: OptionRow[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{CATEGORY_LABELS[category]}</p>
      <div className="space-y-2">
        {SKILL_GROUPS.map((group) => (
          <GroupAccordion
            key={group.value}
            category={category}
            group={group}
            options={options.filter((o) => o.skill_group === group.value)}
          />
        ))}
      </div>
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
            gợi ý sẵn cho đủ 12 nhóm
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
