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

export interface ClassItem {
  id: string;
  classCode: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  totalSessions: number;
  studentCount: number;
  description: string | null;
}

export function ClassList({ classes }: { classes: ClassItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.classCode.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        c.courseCode.toLowerCase().includes(q)
    );
  }, [classes, query]);

  // Gom theo khóa, giữ thứ tự mã khóa.
  const groups = useMemo(() => {
    const map = new Map<string, { code: string; name: string; items: ClassItem[] }>();
    for (const cls of filtered) {
      const group = map.get(cls.courseId);
      if (group) group.items.push(cls);
      else
        map.set(cls.courseId, {
          code: cls.courseCode,
          name: cls.courseName,
          items: [cls],
        });
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Danh sách lớp</h2>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Tìm theo mã lớp hoặc tên khóa..."
          className="h-9 max-w-xs"
        />
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {query
            ? `Không có lớp nào khớp "${query}".`
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((cls) => (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                <Card className="group h-full gap-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      {cls.classCode}
                      <span className="text-xs font-normal text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
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
