"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSession } from "@/lib/actions/sessions";
import type { ActionResult } from "@/lib/types";

import { SessionContentSuggestDialog } from "./session-content-suggest-dialog";

/** Buổi mới chưa có ngày học thường là buổi ĐÃ dạy hôm qua (GV hay điền nhận
 *  xét sau buổi một ngày) — điền sẵn hôm nay trừ 1 để đỡ phải gõ tay mỗi lần,
 *  vẫn sửa được bình thường (yêu cầu user 2026-08-05). */
function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export interface SessionData {
  id: string;
  session_number: number;
  title: string | null;
  content: string | null;
  review_context: string | null;
  is_periodic_test: boolean;
  session_date: string | null;
}

export function SessionForm({ session }: { session: SessionData }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateSession,
    {}
  );
  const [content, setContent] = useState(session.content ?? "");
  const [reviewContext, setReviewContext] = useState(
    session.review_context ?? ""
  );
  const [isPeriodicTest, setIsPeriodicTest] = useState(
    session.is_periodic_test
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
            defaultValue={session.session_date ?? yesterdayIso()}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="content">Nội dung buổi học</Label>
          <SessionContentSuggestDialog sessionId={session.id} onApply={setContent} />
        </div>
        <Textarea
          id="content"
          name="content"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="VD: Học về biến let/const, kiểu số và chuỗi. Bài tập: chương trình đổi đơn vị tiền tệ..."
        />
        <p className="text-xs text-muted-foreground">
          Nội dung này là ngữ cảnh để AI viết nhận xét học viên và tin Zalo — càng
          cụ thể nhận xét càng hay.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review_context">Bối cảnh buổi học (tùy chọn)</Label>
        <Textarea
          id="review_context"
          name="review_context"
          rows={2}
          value={reviewContext}
          onChange={(e) => setReviewContext(e.target.value)}
          placeholder="VD: Buổi này có bài kiểm tra 15 phút đầu giờ, các em còn lại ôn tập vòng lặp..."
        />
        <p className="text-xs text-muted-foreground">
          Mô tả bối cảnh lớp học/việc học viên sẽ làm buổi này — CHỈ để AI tham
          khảo khi viết nhận xét từng em bên dưới, không hiện cho phụ huynh.
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="is_periodic_test"
            value="true"
            checked={isPeriodicTest}
            onChange={(e) => setIsPeriodicTest(e.target.checked)}
            className="size-4"
          />
          📝 Buổi này có kiểm tra định kỳ
        </label>
        <p className="text-xs text-muted-foreground">
          Bật lên thì khi bấm &quot;AI tạo nhận xét&quot; cho từng em, nhận xét
          sẽ tách rõ 2 phần — quá trình học tập / kết quả kiểm tra — thay vì
          viết chung một đoạn.
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
