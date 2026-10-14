"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";

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
import { updateStudentName } from "@/lib/actions/classes";
import type { ActionResult } from "@/lib/types";

interface EditStudentNameDialogProps {
  studentId: string;
  classId: string;
  currentName: string;
  trigger?: React.ReactNode;
}

export function EditStudentNameDialog({
  studentId,
  classId,
  currentName,
  trigger,
}: EditStudentNameDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updateStudentName,
    null
  );

  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        setOpen(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state?.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Đổi họ tên học viên"
            aria-label="Đổi họ tên học viên"
          >
            <Pencil className="size-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đổi họ tên học viên</DialogTitle>
          <DialogDescription>
            Sửa họ tên học viên khi các em đăng ký sai. Tên mới sẽ được cập nhật
            đồng bộ trong toàn bộ hệ thống lớp học và bảng nhận xét.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="student_id" value={studentId} />
          <input type="hidden" name="class_id" value={classId} />

          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${studentId}`}>Họ và tên học viên</Label>
            <Input
              id={`edit-name-${studentId}`}
              name="full_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nguyễn Văn An"
              maxLength={100}
              required
              autoFocus
            />
          </div>

          {state && <FormMessage result={state} />}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
