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
  deleteAllReviewCombos,
  deleteReviewCombo,
  type ReviewCombo,
  seedDefaultCombos,
  updateReviewCombo,
} from "@/lib/actions/review-combos";
import type { ActionResult } from "@/lib/types";

import type { OptionRow } from "./option-manager";

/** Ba ô nhãn của một bộ — dùng chung cho form tạo mới và form sửa. */
interface ComboLabels {
  strengths: string[];
  improvements: string[];
  projectNotes: string[];
}

interface CatalogOptions {
  strength: { id: string; label: string }[];
  improvement: { id: string; label: string }[];
  project: { id: string; label: string }[];
}

const EMPTY: ComboLabels = { strengths: [], improvements: [], projectNotes: [] };

function totalLabels(labels: ComboLabels): number {
  return (
    labels.strengths.length +
    labels.improvements.length +
    labels.projectNotes.length
  );
}

/** Ba MultiSelect + input ẩn cho FormData. Một bộ chứa CẢ BA ô (user chốt
 *  2026-08-28) — ô nào để trống thì áp bộ không đụng tới ô đó ở trang buổi học. */
function ComboFields({
  labels,
  onChange,
  catalog,
}: {
  labels: ComboLabels;
  onChange: (next: ComboLabels) => void;
  catalog: CatalogOptions;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">💪 Điểm mạnh</p>
        {labels.strengths.map((s) => (
          <input key={s} type="hidden" name="strengths" value={s} />
        ))}
        <MultiSelect
          options={catalog.strength}
          selected={labels.strengths}
          onChange={(next) => onChange({ ...labels, strengths: next })}
          placeholder="Chọn điểm mạnh..."
          emptyText="Chưa có lựa chọn trong danh mục."
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">🎯 Cần cải thiện</p>
        {labels.improvements.map((s) => (
          <input key={s} type="hidden" name="improvements" value={s} />
        ))}
        <MultiSelect
          options={catalog.improvement}
          selected={labels.improvements}
          onChange={(next) => onChange({ ...labels, improvements: next })}
          placeholder="Chọn điểm cần cải thiện..."
          emptyText="Chưa có lựa chọn trong danh mục."
        />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">🎓 SPCK</p>
        {labels.projectNotes.map((s) => (
          <input key={s} type="hidden" name="project_notes" value={s} />
        ))}
        <MultiSelect
          options={catalog.project}
          selected={labels.projectNotes}
          onChange={(next) => onChange({ ...labels, projectNotes: next })}
          placeholder="Chọn quan sát SPCK..."
          emptyText="Chưa có lựa chọn trong danh mục."
        />
      </div>
    </div>
  );
}

/** Badge xem nhanh nội dung một bộ, phân biệt 3 ô bằng màu viền. */
function LabelBadges({ combo }: { combo: ReviewCombo }) {
  return (
    <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto border-t p-3">
      {combo.strengths.map((s) => (
        <Badge key={`s:${s}`} variant="secondary" className="rounded-md font-normal">
          💪 {s}
        </Badge>
      ))}
      {combo.improvements.map((s) => (
        <Badge key={`i:${s}`} variant="outline" className="rounded-md font-normal">
          🎯 {s}
        </Badge>
      ))}
      {combo.projectNotes.map((s) => (
        <Badge key={`p:${s}`} variant="outline" className="rounded-md font-normal">
          🎓 {s}
        </Badge>
      ))}
    </div>
  );
}

/** Một bộ combo trong danh sách — tự quản state sửa/hủy riêng (mỗi item một
 *  `useActionState` độc lập nên không vi phạm rules-of-hooks khi danh sách
 *  đổi động). */
function ComboItem({
  combo,
  catalog,
}: {
  combo: ReviewCombo;
  catalog: CatalogOptions;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateReviewCombo,
    {}
  );
  const [editing, setEditing] = useState(false);
  // Đóng mặc định — bộ nhiều nhãn (giờ tới ~8 nhãn/ô) mở sẵn ra sẽ dài dòng,
  // chiếm hết màn hình (user phản ánh 2026-08-06). Bấm tên mới xổ ra.
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(combo.name);
  const initial: ComboLabels = {
    strengths: combo.strengths,
    improvements: combo.improvements,
    projectNotes: combo.projectNotes,
  };
  const [labels, setLabels] = useState<ComboLabels>(initial);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state]);

  function cancel() {
    setName(combo.name);
    setLabels(initial);
    setEditing(false);
  }

  const canSave = name.trim().length > 0 && totalLabels(labels) > 0;

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
            <span className="flex shrink-0 items-center gap-1">
              {combo.strengths.length > 0 && (
                <Badge variant="secondary" className="rounded-md text-xs font-normal">
                  💪 {combo.strengths.length}
                </Badge>
              )}
              {combo.improvements.length > 0 && (
                <Badge variant="outline" className="rounded-md text-xs font-normal">
                  🎯 {combo.improvements.length}
                </Badge>
              )}
              {combo.projectNotes.length > 0 && (
                <Badge variant="outline" className="rounded-md text-xs font-normal">
                  🎓 {combo.projectNotes.length}
                </Badge>
              )}
            </span>
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
        {expanded && <LabelBadges combo={combo} />}
      </li>
    );
  }

  return (
    <li className="rounded-lg border p-3">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={combo.id} />
        <input type="hidden" name="name" value={name} />

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên bộ"
          maxLength={60}
        />
        <ComboFields labels={labels} onChange={setLabels} catalog={catalog} />
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

/** Form tạo bộ mới — một bộ điền được cả 3 ô, không phải chọn loại nữa. */
function CreateComboForm({ catalog }: { catalog: CatalogOptions }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createReviewCombo,
    {}
  );
  const [name, setName] = useState("");
  const [labels, setLabels] = useState<ComboLabels>(EMPTY);

  useEffect(() => {
    if (state.success) {
      setName("");
      setLabels(EMPTY);
    }
  }, [state]);

  const canSave = name.trim().length > 0 && totalLabels(labels) > 0;

  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">➕ Tạo bộ mới</p>
      <input type="hidden" name="name" value={name} />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tên bộ (VD: 👍 Khá — hiểu nhanh nhưng ẩu)"
        maxLength={60}
      />
      <ComboFields labels={labels} onChange={setLabels} catalog={catalog} />
      <FormMessage result={state} />
      <Button type="submit" size="sm" disabled={pending || !canSave}>
        {pending ? "Đang lưu..." : "Lưu bộ"}
      </Button>
    </form>
  );
}

/** Thêm nhanh 40 bộ chân dung dựng từ chính danh mục của GV — mỗi bộ điền cả
 *  điểm mạnh + cần cải thiện (+ SPCK ở nhóm cuối) trong 1 lần bấm. */
function SeedCombosButton() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    seedDefaultCombos,
    {}
  );

  return (
    <form action={formAction} className="space-y-1.5">
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Đang thêm..." : "⚡ Thêm nhanh bộ mẫu"}
      </Button>
      <Badge variant="outline" className="ml-2 text-xs">
        40 bộ chân dung, trải đều danh mục, không trùng bộ đã có
      </Badge>
      <FormMessage result={state} />
    </form>
  );
}

/** Dọn sạch để dựng lại từ đầu — lối thoát khi danh sách còn đầy bộ cũ không
 *  dùng (user 2026-08-28). Không tự chạy: GV phải chủ động bấm + xác nhận. */
function DeleteAllCombosButton() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    deleteAllReviewCombos,
    {}
  );

  return (
    <div className="space-y-1.5">
      <ConfirmDialog
        trigger={
          <Button type="button" size="sm" variant="destructive" disabled={pending}>
            🗑️ Xóa tất cả bộ
          </Button>
        }
        title="Xóa TẤT CẢ bộ combo?"
        description="Toàn bộ bộ combo của bạn (kể cả bộ tự tạo) sẽ bị xóa vĩnh viễn để dựng lại từ đầu bằng nút “Thêm nhanh bộ mẫu”. Danh mục nhận xét và nhận xét đã lưu của học viên KHÔNG bị ảnh hưởng."
        confirmLabel="Xóa tất cả"
        action={formAction}
        fields={{}}
      />
      <FormMessage result={state} />
    </div>
  );
}

/**
 * Quản lý "bộ combo" nhận xét ở trang Cài đặt — MỘT DANH SÁCH PHẲNG, mỗi bộ là
 * một chân dung học viên chứa cả 3 ô (user chốt 2026-08-28, đảo ngược việc chia
 * 2 cột theo loại của 2026-08-06). Ở mỗi học viên GV chỉ CHỌN ÁP một bộ (không
 * tạo/sửa tại chỗ) — xem sessions/[id]/combo-bar.
 */
export function ComboManager({
  combos,
  options,
}: {
  combos: ReviewCombo[];
  options: OptionRow[];
}) {
  const pick = (category: string) =>
    options
      .filter((o) => o.category === category)
      .map((o) => ({ id: o.id, label: o.label }));

  const catalog: CatalogOptions = {
    strength: pick("strength"),
    improvement: pick("improvement"),
    project: pick("project_progress"),
  };

  const hasCatalog =
    catalog.strength.length > 0 ||
    catalog.improvement.length > 0 ||
    catalog.project.length > 0;

  return (
    <div className="space-y-4">
      {hasCatalog && (
        <div className="flex flex-wrap items-start gap-3">
          <SeedCombosButton />
          {combos.length > 0 && <DeleteAllCombosButton />}
        </div>
      )}

      {combos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Chưa có bộ combo nào.
        </p>
      ) : (
        <ul className="space-y-2">
          {combos.map((c) => (
            <ComboItem key={c.id} combo={c} catalog={catalog} />
          ))}
        </ul>
      )}

      {hasCatalog ? (
        <CreateComboForm catalog={catalog} />
      ) : (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Cần có danh mục nhận xét trước — thêm ở khối &quot;Danh mục nhận
          xét&quot; phía trên.
        </p>
      )}
    </div>
  );
}
