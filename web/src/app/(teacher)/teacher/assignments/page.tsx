import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { AssignmentForm } from "./assignment-form";
import { DeleteAssignmentButton } from "./delete-assignment-button";
import {
  GradingTool,
  type AssignmentChoice,
  type CourseChoice,
} from "./grading-tool";

export const metadata = { title: "Chấm bài — Eduverse" };

interface AssignmentRow {
  id: string;
  course_id: string;
  session_number: number;
  title: string;
  spec_file_path: string | null;
}

export default async function AssignmentsPage() {
  const supabase = await createClient();

  const [{ data: coursesData }, { data: assignmentsData }] = await Promise.all([
    supabase.from("courses").select("id, code, name").order("code"),
    supabase
      .from("assignments")
      .select("id, course_id, session_number, title, spec_file_path")
      .order("session_number"),
  ]);

  const courses = (coursesData ?? []) as CourseChoice[];
  const assignments = (assignmentsData ?? []) as AssignmentRow[];

  const assignmentChoices: AssignmentChoice[] = assignments.map((a) => ({
    id: a.id,
    courseId: a.course_id,
    courseCode: courses.find((c) => c.id === a.course_id)?.code ?? "",
    sessionNumber: a.session_number,
    title: a.title,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chấm bài</h1>
        <p className="text-sm text-muted-foreground">
          Chọn khóa và đề, tải file bài làm lên — AI chấm điểm và nhận xét để bạn copy
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
        <>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">✨ Chấm bài làm</CardTitle>
              <CardDescription>
                Kết quả chỉ hiện để copy, không được lưu lại
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GradingTool courses={courses} assignments={assignmentChoices} />
            </CardContent>
          </Card>

          <section className="space-y-4 border-t pt-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Đề bài đã lưu</h2>
              <p className="text-sm text-muted-foreground">
                Đề thuộc khóa học, mỗi buổi một đề — dùng chung cho mọi lớp cùng khóa
              </p>
            </div>

            {courses.map((course) => {
              const courseAssignments = assignments.filter(
                (a) => a.course_id === course.id
              );
              return (
                <div key={course.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge className="rounded-md px-2.5 py-1 font-mono text-xs">
                      {course.code}
                    </Badge>
                    <span className="text-sm font-medium">{course.name}</span>
                  </div>
                  {courseAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa có đề bài nào.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {courseAssignments.map((a) => (
                        <div
                          key={a.id}
                          className="group flex items-start gap-3 rounded-lg border bg-card p-3"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                            {a.session_number}
                          </span>
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {a.title}
                          </p>
                          <div className="opacity-0 transition-opacity group-hover:opacity-100">
                            <DeleteAssignmentButton
                              assignmentId={a.id}
                              title={a.title}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="max-w-xl pt-2">
              <AssignmentForm courses={courses} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
