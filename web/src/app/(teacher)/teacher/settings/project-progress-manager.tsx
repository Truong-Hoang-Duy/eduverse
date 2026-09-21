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
  seedDefaultProjectProgressOptions,
} from "@/lib/actions/settings";
import {
  getSpckLevel,
  getSpckSkillGroup,
  SPCK_LEVEL_CONFIGS,
  SPCK_SKILL_GROUPS,
} from "@/lib/spck-evaluation";
import type { ActionResult } from "@/lib/types";

export interface ProjectProgressOptionRow {
  id: string;
  label: string;
  skill_group?: string;
}

/** 1 nhóm kỹ năng SPCK trong Accordion — nhất quán với OptionManager */
function SpckGroupAccordion({
  groupValue,
  groupLabel,
  groupIcon,
  options,
}: {
  groupValue: string;
  groupLabel: string;
  groupIcon: string;
  options: ProjectProgressOptionRow[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    addReviewOption,
    {}
  );

  return (
    <details className="group rounded-lg border bg-card" open={options.length > 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden hover:bg-muted/30 transition-colors">
        <span className="text-sm font-medium flex items-center gap-2">
          <span>{groupIcon}</span>
          <span>{groupLabel}</span>
        </span>
        <span className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-md text-xs font-normal">
            {options.length}
          </Badge>
          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
            ▼
          </span>
        </span>
      </summary>

      <div className="space-y-3 border-t p-3 bg-muted/5">
        <ul className="space-y-2">
          {options.map((opt) => {
            const level = getSpckLevel(opt.label);
            const levelConfig = SPCK_LEVEL_CONFIGS.find((c) => c.level === level);

            return (
              <li
                key={opt.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="min-w-0">{opt.label}</span>
                  {levelConfig && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 font-normal shrink-0 ${levelConfig.badgeClass}`}
                    >
                      {levelConfig.icon} {levelConfig.label}
                    </Badge>
                  )}
                </div>
                <ConfirmDialog
                  trigger={
                    <button
                      type="button"
                      aria-label={`Xóa ${opt.label}`}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive cursor-pointer"
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
            );
          })}
          {options.length === 0 && (
            <li className="text-sm text-muted-foreground italic py-1">
              Chưa có lựa chọn nào trong nhóm này.
            </li>
          )}
        </ul>

        <form action={formAction} className="flex gap-2 pt-1">
          <input type="hidden" name="category" value="project_progress" />
          <input type="hidden" name="skill_group" value={groupValue} />
          <Input
            name="label"
            placeholder={`Thêm nhận xét vào nhóm ${groupLabel}...`}
            className="h-8 flex-1 text-xs bg-background"
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending} className="h-8 text-xs cursor-pointer">
            Thêm
          </Button>
        </form>
        <FormMessage result={state} />
      </div>
    </details>
  );
}

/** Quản lý danh mục nhận xét sản phẩm cuối khóa (SPCK) chia theo kỹ năng. */
export function ProjectProgressManager({
  options,
}: {
  options: ProjectProgressOptionRow[];
}) {
  // Gom options theo 6 nhóm kỹ năng chính của SPCK
  const grouped = new Map<string, ProjectProgressOptionRow[]>();
  for (const group of SPCK_SKILL_GROUPS) {
    grouped.set(group.value, []);
  }
  const otherItems: ProjectProgressOptionRow[] = [];

  for (const opt of options) {
    const skill = getSpckSkillGroup(opt.label, opt.skill_group);
    if (grouped.has(skill)) {
      grouped.get(skill)!.push(opt);
    } else {
      otherItems.push(opt);
    }
  }

  const totalCount = options.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Đang có <strong className="text-foreground">{totalCount}</strong> nhận xét quan sát SPCK chia theo {SPCK_SKILL_GROUPS.length} nhóm kỹ năng.
        </span>
        <form action={seedDefaultProjectProgressOptions}>
          <Button type="submit" size="sm" variant={totalCount === 0 ? "default" : "outline"} className="cursor-pointer text-xs h-8">
            ⚡ {totalCount === 0 ? "Nạp ngân hàng 44 nhận xét SPCK chuẩn" : "Đồng bộ ngân hàng 44 nhận xét chuẩn"}
          </Button>
        </form>
      </div>

      <div className="space-y-3">
        {SPCK_SKILL_GROUPS.map((group) => (
          <SpckGroupAccordion
            key={group.value}
            groupValue={group.value}
            groupLabel={group.label}
            groupIcon={group.icon}
            options={grouped.get(group.value) ?? []}
          />
        ))}

        {otherItems.length > 0 && (
          <SpckGroupAccordion
            groupValue="other"
            groupLabel="Khác"
            groupIcon="📌"
            options={otherItems}
          />
        )}
      </div>
    </div>
  );
}
