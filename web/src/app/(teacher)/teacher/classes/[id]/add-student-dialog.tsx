"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addStudentToClass,
  searchStudents,
  type StudentSearchResult,
} from "@/lib/actions/classes";

export function AddStudentDialog({
  classId,
  classCode,
  existingStudentIds,
}: {
  classId: string;
  classCode: string;
  existingStudentIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searching, startSearch] = useTransition();
  const [adding, startAdd] = useTransition();

  // Chờ 300ms sau khi ngừng gõ mới tìm, tránh gọi server mỗi phím.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        const res = await searchStudents(q);
        if (res.error) setError(res.error);
        else {
          setError("");
          setResults(res.students ?? []);
        }
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  function handleAdd(student: StudentSearchResult) {
    setMessage("");
    setError("");
    startAdd(async () => {
      const res = await addStudentToClass({ classId, studentId: student.id });
      if (res.error) setError(res.error);
      else {
        setMessage(`Đã thêm ${student.full_name} vào lớp.`);
        setQuery("");
        setResults([]);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQuery("");
          setResults([]);
          setMessage("");
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          + Thêm học viên
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm học viên vào lớp {classCode}</DialogTitle>
          <DialogDescription>
            Tìm theo họ tên hoặc tên tài khoản. Học viên phải đã có tài khoản.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="student-search">Tìm học viên</Label>
            <Input
              id="student-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="VD: Nguyễn Văn An hoặc nguyenvanan"
              autoComplete="off"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ {message}
            </p>
          )}

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {searching && (
              <p className="text-sm text-muted-foreground">Đang tìm...</p>
            )}
            {!searching && query.trim() && results.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Không tìm thấy học viên nào khớp &quot;{query}&quot;.
              </p>
            )}
            {results.map((student) => {
              const already = existingStudentIds.includes(student.id);
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {student.full_name.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {student.full_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {student.username ?? "—"}
                      </p>
                    </div>
                  </div>
                  {already ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Đã trong lớp
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleAdd(student)}
                      disabled={adding}
                    >
                      Thêm
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
