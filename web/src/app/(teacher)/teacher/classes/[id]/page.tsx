import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { ClassWithCourse, EnrollmentWithStudent } from "@/lib/types";

import { DeleteClassButton } from "./delete-class-button";
import { StudentSummaryPanel } from "./student-summary-panel";
import {
  StudentsTable,
  type ClassOption,
  type StudentRow,
} from "./students-table";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: classData },
    { data: enrollmentsData },
    { data: allClasses },
    { data: sessionsData },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("*, courses(code, name)")
      .eq("id", id)
      .single(),
    supabase
      .from("enrollments")
      .select("*, profiles(id, full_name, username)")
      .eq("class_id", id)
      .order("joined_at"),
    supabase.from("classes").select("id, class_code").order("class_code"),
    supabase
      .from("sessions")
      .select("id, session_number, title, content, session_date")
      .eq("class_id", id)
      .order("session_number"),
  ]);

  if (!classData) {
    notFound();
  }

  const cls = classData as ClassWithCourse;
  const enrollments = (enrollmentsData ?? []) as EnrollmentWithStudent[];

  const students: StudentRow[] = enrollments
    .filter((e) => e.profiles !== null)
    .map((e) => ({
      enrollmentId: e.id,
      studentId: e.profiles!.id,
      fullName: e.profiles!.full_name,
      username: e.profiles!.username,
    }));

  const otherClasses: ClassOption[] = (
    (allClasses ?? []) as { id: string; class_code: string }[]
  )
    .filter((c) => c.id !== id)
    .map((c) => ({ id: c.id, classCode: c.class_code }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/teacher"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Quay lại danh sách lớp
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
              Lớp {cls.class_code}
              <Badge variant="secondary" className="rounded-md">
                {cls.courses ? `${cls.courses.code} — ${cls.courses.name}` : ""}
              </Badge>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              📅 {cls.total_sessions} buổi · 👧 {students.length} học viên
              {cls.description ? ` · ${cls.description}` : ""}
            </p>
          </div>
          <DeleteClassButton classId={cls.id} classCode={cls.class_code} />
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Buổi học</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(sessionsData ?? []).map((session) => {
              const filled = Boolean(session.content);
              return (
                <Link key={session.id} href={`/teacher/sessions/${session.id}`}>
                  <div className="group flex h-full items-start gap-3 rounded-lg border p-3 transition-all hover:border-primary/40 hover:shadow-sm">
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${
                        filled
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {session.session_number}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {session.title ?? `Buổi ${session.session_number}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.session_date
                          ? new Date(session.session_date).toLocaleDateString("vi-VN")
                          : filled
                            ? "Đã có nội dung"
                            : "Chưa có nội dung"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Danh sách học viên</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentsTable
            classId={cls.id}
            students={students}
            otherClasses={otherClasses}
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            📝 Nhận xét tổng hợp từng học viên
          </CardTitle>
          <CardDescription>
            AI tổng hợp từ tất cả các buổi đã nhận xét: quá trình học, điểm mạnh,
            điểm yếu, định hướng sắp tới, khó khăn cần hỗ trợ — bấm Copy để gửi
            riêng cho phụ huynh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentSummaryPanel
            classId={cls.id}
            students={students.map((s) => ({
              id: s.studentId,
              fullName: s.fullName,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
