import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

import { AssignmentForm, type CourseChoice } from "./assignment-form";
import { DeleteAssignmentButton } from "./delete-assignment-button";

export const metadata = { title: "Chấm bài — Eduverse" };

interface AssignmentRow {
  id: string;
  course_id: string;
  session_number: number;
  title: string;
  spec_file_path: string | null;
  submissions: { count: number }[];
}

export default async function AssignmentsPage() {
  const supabase = await createClient();

  const [{ data: coursesData }, { data: assignmentsData }] = await Promise.all([
    supabase.from("courses").select("id, code, name").order("code"),
    supabase
      .from("assignments")
      .select("id, course_id, session_number, title, spec_file_path, submissions(count)")
      .order("session_number"),
  ]);

  const courses = (coursesData ?? []) as CourseChoice[];
  const assignments = (assignmentsData ?? []) as AssignmentRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chấm bài tập</h1>
        <p className="text-sm text-muted-foreground">
          Đề bài thuộc KHÓA HỌC, mỗi buổi một đề — dùng chung cho mọi lớp cùng khóa
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Chưa có khóa học nào</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tạo khóa học trong trang Lớp học trước.
          </p>
        </div>
      ) : (
        courses.map((course) => {
          const courseAssignments = assignments.filter(
            (a) => a.course_id === course.id
          );
          return (
            <section key={course.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="rounded-md px-2.5 py-1 font-mono text-xs">
                  {course.code}
                </Badge>
                <h2 className="text-lg font-semibold tracking-tight">
                  {course.name}
                </h2>
              </div>
              {courseAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có đề bài nào — tạo bằng form bên dưới.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {courseAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="group relative rounded-lg border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <Link href={`/teacher/assignments/${a.id}`} className="block">
                        <div className="flex items-start gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                            {a.session_number}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{a.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Buổi {a.session_number} ·{" "}
                              {a.submissions[0]?.count ?? 0} bài nộp · Chấm bài →
                            </p>
                          </div>
                        </div>
                      </Link>
                      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <DeleteAssignmentButton
                          assignmentId={a.id}
                          title={a.title}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}

      {courses.length > 0 && (
        <section className="max-w-xl space-y-3 border-t pt-6">
          <AssignmentForm courses={courses} />
        </section>
      )}
    </div>
  );
}
