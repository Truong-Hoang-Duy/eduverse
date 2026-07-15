import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Lớp của tôi — Eduverse" };

interface MyClassRow {
  id: string;
  joined_at: string;
  classes: {
    id: string;
    class_code: string;
    total_sessions: number;
    description: string | null;
    courses: { code: string; name: string } | null;
  } | null;
}

interface SessionRow {
  id: string;
  class_id: string;
  session_number: number;
  title: string | null;
  content: string | null;
  session_date: string | null;
}

export default async function StudentDashboard() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  // Không lấy nhận xét cá nhân: học viên không xem nhận xét của giáo viên ở đây.
  const [{ data }, { data: sessionsData }, { count: projectCount }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select(
          "id, joined_at, classes(id, class_code, total_sessions, description, courses(code, name))"
        )
        .eq("student_id", profile.id),
      supabase
        .from("sessions")
        .select("id, class_id, session_number, title, content, session_date")
        .order("session_number"),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("student_id", profile.id),
    ]);

  const myClasses = (data ?? []) as unknown as MyClassRow[];
  const sessions = (sessionsData ?? []) as SessionRow[];
  const learnedSessions = sessions.filter((s) => s.content).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Xin chào, ${profile.full_name}! 👋`}
        description="Đây là các lớp học của bạn"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Lớp học" value={myClasses.length} hint="Lớp đang tham gia" />
        <StatCard
          label="Buổi đã học"
          value={learnedSessions}
          hint="Buổi đã có nội dung"
        />
        <StatCard
          label="Sản phẩm"
          value={projectCount ?? 0}
          hint="Sản phẩm cuối khóa đã khai báo"
        />
      </div>

      {myClasses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Bạn chưa tham gia lớp nào</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Liên hệ giáo viên để được thêm vào lớp nhé.
          </p>
        </div>
      ) : (
        myClasses.map((row) => {
          if (!row.classes) return null;
          const classSessions = sessions
            .filter((s) => s.class_id === row.classes!.id)
            .filter((s) => s.content || s.title);
          return (
            <Card
              key={row.id}
              className="gap-4 border-l-4 border-l-primary shadow-sm"
            >
              <CardHeader>
                <CardTitle className="text-lg">
                  Lớp {row.classes.class_code}
                </CardTitle>
                <CardDescription>
                  {row.classes.courses
                    ? `${row.classes.courses.code} — ${row.classes.courses.name}`
                    : ""}{" "}
                  · 📅 {row.classes.total_sessions} buổi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {classSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Chưa có nội dung buổi học nào.
                  </p>
                ) : (
                  classSessions.map((session) => (
                    <details key={session.id} className="group rounded-lg border">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm [&::-webkit-details-marker]:hidden">
                        <span className="font-medium">
                          Buổi {session.session_number}
                          {session.title ? `: ${session.title}` : ""}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {session.session_date &&
                            new Date(session.session_date).toLocaleDateString(
                              "vi-VN"
                            )}
                          <span className="transition-transform group-open:rotate-180">
                            ▼
                          </span>
                        </span>
                      </summary>
                      <div className="border-t p-3 text-sm">
                        {session.content ? (
                          <p className="whitespace-pre-wrap text-muted-foreground">
                            {session.content}
                          </p>
                        ) : (
                          <p className="text-muted-foreground">
                            Buổi này chưa có nội dung chi tiết.
                          </p>
                        )}
                      </div>
                    </details>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
