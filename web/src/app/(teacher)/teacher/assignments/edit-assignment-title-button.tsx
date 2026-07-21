"use client";

import { useActionState, useEffect, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAssignmentTitle } from "@/lib/actions/grading";
import type { ActionResult } from "@/lib/types";

export function EditAssignmentTitleButton({
  assignmentId,
  title,
}: {
  assignmentId: string;
  title: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateAssignmentTitle,
    {}
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Sửa tên đề ${title}`}
          title="Sửa tên đề"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
        >
          ✏️
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa tên đề bài</DialogTitle>
          <DialogDescription>
            Chỉ đổi tiêu đề — không đụng file đề, số buổi, hay khóa học.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="id" value={assignmentId} />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-assignment-title-${assignmentId}`}>
                Tiêu đề đề bài *
              </Label>
              <Input
                id={`edit-assignment-title-${assignmentId}`}
                name="title"
                defaultValue={title}
                required
              />
            </div>
            <FormMessage result={state} />
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu..." : "Lưu tên"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
