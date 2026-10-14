import Link from "next/link";
import { notFound } from "next/navigation";

import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { EditStudentNameDialog } from "../../edit-student-name-dialog";
import { StudentSummaryPanel } from "../../student-summary-panel";

export const metadata = { title: "Hồ sơ học viên — Eduverse" };

interface ReviewRow {
  session_id: string;
  strengths: string[];
  improvements: string[];
  ai_generated_comment: string | null;
  sessions: {
    session_number: number;
    title: string | null;
    session_date: string | null;
    class_id: string;
  } | null;
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;
  const supabase = await createClient();

  // RLS: classes chỉ trả lớp của GV này; student_reviews_teacher_all chỉ trả
  // nhận xét trong lớp GV dạy → không cần check quyền thủ công.
  const [
    { data: classData },
    { data: student },
    { data: enrollment },
    { data: reviewsData },
    { data: sessionsData },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("class_code, courses(code, name)")
      .eq("id", id)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", studentId)
      .single(),
    supabase
      .from("enrollments")
      .select("id")
      .eq("class_id", id)
      .eq("student_id", studentId)
      .maybeSingle(),
    supabase
      .from("student_reviews")
      .select(
        "session_id, strengths, improvements, ai_generated_comment, sessions!inner(session_number, title, session_date, class_id)"
      )
      .eq("student_id", studentId)
      .eq("sessions.class_id", id),
    supabase.from("sessions").select("session_number").eq("class_id", id),
  ]);

  // Lớp không thuộc GV, HV không tồn tại, hoặc HV không thuộc lớp này → 404.
  if (!classData || !student || !enrollment) {
    notFound();
  }

  const cls = classData as unknown as {
    class_code: string;
    courses: { code: string; name: string } | null;
  };

  const reviews = ((reviewsData ?? []) as unknown as ReviewRow[])
    .slice()
    .sort(
      (a, b) =>
        (a.sessions?.session_number ?? 0) - (b.sessions?.session_number ?? 0)
    );

  const totalSessions = (sessionsData ?? []).length;
  const totalStrengths = reviews.reduce((n, r) => n + r.strengths.length, 0);
  const totalImprovements = reviews.reduce(
    (n, r) => n + r.improvements.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-3 cursor-pointer">
          <Link href={`/teacher/classes/${id}`}>
            ← Quay lại lớp {cls.class_code}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">
            {student.full_name}
          </h1>
          <EditStudentNameDialog
            studentId={studentId}
            classId={id}
            currentName={student.full_name}
          />
          {student.username && (
            <span className="text-sm text-muted-foreground">
              @{student.username}
            </span>
          )}
          <Badge variant="secondary" className="rounded-md">
            {cls.courses ? `${cls.courses.code} · ` : ""}Lớp {cls.class_code}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Đã nhận xét"
          value={`${reviews.length}/${totalSessions}`}
          hint="Buổi đã có nhận xét"
        />
        <StatCard
          label="Điểm mạnh"
          value={totalStrengths}
          hint="Lượt ghi nhận qua các buổi"
        />
        <StatCard
          label="Cần cải thiện"
          value={totalImprovements}
          hint="Lượt ghi nhận qua các buổi"
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            Nhận xét tổng hợp toàn khóa
          </CardTitle>
          <CardDescription>
            AI tổng hợp từ tất cả các buổi đã nhận xét.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentSummaryPanel
            classId={id}
            students={[]}
            lockedStudent={{ id: studentId, fullName: student.full_name }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            🗒️ Nhận xét từng buổi ({reviews.length})
          </CardTitle>
          <CardDescription>
            Điểm mạnh, điểm cần cải thiện đã ghi cho từng buổi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có nhận xét nào cho em này. Vào từng buổi học để nhận xét.
            </p>
          ) : (
            <ol className="space-y-4">
              {reviews.map((r) => (
                <li
                  key={r.session_id}
                  className="rounded-lg border p-4 transition-colors hover:border-primary/40"
                >
                  <Link
                    href={`/teacher/sessions/${r.session_id}`}
                    className="flex items-start gap-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                      {r.sessions?.session_number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {r.sessions?.title ??
                          `Buổi ${r.sessions?.session_number}`}
                      </p>
                      {r.sessions?.session_date && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.sessions.session_date).toLocaleDateString(
                            "vi-VN"
                          )}
                        </p>
                      )}
                    </div>
                  </Link>

                  {(r.strengths.length > 0 || r.improvements.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.strengths.map((s, i) => (
                        <span
                          key={`s${i}`}
                          className="rounded-md border border-green-600/30 bg-green-600/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400"
                        >
                          💪 {s}
                        </span>
                      ))}
                      {r.improvements.map((s, i) => (
                        <span
                          key={`i${i}`}
                          className="rounded-md border border-yellow-600/30 bg-yellow-600/10 px-2 py-0.5 text-xs text-yellow-700 dark:text-yellow-400"
                        >
                          🎯 {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {r.ai_generated_comment && (
                    <p className="mt-2 rounded-md bg-muted/50 p-2.5 text-sm whitespace-pre-wrap text-muted-foreground">
                      {r.ai_generated_comment}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
