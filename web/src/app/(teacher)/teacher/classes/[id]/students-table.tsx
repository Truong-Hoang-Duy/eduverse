"use client";

import { useActionState } from "react";

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
            <TableHead className="w-[280px]">Chuyển lớp / Xóa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.enrollmentId}>
              <TableCell className="font-medium">{student.fullName}</TableCell>
              <TableCell>{student.username ?? "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
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
                  <form
                    action={removeStudent}
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          `Xóa ${student.fullName} khỏi lớp? (không xóa tài khoản)`
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input
                      type="hidden"
                      name="enrollment_id"
                      value={student.enrollmentId}
                    />
                    <input type="hidden" name="class_id" value={classId} />
                    <Button type="submit" variant="ghost" size="sm">
                      Xóa
                    </Button>
                  </form>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
