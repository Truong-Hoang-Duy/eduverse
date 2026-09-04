"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { EditCourseDialog } from "./edit-course-dialog";

export interface ClassItem {
  id: string;
  classCode: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  courseDescription: string | null;
  totalSessions: number;
  studentCount: number;
  description: string | null;
  /** Buổi cuối đã nhận xét xong mọi học viên — xem `lib/class-completion.ts`. */
  completed: boolean;
}

type StatusFilter = "active" | "completed" | "all";

const STATUS_LABELS: Record<StatusFilter, string> = {
  active: "Đang học",
  completed: "Đã hoàn thành",
  all: "Tất cả",
};

export function ClassList({ classes }: { classes: ClassItem[] }) {
  const [query, setQuery] = useState("");
  // Mặc định chỉ hiện lớp còn hoạt động — lớp cũ dồn lại qua từng khóa sẽ chôn
  // mất lớp đang dạy nếu để "Tất cả".
  const [status, setStatus] = useState<StatusFilter>("active");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classes.filter((c) => {
      if (status === "active" && c.completed) return false;
      if (status === "completed" && !c.completed) return false;
      if (!q) return true;
      return (
        c.classCode.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        c.courseCode.toLowerCase().includes(q)
      );
    });
  }, [classes, query, status]);

  // Gom theo khóa, giữ thứ tự mã khóa.
  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        description: string | null;
        items: ClassItem[];
      }
    >();
    for (const cls of filtered) {
      const group = map.get(cls.courseId);
      if (group) group.items.push(cls);
      else
        map.set(cls.courseId, {
          id: cls.courseId,
          code: cls.courseCode,
          name: cls.courseName,
          description: cls.courseDescription,
          items: [cls],
        });
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Danh sách lớp</h2>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
          >
            <SelectTrigger size="sm" className="w-40" aria-label="Lọc theo trạng thái lớp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {STATUS_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Tìm theo mã lớp hoặc tên khóa..."
            className="h-9 w-full sm:max-w-xs"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {query
            ? `Không có lớp nào khớp "${query}".`
            : status === "active"
              ? "Không còn lớp nào đang học — chọn “Đã hoàn thành” hoặc “Tất cả” để xem lớp cũ."
              : status === "completed"
                ? "Chưa có lớp nào hoàn thành (lớp xong khi buổi cuối đã nhận xét đủ học viên)."
                : "Chưa có lớp nào — mở lớp bằng form bên dưới."}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.code} className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="rounded-md px-2.5 py-1 font-mono text-xs">
              {group.code}
            </Badge>
            <h3 className="font-semibold tracking-tight">{group.name}</h3>
            <span className="text-sm text-muted-foreground">
              {group.items.length} lớp
            </span>
            <EditCourseDialog
              courseId={group.id}
              code={group.code}
              name={group.name}
              description={group.description}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((cls) => (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                <Card className="group h-full gap-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-lg">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{cls.classCode}</span>
                        {cls.completed && (
                          <Badge
                            variant="outline"
                            className="shrink-0 rounded-md border-green-600/40 text-xs font-normal text-green-700 dark:border-green-400/40 dark:text-green-400"
                          >
                            ✓ Đã hoàn thành
                          </Badge>
                        )}
                      </span>
                      <span className="shrink-0 text-xs font-normal text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        Xem lớp →
                      </span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3">
                      <span>📅 {cls.totalSessions} buổi</span>
                      <span>👧 {cls.studentCount} học viên</span>
                    </CardDescription>
                  </CardHeader>
                  {cls.description && (
                    <CardContent className="line-clamp-2 text-sm text-muted-foreground">
                      {cls.description}
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
