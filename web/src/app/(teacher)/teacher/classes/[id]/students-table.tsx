"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { DriveLinkChip } from "@/components/drive-link-chip";
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
import { ACADEMIC_LEVELS } from "@/lib/academic-levels";
import { removeStudent, setEnrollmentAcademicLevel } from "@/lib/actions/classes";

import { ResetPasswordDialog } from "./reset-password-dialog";

export interface StudentRow {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  username: string | null;
  /** Link Drive nộp bài em tự khai; null nếu chưa khai. Chỉ GV của lớp đọc được. */
  driveUrl: string | null;
  /** Xếp loại học lực CỦA LỚP NÀY, tích 1 lần — dùng ngữ cảnh cho mọi buổi
   *  nhận xét (yêu cầu user 2026-08-28, thay vì chọn lại mỗi buổi). */
  academicLevel: string | null;
}

export interface ClassOption {
  id: string;
  classCode: string;
}

/** Select xếp loại học lực — AUTO SAVE ngay khi đổi, không có nút Lưu riêng
 *  (cùng tinh thần "tick Vắng lưu luôn" ở review-editor: tích 1 lần cho cả
 *  lớp, GV không phải chọn lại mỗi buổi nhận xét). */
function AcademicLevelSelect({
  enrollmentId,
  classId,
  value,
}: {
  enrollmentId: string;
  classId: string;
  value: string | null;
}) {
  const [level, setLevel] = useState(value ?? "");
  const [pending, startTransition] = useTransition();

  function handleChange(next: string) {
    const resolved = next === "none" ? "" : next;
    setLevel(resolved);
    startTransition(async () => {
      await setEnrollmentAcademicLevel({
        enrollmentId,
        classId,
        level: resolved,
      });
    });
  }

  return (
    <Select value={level || "none"} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger size="sm" className="h-8 w-[140px] text-xs">
        <SelectValue placeholder="Chưa chọn" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Chưa chọn</SelectItem>
        {ACADEMIC_LEVELS.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StudentsTable({
  classId,
  students,
}: {
  classId: string;
  students: StudentRow[];
}) {
  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có học viên nào. Gửi mã lớp cho học viên để các em tự đăng ký.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Họ tên</TableHead>
            <TableHead>Tên tài khoản</TableHead>
            <TableHead>Thư mục nộp bài</TableHead>
            <TableHead>Xếp loại học lực</TableHead>
            <TableHead className="w-[160px]">Thao tác</TableHead>
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
                {student.driveUrl ? (
                  <DriveLinkChip url={student.driveUrl} />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Chưa khai báo
                  </span>
                )}
              </TableCell>
              <TableCell>
                <AcademicLevelSelect
                  enrollmentId={student.enrollmentId}
                  classId={classId}
                  value={student.academicLevel}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
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
