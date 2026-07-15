"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteAssignment } from "@/lib/actions/grading";

export function DeleteAssignmentButton({
  assignmentId,
  title,
}: {
  assignmentId: string;
  title: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          aria-label={`Xóa đề ${title}`}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          ✕
        </button>
      }
      title="Xóa đề bài?"
      description={`Đề "${title}" sẽ bị xóa vĩnh viễn cùng file đề đã upload. Không thể hoàn tác.`}
      confirmLabel="Xóa đề"
      action={deleteAssignment}
      fields={{ id: assignmentId }}
    />
  );
}
