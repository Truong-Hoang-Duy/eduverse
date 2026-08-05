"use client";

import { useActionState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addReviewOption,
  deleteReviewOption,
  seedDefaultTestProcessOptions,
} from "@/lib/actions/settings";
import type { ActionResult } from "@/lib/types";

export interface TestProcessOptionRow {
  id: string;
  label: string;
}

/** Danh mục phẳng (không chia nhóm kỹ năng) cho ô "quá trình làm bài" — hiện
 *  ở buổi có đánh dấu kiểm tra định kỳ. Đơn giản hơn `OptionManager` vì không
 *  có skill_group để chia cột/accordion. */
export function TestProcessManager({
  options,
}: {
  options: TestProcessOptionRow[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    addReviewOption,
    {}
  );

  return (
    <div className="space-y-3">
      {options.length === 0 && (
        <form action={seedDefaultTestProcessOptions}>
          <Button type="submit" size="sm" variant="secondary">
            ⚡ Thêm nhanh bộ lựa chọn mặc định
          </Button>
        </form>
      )}
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
            Chưa có lựa chọn nào.
          </li>
        )}
      </ul>
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="category" value="test_process" />
        <Input
          name="label"
          placeholder="Thêm lựa chọn mới..."
          className="h-8 flex-1"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Thêm
        </Button>
      </form>
      <FormMessage result={state} />
    </div>
  );
}
