"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { removeStudent, transferStudent } from "@/lib/actions/classes";
import type { ActionResult } from "@/lib/types";

import { ResetPasswordDialog } from "./reset-password-dialog";

export interface StudentRow {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  username: string | null;
}

export interface ClassOption {
  id: string;
  classCode: string;
}

export function StudentsTable({
  classId,
  students,
  otherClasses,
}: {
  classId: string;
  students: StudentRow[];
  otherClasses: ClassOption[];
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    transferStudent,
    {}
  );

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có học viên nào. Gửi mã lớp cho học viên để các em tự đăng ký.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <FormMessage result={state} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Họ tên</TableHead>
            <TableHead>Tên tài khoản</TableHead>
            <TableHead className="w-[380px]">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.enrollmentId}>
              <TableCell className="font-medium">
                <Link
                  href={`/teacher/classes/${classId}/students/${student.studentId}`}
                  className="text-primary transition-colors hover:underline"
                >
                  {student.fullName}
                </Link>
              </TableCell>
              <TableCell>{student.username ?? "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <form action={formAction} className="flex items-center gap-2">
                    <input
                      type="hidden"
                      name="enrollment_id"
                      value={student.enrollmentId}
                    />
                    <input
                      type="hidden"
                      name="current_class_id"
                      value={classId}
                    />
                    <Select name="target_class_id">
                      <SelectTrigger size="sm" className="w-[120px]">
                        <SelectValue placeholder="Lớp mới" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherClasses.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.classCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="submit" variant="outline" size="sm">
                      Chuyển
                    </Button>
                  </form>
                  <ResetPasswordDialog
                    studentId={student.studentId}
                    studentName={student.fullName}
                  />
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm">
                        Xóa
                      </Button>
                    }
                    title={`Xóa ${student.fullName} khỏi lớp?`}
                    description="Học viên sẽ bị gỡ khỏi lớp này cùng các nhận xét trong lớp. Tài khoản của em vẫn còn — có thể cho tham gia lại bằng mã lớp."
                    confirmLabel="Xóa khỏi lớp"
                    action={removeStudent}
                    fields={{
                      enrollment_id: student.enrollmentId,
                      class_id: classId,
                    }}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
