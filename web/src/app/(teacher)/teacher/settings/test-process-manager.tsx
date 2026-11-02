"use client";

import { useActionState, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addReviewOption,
  deleteReviewOption,
  seedDefaultTestProcessOptions,
  updateReviewOption,
} from "@/lib/actions/settings";
import type { ActionResult } from "@/lib/types";

export interface TestProcessOptionRow {
  id: string;
  label: string;
}

function TestProcessOptionItem({ opt }: { opt: TestProcessOptionRow }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateReviewOption,
    {}
  );
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(opt.label);

  useEffect(() => {
    setLabel(opt.label);
  }, [opt.label]);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state]);

  function cancel() {
    setLabel(opt.label);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="space-y-1.5 rounded-md border bg-muted/20 p-2 text-sm">
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={opt.id} />
          <Input
            name="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
            className="h-8 flex-1 text-sm bg-background"
            autoFocus
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 cursor-pointer"
            disabled={pending || !label.trim()}
          >
            {pending ? "Đang lưu..." : "Lưu"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 cursor-pointer"
            onClick={cancel}
          >
            Hủy
          </Button>
        </form>
        <FormMessage result={state} />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 break-words">{opt.label}</span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Sửa ${opt.label}`}
          title="Chỉnh sửa"
          onClick={() => setEditing(true)}
          className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          ✏️
        </button>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              aria-label={`Xóa ${opt.label}`}
              title="Xóa"
              className="cursor-pointer shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            >
              ✕
            </button>
          }
          title="Xóa lựa chọn này?"
          description={`"${opt.label}" sẽ không còn hiện khi nhận xét học viên. Các nhận xét đã lưu trước đó không bị ảnh hưởng.`}
          action={deleteReviewOption}
          fields={{ id: opt.id }}
        />
      </div>
    </li>
  );
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
          <TestProcessOptionItem key={opt.id} opt={opt} />
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
