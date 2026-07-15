"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
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
    <ConfirmDialog
      trigger={
        <Button variant="destructive" size="sm">
          Xóa lớp
        </Button>
      }
      title={`Xóa lớp ${classCode}?`}
      description="Toàn bộ buổi học, nhận xét, sản phẩm và danh sách học viên của lớp sẽ bị xóa vĩnh viễn. Không thể hoàn tác."
      confirmLabel="Xóa lớp"
      action={deleteClass}
      fields={{ id: classId }}
    />
  );
}
