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
  type ReviewComboType,
  updateReviewCombo,
} from "@/lib/actions/review-combos";
import type { ActionResult } from "@/lib/types";

import type { OptionRow } from "./option-manager";

const TYPE_LABELS: Record<ReviewComboType, string> = {
  strength: "💪 Tích cực",
  improvement: "🎯 Cải thiện",
};

/** Một bộ combo trong danh sách — tự quản state sửa/hủy riêng (mỗi item một
 *  `useActionState` độc lập nên không vi phạm rules-of-hooks khi danh sách
 *  đổi động). Loại (`combo.type`) CỐ ĐỊNH từ lúc tạo, không đổi được lúc sửa —
 *  chỉ sửa tên + lại chọn nhãn trong CHÍNH loại đó (yêu cầu user 2026-08-06). */
function ComboItem({
  combo,
  catalogOptions,
}: {
  combo: ReviewCombo;
  catalogOptions: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateReviewCombo,
    {}
  );
  const [editing, setEditing] = useState(false);
  // Đóng mặc định — bộ nhiều nhãn (VD chọn cả chục điểm mạnh) mở sẵn ra sẽ dài
  // dòng, chiếm hết màn hình (user phản ánh 2026-08-06). Bấm tên mới xổ ra.
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(combo.name);
  const initialLabels =
    combo.type === "strength" ? combo.strengths : combo.improvements;
  const [labels, setLabels] = useState<string[]>(initialLabels);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state]);

  function cancel() {
    setName(combo.name);
    setLabels(initialLabels);
    setEditing(false);
  }

  const canSave = name.trim().length > 0 && labels.length > 0;
  const fieldName = combo.type === "strength" ? "strengths" : "improvements";

  if (!editing) {
    return (
      <li className="rounded-lg border">
        <div className="flex items-center justify-between gap-2 p-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          >
            <span className="truncate font-medium">{combo.name}</span>
            <Badge
              variant="secondary"
              className="shrink-0 rounded-md text-xs font-normal"
            >
              {initialLabels.length}
            </Badge>
            <span
              className={`ml-auto shrink-0 text-xs text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              ▼
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Sửa bộ ${combo.name}`}
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              ✏️
            </button>
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  aria-label={`Xóa bộ ${combo.name}`}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                >
                  ✕
                </button>
              }
              title={`Xóa bộ "${combo.name}"?`}
              description="Bộ combo này sẽ bị xóa vĩnh viễn. Nhận xét đã lưu của học viên không bị ảnh hưởng."
              confirmLabel="Xóa bộ"
              action={deleteReviewCombo}
              fields={{ id: combo.id }}
            />
          </div>
        </div>
        {expanded && (
          <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto border-t p-3">
            {initialLabels.map((s) => (
              <Badge
                key={s}
                variant={combo.type === "strength" ? "secondary" : "outline"}
                className="rounded-md font-normal"
              >
                {s}
              </Badge>
            ))}
          </div>
        )}
      </li>
    );
  }

  return (
    <li className="rounded-lg border p-3">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={combo.id} />
        <input type="hidden" name="type" value={combo.type} />
        {labels.map((s) => (
          <input key={s} type="hidden" name={fieldName} value={s} />
        ))}
        <input type="hidden" name="name" value={name} />

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên bộ"
          maxLength={60}
        />
        <MultiSelect
          options={catalogOptions}
          selected={labels}
          onChange={setLabels}
          placeholder={
            combo.type === "strength"
              ? "Chọn điểm mạnh cho bộ..."
              : "Chọn điểm cần cải thiện cho bộ..."
          }
          emptyText="Chưa có lựa chọn trong danh mục."
        />
        <FormMessage result={state} />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending || !canSave}>
            {pending ? "Đang lưu..." : "Lưu"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={cancel}>
            Hủy
          </Button>
        </div>
      </form>
    </li>
  );
}

/** Form tạo bộ mới — CỐ ĐỊNH theo `type` của cột đang đứng (không có ô chọn
 *  loại: đứng ở cột nào tạo bộ loại đó), chỉ hiện MultiSelect khớp loại. */
function CreateComboForm({
  type,
  catalogOptions,
}: {
  type: ReviewComboType;
  catalogOptions: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createReviewCombo,
    {}
  );
  const [name, setName] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const fieldName = type === "strength" ? "strengths" : "improvements";

  useEffect(() => {
    if (state.success) {
      setName("");
      setLabels([]);
    }
  }, [state]);

  const canSave = name.trim().length > 0 && labels.length > 0;

  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">➕ Tạo bộ {TYPE_LABELS[type]}</p>
      <input type="hidden" name="type" value={type} />
      {labels.map((s) => (
        <input key={s} type="hidden" name={fieldName} value={s} />
      ))}
      <input type="hidden" name="name" value={name} />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tên bộ (VD: Học tốt toàn diện)"
        maxLength={60}
      />
      <MultiSelect
        options={catalogOptions}
        selected={labels}
        onChange={setLabels}
        placeholder={
          type === "strength"
            ? "Chọn điểm mạnh cho bộ..."
            : "Chọn điểm cần cải thiện cho bộ..."
        }
        emptyText="Chưa có lựa chọn trong danh mục này."
      />
      <FormMessage result={state} />
      <Button type="submit" size="sm" disabled={pending || !canSave}>
        {pending ? "Đang lưu..." : "Lưu bộ"}
      </Button>
    </form>
  );
}

/** Một cột: danh sách bộ CÙNG loại + form tạo bộ mới cùng loại. */
function ComboColumn({
  type,
  combos,
  catalogOptions,
}: {
  type: ReviewComboType;
  combos: ReviewCombo[];
  catalogOptions: { id: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{TYPE_LABELS[type]}</p>
      {combos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Chưa có bộ {type === "strength" ? "tích cực" : "cải thiện"} nào.
        </p>
      ) : (
        <ul className="space-y-2">
          {combos.map((c) => (
            <ComboItem key={c.id} combo={c} catalogOptions={catalogOptions} />
          ))}
        </ul>
      )}
      {catalogOptions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Cần có danh mục {type === "strength" ? "điểm mạnh" : "cần cải thiện"}{" "}
          trước — thêm ở khối &quot;Danh mục nhận xét&quot; phía trên.
        </p>
      ) : (
        <CreateComboForm type={type} catalogOptions={catalogOptions} />
      )}
    </div>
  );
}

/**
 * Quản lý "bộ combo" nhận xét ở trang Cài đặt — CHIA 2 CỘT theo loại (yêu cầu
 * user 2026-08-06): một bộ chỉ chứa điểm mạnh HOẶC chỉ chứa điểm cần cải
 * thiện, không pha trộn. Ở mỗi học viên GV chỉ CHỌN ÁP một bộ (không tạo/sửa
 * tại chỗ) — xem sessions/[id]/combo-bar.
 */
export function ComboManager({
  combos,
  options,
}: {
  combos: ReviewCombo[];
  options: OptionRow[];
}) {
  const strengthOptions = options
    .filter((o) => o.category === "strength")
    .map((o) => ({ id: o.id, label: o.label }));
  const improvementOptions = options
    .filter((o) => o.category === "improvement")
    .map((o) => ({ id: o.id, label: o.label }));

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <ComboColumn
        type="strength"
        combos={combos.filter((c) => c.type === "strength")}
        catalogOptions={strengthOptions}
      />
      <ComboColumn
        type="improvement"
        combos={combos.filter((c) => c.type === "improvement")}
        catalogOptions={improvementOptions}
      />
    </div>
  );
}
