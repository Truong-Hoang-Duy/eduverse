"use client";

import { useActionState, useRef } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addComment, deleteComment } from "@/lib/actions/projects";
import type { ActionResult } from "@/lib/types";

export interface CommentItem {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: string;
}

export function CommentSection({
  projectId,
  comments,
  currentUserId,
  canModerate = false,
  placeholder = "Viết nhận xét cho bạn...",
}: {
  projectId: string;
  comments: CommentItem[];
  currentUserId: string;
  /** GV của lớp xóa được nhận xét bất kỳ (RLS đã cho phép); HV chỉ xóa của mình. */
  canModerate?: boolean;
  placeholder?: string;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    addComment,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-3">
      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((c) => {
            const mine = c.authorId === currentUserId;
            return (
              <li
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium">{c.authorName}</span>
                  {mine && (
                    <span className="ml-1 text-xs text-muted-foreground">(bạn)</span>
                  )}{" "}
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                  <p className="break-words text-muted-foreground">{c.content}</p>
                </div>
                {(mine || canModerate) && (
                  <ConfirmDialog
                    trigger={
                      <button
                        type="button"
                        aria-label="Xóa nhận xét"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      >
                        ✕
                      </button>
                    }
                    title={mine ? "Xóa nhận xét của bạn?" : "Xóa nhận xét này?"}
                    description={
                      mine
                        ? "Nhận xét này sẽ bị xóa vĩnh viễn khỏi sản phẩm."
                        : `Nhận xét của ${c.authorName} sẽ bị xóa vĩnh viễn khỏi sản phẩm.`
                    }
                    action={deleteComment}
                    fields={{ id: c.id }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form
        ref={formRef}
        action={async (fd) => {
          await formAction(fd);
          formRef.current?.reset();
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="project_id" value={projectId} />
        <Input name="content" placeholder={placeholder} className="h-9" />
        <Button type="submit" size="sm">
          Gửi
        </Button>
      </form>
      <FormMessage result={state} />
    </div>
  );
}
