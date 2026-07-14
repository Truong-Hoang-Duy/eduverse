"use client";

import { Button } from "@/components/ui/button";
import { deleteClass } from "@/lib/actions/classes";

export function DeleteClassButton({
  classId,
  classCode,
}: {
  classId: string;
  classCode: string;
}) {
  return (
    <form
      action={deleteClass}
      onSubmit={(e) => {
        if (
          !confirm(
            `Xóa lớp ${classCode}? Toàn bộ buổi học, nhận xét và danh sách học viên của lớp sẽ bị xóa vĩnh viễn.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={classId} />
      <Button type="submit" variant="destructive" size="sm">
        Xóa lớp
      </Button>
    </form>
  );
}
