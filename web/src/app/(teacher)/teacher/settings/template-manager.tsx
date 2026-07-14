"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addZaloTemplate,
  deleteZaloTemplate,
  seedDefaultTemplate,
} from "@/lib/actions/settings";
import type { ActionResult } from "@/lib/types";

export interface TemplateRow {
  id: string;
  name: string;
  template_text: string;
}

export function TemplateManager({ templates }: { templates: TemplateRow[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    addZaloTemplate,
    {}
  );

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
          <li key={t.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t.name}</p>
              <form action={deleteZaloTemplate}>
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  aria-label={`Xóa mẫu ${t.name}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  ✕
                </button>
              </form>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap text-muted-foreground">
              {t.template_text}
            </pre>
          </li>
        ))}
      </ul>

      <form action={formAction} className="space-y-3 rounded-lg border border-dashed p-3">
        <p className="text-sm font-medium">Tạo mẫu mới</p>
        <div className="space-y-1.5">
          <Label htmlFor="template-name">Tên mẫu</Label>
          <Input id="template-name" name="name" placeholder="VD: Thông báo cuối buổi" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-text">Nội dung mẫu</Label>
          <Textarea
            id="template-text"
            name="template_text"
            rows={6}
            placeholder={"Dùng các placeholder: {ten_lop} {buoi} {tom_tat} {loi_nhan}"}
          />
          <p className="text-xs text-muted-foreground">
            AI sẽ thay {"{ten_lop}"}, {"{buoi}"}, {"{tom_tat}"}, {"{loi_nhan}"} bằng
            nội dung thật và giữ nguyên phần còn lại.
          </p>
        </div>
        <FormMessage result={state} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu mẫu"}
        </Button>
      </form>
    </div>
  );
}
