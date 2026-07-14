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

export default async function StudentDashboard() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { data } = await supabase
    .from("enrollments")
    .select(
      "id, joined_at, classes(id, class_code, total_sessions, description, courses(code, name))"
    )
    .eq("student_id", profile.id);

  const myClasses = (data ?? []) as unknown as MyClassRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Xin chào, {profile.full_name}! 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Đây là các lớp học của bạn
        </p>
      </div>

      {myClasses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Bạn chưa tham gia lớp nào</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Liên hệ giáo viên để được thêm vào lớp nhé.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {myClasses.map(
            (row) =>
              row.classes && (
                <Card
                  key={row.id}
                  className="gap-3 border-l-4 border-l-primary shadow-sm"
                >
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Lớp {row.classes.class_code}
                    </CardTitle>
                    <CardDescription>
                      {row.classes.courses
                        ? `${row.classes.courses.code} — ${row.classes.courses.name}`
                        : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>📅 {row.classes.total_sessions} buổi học</p>
                    {row.classes.description && <p>{row.classes.description}</p>}
                    <p className="mt-2 text-xs">
                      Tham gia ngày{" "}
                      {new Date(row.joined_at).toLocaleDateString("vi-VN")}
                    </p>
                  </CardContent>
                </Card>
              )
          )}
        </div>
      )}
    </div>
  );
}
