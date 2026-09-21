"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  addZaloTemplate,
  deleteZaloTemplate,
  seedDefaultTemplate,
  updateZaloTemplate,
} from "@/lib/actions/settings";
import type { ActionResult } from "@/lib/types";

export interface TemplateRow {
  id: string;
  name: string;
  template_text: string;
}

const PLACEHOLDERS = ["{ten_lop}", "{buoi}", "{tom_tat}", "{loi_nhan}"] as const;

/** Bọc phần đang bôi đen bằng cặp ký hiệu (`**` đậm / `_` nghiêng). */
function wrapSelection(
  el: HTMLTextAreaElement,
  marker: string,
  onChange: (next: string) => void
) {
  const { value, selectionStart: start, selectionEnd: end } = el;
  const selected = value.slice(start, end) || "chữ";
  onChange(value.slice(0, start) + marker + selected + marker + value.slice(end));
  // Bôi đen lại đúng phần chữ vừa bọc để gõ đè được ngay.
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
  });
}

/** Thêm/bỏ "- " ở đầu MỌI dòng đang chạm tới — dùng cho cả dòng chữ tĩnh lẫn
 *  dòng chứa placeholder động (VD `- {tom_tat}`). */
function toggleBullet(el: HTMLTextAreaElement, onChange: (next: string) => void) {
  const { value, selectionStart: start, selectionEnd: end } = el;
  const blockStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextNewline = value.indexOf("\n", end);
  const blockEnd = nextNewline === -1 ? value.length : nextNewline;

  const lines = value.slice(blockStart, blockEnd).split("\n");
  const allBulleted = lines.every((l) => l.trim() === "" || /^-\s/.test(l));
  const nextBlock = lines
    .map((l) => {
      if (l.trim() === "") return l;
      return allBulleted ? l.replace(/^-\s+/, "") : `- ${l}`;
    })
    .join("\n");

  onChange(value.slice(0, blockStart) + nextBlock + value.slice(blockEnd));
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(blockStart, blockStart + nextBlock.length);
  });
}

/** Chèn placeholder tại vị trí con trỏ. */
function insertAtCursor(
  el: HTMLTextAreaElement,
  text: string,
  onChange: (next: string) => void
) {
  const { value, selectionStart: start, selectionEnd: end } = el;
  onChange(value.slice(0, start) + text + value.slice(end));
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + text.length, start + text.length);
  });
}

/** Ô tên + ô nội dung kèm thanh định dạng — dùng chung cho form tạo và form sửa. */
function TemplateFields({
  idPrefix,
  name,
  onNameChange,
  text,
  onTextChange,
}: {
  idPrefix: string;
  name: string;
  onNameChange: (next: string) => void;
  text: string;
  onTextChange: (next: string) => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);

  function withTextarea(fn: (el: HTMLTextAreaElement) => void) {
    const el = textRef.current;
    if (el) fn(el);
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Tên mẫu</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="VD: Thông báo cuối buổi"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-text`}>Nội dung mẫu</Label>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 font-bold"
            onClick={() => withTextarea((el) => wrapSelection(el, "**", onTextChange))}
          >
            B
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 italic"
            onClick={() => withTextarea((el) => wrapSelection(el, "_", onTextChange))}
          >
            I
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={() => withTextarea((el) => toggleBullet(el, onTextChange))}
          >
            • Gạch đầu dòng
          </Button>
          <span className="mx-1 text-xs text-muted-foreground">Chèn:</span>
          {PLACEHOLDERS.map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 font-mono text-xs"
              onClick={() => withTextarea((el) => insertAtCursor(el, p, onTextChange))}
            >
              {p}
            </Button>
          ))}
        </div>
        <Textarea
          id={`${idPrefix}-text`}
          name="template_text"
          ref={textRef}
          rows={12}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="font-mono text-xs"
          placeholder={"Dùng các placeholder: {ten_lop} {buoi} {tom_tat} {loi_nhan}"}
        />
        <p className="text-xs text-muted-foreground">
          AI chỉ sinh nội dung cho {"{tom_tat}"} và {"{loi_nhan}"}; {"{ten_lop}"} và{" "}
          {"{buoi}"} điền tự động — phần chữ còn lại của mẫu được giữ NGUYÊN VĂN khi
          tạo tin. Bôi đen rồi bấm <b>B</b>/<i>I</i> để in đậm/nghiêng, bấm “• Gạch
          đầu dòng” để thêm {'"- "'} cho dòng đang đứng (dùng được cho cả dòng chữ
          thường lẫn dòng {"{tom_tat}"}/{"{loi_nhan}"}). Zalo không hỗ trợ màu chữ
          nên dùng in đậm thay cho màu.
        </p>
      </div>
    </>
  );
}

/** Một mẫu trong danh sách — tự giữ state sửa/hủy riêng (mỗi item một
 *  `useActionState` độc lập, cùng khuôn với `combo-manager.tsx`). */
function TemplateItem({ template }: { template: TemplateRow }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateZaloTemplate,
    {}
  );
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(template.name);
  const [text, setText] = useState(template.template_text);

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state]);

  function cancel() {
    setName(template.name);
    setText(template.template_text);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="rounded-lg border p-3">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={template.id} />
          <TemplateFields
            idPrefix={`tpl-${template.id}`}
            name={name}
            onNameChange={setName}
            text={text}
            onTextChange={setText}
          />
          <FormMessage result={state} />
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={pending || !name.trim() || !text.trim()}
            >
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

  const lineCount = template.template_text.trim().split("\n").length;

  return (
    <li className="rounded-lg border p-3 transition-colors hover:border-border">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <span className="truncate text-sm font-medium">{template.name}</span>
          <Badge
            variant="outline"
            className="shrink-0 rounded-md text-[11px] font-normal text-muted-foreground"
          >
            📝 {lineCount} dòng
          </Badge>
          <span
            className={cn(
              "ml-auto shrink-0 text-xs text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
          >
            ▼
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Sửa mẫu ${template.name}`}
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            ✏️
          </button>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                aria-label={`Xóa mẫu ${template.name}`}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              >
                ✕
              </button>
            }
            title="Xóa mẫu tin này?"
            description={`Mẫu "${template.name}" sẽ bị xóa vĩnh viễn. Các tin nhắn đã tạo và copy trước đó không bị ảnh hưởng.`}
            confirmLabel="Xóa mẫu"
            action={deleteZaloTemplate}
            fields={{ id: template.id }}
          />
        </div>
      </div>

      {expanded ? (
        <div className="mt-2 space-y-1.5">
          <pre className="max-h-56 overflow-y-auto rounded-md border bg-muted/50 p-2.5 text-xs whitespace-pre-wrap text-muted-foreground font-mono leading-relaxed">
            {template.template_text}
          </pre>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ▲ Thu gọn
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded(true);
            }
          }}
          className="mt-2 cursor-pointer rounded-md bg-muted/30 hover:bg-muted/60 p-2 transition-colors"
          title="Bấm để xem đầy đủ nội dung"
        >
          <p className="line-clamp-2 text-xs font-mono text-muted-foreground/90 whitespace-pre-line leading-relaxed">
            {template.template_text}
          </p>
        </div>
      )}
    </li>
  );
}

function CreateTemplateForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    addZaloTemplate,
    {}
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    if (state.success) {
      setName("");
      setText("");
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto"
      >
        ➕ Thêm mẫu tin mới
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-dashed p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Tạo mẫu mới</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => setOpen(false)}
        >
          ✕ Đóng
        </Button>
      </div>
      <TemplateFields
        idPrefix="new-tpl"
        name={name}
        onNameChange={setName}
        text={text}
        onTextChange={setText}
      />
      <FormMessage result={state} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || !name.trim() || !text.trim()}>
          {pending ? "Đang lưu..." : "Lưu mẫu"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}

export function TemplateManager({ templates }: { templates: TemplateRow[] }) {
  return (
    <div className="space-y-4">
      {templates.length === 0 && (
        <form action={seedDefaultTemplate}>
          <Button type="submit" size="sm" variant="secondary">
            ⚡ Thêm mẫu thông báo phụ huynh mặc định
          </Button>
        </form>
      )}

      <ul className="space-y-2">
        {templates.map((t) => (
          <TemplateItem key={t.id} template={t} />
        ))}
      </ul>

      <CreateTemplateForm />
    </div>
  );
}
