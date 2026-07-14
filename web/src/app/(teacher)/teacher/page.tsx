import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Class, Course } from "@/lib/types";

import { ClassForm, type CourseOption } from "./class-form";
import { CourseForm } from "./course-form";

export const metadata = { title: "Lớp học — Eduverse" };

interface ClassRow extends Class {
  enrollments: { count: number }[];
}

function nextClassCode(courseCode: string, classes: ClassRow[]): string {
  const numbers = classes
    .filter((c) => c.class_code.startsWith(courseCode))
    .map((c) => Number(c.class_code.slice(courseCode.length)))
    .filter((n) => Number.isFinite(n));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${courseCode}${String(next).padStart(2, "0")}`;
}

export default async function TeacherDashboard() {
  const supabase = await createClient();

  const [{ data: coursesData }, { data: classesData }] = await Promise.all([
    supabase.from("courses").select("*").order("code"),
    supabase
      .from("classes")
      .select("*, enrollments(count)")
      .order("class_code"),
  ]);

  const courses = (coursesData ?? []) as Course[];
  const classes = (classesData ?? []) as ClassRow[];

  const courseOptions: CourseOption[] = courses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    suggestedCode: nextClassCode(
      course.code,
      classes.filter((c) => c.course_id === course.id)
    ),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Khóa học & lớp</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý các khóa học và lớp bạn đang dạy
        </p>
      </div>

      {courses.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Chưa có khóa học nào</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Tạo khóa học đầu tiên (VD: JSB — JavaScript Basic) bằng form bên
            dưới, sau đó mở lớp để học viên tham gia.
          </p>
        </div>
      )}

      {courses.map((course) => {
        const courseClasses = classes.filter((c) => c.course_id === course.id);
        return (
          <section key={course.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge className="rounded-md px-2.5 py-1 font-mono text-xs">
                {course.code}
              </Badge>
              <h2 className="text-lg font-semibold tracking-tight">
                {course.name}
              </h2>
              <span className="text-sm text-muted-foreground">
                {courseClasses.length} lớp
              </span>
            </div>
            {courseClasses.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Chưa có lớp nào — dùng form &quot;Mở lớp mới&quot; bên dưới.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courseClasses.map((cls) => (
                  <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                    <Card className="group h-full gap-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-lg">
                          {cls.class_code}
                          <span className="text-xs font-normal text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            Xem lớp →
                          </span>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-3">
                          <span>📅 {cls.total_sessions} buổi</span>
                          <span>👧 {cls.enrollments[0]?.count ?? 0} học viên</span>
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
            )}
          </section>
        );
      })}

      <section className="space-y-3 border-t pt-6">
        <h2 className="text-lg font-semibold tracking-tight">Tạo mới</h2>
        <div className="grid items-start gap-4 md:grid-cols-2">
          <CourseForm />
          <ClassForm courses={courseOptions} />
        </div>
      </section>
    </div>
  );
}
