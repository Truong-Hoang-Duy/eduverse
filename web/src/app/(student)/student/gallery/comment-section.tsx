"use client";

import { useActionState, useRef } from "react";

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
}: {
  projectId: string;
  comments: CommentItem[];
  currentUserId: string;
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
          {comments.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{c.authorName}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                </span>
                <p className="text-muted-foreground">{c.content}</p>
              </div>
              {c.authorId === currentUserId && (
                <form action={deleteComment}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    aria-label="Xóa nhận xét"
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    ✕
                  </button>
                </form>
              )}
            </li>
          ))}
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
        <Input name="content" placeholder="Viết nhận xét cho bạn..." className="h-9" />
        <Button type="submit" size="sm">
          Gửi
        </Button>
      </form>
      <FormMessage result={state} />
    </div>
  );
}
