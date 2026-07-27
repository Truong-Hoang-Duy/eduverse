"use client";

import { useActionState, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { MultiSelect } from "@/components/multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createReviewCombo,
  deleteReviewCombo,
  type ReviewCombo,
} from "@/lib/actions/review-combos";
import type { ActionResult } from "@/lib/types";

import type { OptionRow } from "./option-manager";

/**
 * Quản lý "bộ combo" nhận xét ở trang Cài đặt: tạo bộ mẫu (đặt tên + chọn nhiều
 * điểm mạnh/cần cải thiện từ danh mục), xem danh sách, xóa. Ở mỗi học viên GV
 * chỉ CHỌN ÁP một bộ (không tạo tại chỗ nữa) — xem sessions/[id]/combo-bar.
 */
export function ComboManager({
  combos,
  options,
}: {
  combos: ReviewCombo[];
  options: OptionRow[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createReviewCombo,
    {}
  );

  const [name, setName] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);

  // Tạo bộ xong thì dọn form cho lần tạo tiếp theo.
  useEffect(() => {
    if (state.success) {
      setName("");
      setStrengths([]);
      setImprovements([]);
    }
  }, [state]);

  const strengthOptions = options
    .filter((o) => o.category === "strength")
    .map((o) => ({ id: o.id, label: o.label }));
  const improvementOptions = options
    .filter((o) => o.category === "improvement")
    .map((o) => ({ id: o.id, label: o.label }));

  const canSave =
    name.trim().length > 0 &&
    (strengths.length > 0 || improvements.length > 0);

  return (
    <div className="space-y-5">
      {/* Danh sách bộ đã tạo */}
      {combos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Chưa có bộ nào. Tạo vài bộ mẫu bên dưới (VD &quot;Học tốt, chưa phát
          biểu&quot;) để khi nhận xét chỉ cần chọn áp cho từng em.
        </p>
      ) : (
        <ul className="space-y-2">
          {combos.map((c) => (
            <li key={c.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <p className="font-medium">{c.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {c.strengths.map((s) => (
                      <Badge
                        key={`s-${s}`}
                        variant="secondary"
                        className="rounded-md font-normal"
                      >
                        💪 {s}
                      </Badge>
                    ))}
                    {c.improvements.map((s) => (
                      <Badge
                        key={`i-${s}`}
                        variant="outline"
                        className="rounded-md font-normal"
                      >
                        🎯 {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ConfirmDialog
                  trigger={
                    <button
                      type="button"
                      aria-label={`Xóa bộ ${c.name}`}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    >
                      ✕
                    </button>
                  }
                  title={`Xóa bộ "${c.name}"?`}
                  description="Bộ combo này sẽ bị xóa vĩnh viễn. Nhận xét đã lưu của học viên không bị ảnh hưởng."
                  confirmLabel="Xóa bộ"
                  action={deleteReviewCombo}
                  fields={{ id: c.id }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Tạo bộ mới */}
      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Cần có danh mục nhận xét trước — thêm ở khối &quot;Danh mục nhận
          xét&quot; phía trên rồi mới gom thành bộ.
        </p>
      ) : (
        <form action={formAction} className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">➕ Tạo bộ mới</p>
          {strengths.map((s) => (
            <input key={`s-${s}`} type="hidden" name="strengths" value={s} />
          ))}
          {improvements.map((s) => (
            <input key={`i-${s}`} type="hidden" name="improvements" value={s} />
          ))}
          <input type="hidden" name="name" value={name} />

          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên bộ (VD: Học tốt, chưa phát biểu)"
            maxLength={60}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">💪 Điểm mạnh</p>
              <MultiSelect
                options={strengthOptions}
                selected={strengths}
                onChange={setStrengths}
                placeholder="Chọn điểm mạnh cho bộ..."
                emptyText="Chưa có điểm mạnh trong danh mục."
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">🎯 Cần cải thiện</p>
              <MultiSelect
                options={improvementOptions}
                selected={improvements}
                onChange={setImprovements}
                placeholder="Chọn điểm cần cải thiện cho bộ..."
                emptyText="Chưa có điểm cần cải thiện trong danh mục."
              />
            </div>
          </div>
          <FormMessage result={state} />
          <Button type="submit" size="sm" disabled={pending || !canSave}>
            {pending ? "Đang lưu..." : "Lưu bộ"}
          </Button>
        </form>
      )}
    </div>
  );
}
