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

export const metadata = { title: "Lớp học — Eduverse" };

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

  // Chỉ lấy thông tin lớp: không liệt kê buổi học, không lấy nhận xét cá nhân.
  const [{ data }, { count: projectCount }] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "id, joined_at, classes(id, class_code, total_sessions, description, courses(code, name))"
      )
      .eq("student_id", profile.id),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("student_id", profile.id),
  ]);

  const myClasses = (data ?? []) as unknown as MyClassRow[];
  const totalSessions = myClasses.reduce(
    (sum, row) => sum + (row.classes?.total_sessions ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Xin chào, ${profile.full_name}! 👋`}
        description="Đây là các lớp học của bạn"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Lớp học" value={myClasses.length} hint="Lớp đang tham gia" />
        <StatCard label="Tổng buổi" value={totalSessions} hint="Số buổi của khóa" />
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
        <div className="grid gap-4 sm:grid-cols-2">
          {myClasses.map((row) => {
            if (!row.classes) return null;
            return (
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
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>📅 {row.classes.total_sessions} buổi</p>
                  {row.classes.description && <p>{row.classes.description}</p>}
                  <p className="text-xs">
                    Tham gia ngày{" "}
                    {new Date(row.joined_at).toLocaleDateString("vi-VN")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
