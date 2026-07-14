"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSession } from "@/lib/actions/sessions";
import type { ActionResult } from "@/lib/types";

export interface SessionData {
  id: string;
  session_number: number;
  title: string | null;
  content: string | null;
  session_date: string | null;
}

export function SessionForm({ session }: { session: SessionData }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateSession,
    {}
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={session.id} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="title">Tiêu đề buổi học</Label>
          <Input
            id="title"
            name="title"
            defaultValue={session.title ?? ""}
            placeholder={`Buổi ${session.session_number}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session_date">Ngày học</Label>
          <Input
            id="session_date"
            name="session_date"
            type="date"
            defaultValue={session.session_date ?? ""}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="content">Nội dung buổi học</Label>
        <Textarea
          id="content"
          name="content"
          rows={5}
          defaultValue={session.content ?? ""}
          placeholder="VD: Học về biến let/const, kiểu số và chuỗi. Bài tập: chương trình đổi đơn vị tiền tệ..."
        />
        <p className="text-xs text-muted-foreground">
          Nội dung này là ngữ cảnh để AI viết nhận xét học viên và tin Zalo — càng
          cụ thể nhận xét càng hay.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu nội dung"}
        </Button>
        <FormMessage result={state} />
      </div>
    </form>
  );
}
