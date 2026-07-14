"use client";

import { deleteAssignment } from "@/lib/actions/grading";

export function DeleteAssignmentButton({
  assignmentId,
  title,
}: {
  assignmentId: string;
  title: string;
}) {
  return (
    <form
      action={deleteAssignment}
      onSubmit={(e) => {
        if (
          !confirm(
            `Xóa đề "${title}"? Mọi bài nộp và điểm của đề này cũng bị xóa.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={assignmentId} />
      <button
        type="submit"
        aria-label={`Xóa đề ${title}`}
        className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
      >
        ✕
      </button>
    </form>
  );
}
