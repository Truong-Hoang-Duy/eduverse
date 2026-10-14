"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  Check,
  GripVertical,
  Loader2,
} from "lucide-react";

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
import {
  removeStudent,
  setEnrollmentAcademicLevel,
  updateStudentsOrder,
} from "@/lib/actions/classes";
import { sortStudentsByVietnameseName } from "@/lib/student-sort";

import { EditStudentNameDialog } from "./edit-student-name-dialog";
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
  sortOrder?: number;
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
  const [orderedStudents, setOrderedStudents] = useState<StudentRow[]>(students);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setOrderedStudents(students);
  }, [students]);

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có học viên nào. Gửi mã lớp cho học viên để các em tự đăng ký.
      </p>
    );
  }

  async function persistOrder(newList: StudentRow[]) {
    setOrderedStudents(newList);
    setSaveStatus("saving");
    try {
      const res = await updateStudentsOrder({
        classId,
        orderedEnrollmentIds: newList.map((s) => s.enrollmentId),
      });
      if (res?.error) {
        setSaveStatus("error");
      } else {
        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, 2500);
      }
    } catch {
      setSaveStatus("error");
    }
  }

  function moveStudent(fromIndex: number, toIndex: number) {
    if (
      toIndex < 0 ||
      toIndex >= orderedStudents.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const next = [...orderedStudents];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persistOrder(next);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    moveStudent(draggedIndex, dropIndex);
    setDraggedIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleSortAZ() {
    const sorted = sortStudentsByVietnameseName(orderedStudents);
    persistOrder(sorted);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">
            Kéo thả <GripVertical className="inline size-3.5 align-middle" /> hoặc
            bấm nút ↑ ↓ để sắp xếp thứ tự học viên.
          </span>
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 font-medium text-primary">
              <Loader2 className="size-3 animate-spin" /> Đang lưu thứ tự...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 font-medium text-emerald-600">
              <Check className="size-3" /> Đã lưu thứ tự
            </span>
          )}
          {saveStatus === "error" && (
            <span className="font-medium text-destructive">
              Lỗi lưu thứ tự. Vui lòng thử lại.
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs cursor-pointer"
          onClick={handleSortAZ}
          disabled={saveStatus === "saving" || orderedStudents.length <= 1}
          title="Tự động sắp xếp học viên theo thứ tự tên tiếng Việt (A-Z)"
        >
          <ArrowDownAZ className="size-3.5" />
          Sắp xếp A-Z
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[85px] text-center">Thứ tự</TableHead>
            <TableHead>Họ tên</TableHead>
            <TableHead>Tên tài khoản</TableHead>
            <TableHead>Thư mục nộp bài</TableHead>
            <TableHead>Xếp loại học lực</TableHead>
            <TableHead className="w-[160px]">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orderedStudents.map((student, index) => (
            <TableRow
              key={student.enrollmentId}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`transition-colors ${
                dragOverIndex === index
                  ? "border-t-2 border-primary bg-accent/40"
                  : ""
              } ${draggedIndex === index ? "opacity-50" : ""}`}
            >
              <TableCell className="w-[85px] p-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span
                    className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    title="Kéo thả đổi thứ tự"
                  >
                    <GripVertical className="size-4" />
                  </span>
                  <span className="w-4 text-xs font-semibold text-muted-foreground select-none">
                    {index + 1}
                  </span>
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveStudent(index, index - 1)}
                      disabled={index === 0 || saveStatus === "saving"}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Chuyển lên trên"
                      aria-label="Chuyển lên trên"
                    >
                      <ArrowUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStudent(index, index + 1)}
                      disabled={
                        index === orderedStudents.length - 1 ||
                        saveStatus === "saving"
                      }
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      title="Chuyển xuống dưới"
                      aria-label="Chuyển xuống dưới"
                    >
                      <ArrowDown className="size-3" />
                    </button>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/teacher/classes/${classId}/students/${student.studentId}`}
                    className="text-primary transition-colors hover:underline"
                  >
                    {student.fullName}
                  </Link>
                  <EditStudentNameDialog
                    studentId={student.studentId}
                    classId={classId}
                    currentName={student.fullName}
                  />
                </div>
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

