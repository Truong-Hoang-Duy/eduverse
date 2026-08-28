"use client";

import { useActionState, useEffect, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transferStudent } from "@/lib/actions/classes";
import type { ActionResult } from "@/lib/types";

import type { ClassOption } from "./students-table";

export interface TransferStudentOption {
  enrollmentId: string;
  fullName: string;
}

/** Chuyển học viên sang lớp khác — trước đây là Select+nút inline trong từng
 *  dòng bảng (chiếm nhiều chỗ, dễ rối); giờ gom vào 1 dialog cạnh nút "+ Thêm
 *  học viên" cho bảng gọn hơn (yêu cầu user 2026-08-28). Vẫn gọi thẳng
 *  `transferStudent` — chữ ký action không đổi. */
export function TransferStudentDialog({
  classId,
  students,
  otherClasses,
}: {
  classId: string;
  students: TransferStudentOption[];
  otherClasses: ClassOption[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    transferStudent,
    {}
  );
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");

  useEffect(() => {
    if (state.success) {
      setStudentId("");
      setTargetClassId("");
    }
  }, [state]);

  if (students.length === 0 || otherClasses.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setStudentId("");
          setTargetClassId("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          ⇄ Chuyển học viên
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển học viên sang lớp khác</DialogTitle>
          <DialogDescription>
            Chọn học viên đang trong lớp này và lớp đích muốn chuyển đến.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="current_class_id" value={classId} />
          <input type="hidden" name="enrollment_id" value={studentId} />
          <input type="hidden" name="target_class_id" value={targetClassId} />

          <div className="space-y-1.5">
            <Label htmlFor="transfer-student">Học viên</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="transfer-student" className="w-full">
                <SelectValue placeholder="Chọn học viên" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.enrollmentId} value={s.enrollmentId}>
                    {s.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transfer-target-class">Lớp đích</Label>
            <Select value={targetClassId} onValueChange={setTargetClassId}>
              <SelectTrigger id="transfer-target-class" className="w-full">
                <SelectValue placeholder="Chọn lớp muốn chuyển đến" />
              </SelectTrigger>
              <SelectContent>
                {otherClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.classCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FormMessage result={state} />
          <Button
            type="submit"
            size="sm"
            disabled={pending || !studentId || !targetClassId}
          >
            {pending ? "Đang chuyển..." : "Chuyển lớp"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
