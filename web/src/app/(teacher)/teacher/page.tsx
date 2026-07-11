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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Khóa học & lớp của tôi</h1>

      {courses.length === 0 && (
        <p className="text-muted-foreground">
          Chưa có khóa học nào — tạo khóa học đầu tiên (VD: JSB — JavaScript
          Basic), sau đó mở lớp cho học viên tham gia.
        </p>
      )}

      {courses.map((course) => {
        const courseClasses = classes.filter((c) => c.course_id === course.id);
        return (
          <section key={course.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {course.code} — {course.name}
              </h2>
              <Badge variant="secondary">{courseClasses.length} lớp</Badge>
            </div>
            {courseClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có lớp nào trong khóa này.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {courseClasses.map((cls) => (
                  <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                    <Card className="transition-colors hover:border-primary">
                      <CardHeader>
                        <CardTitle>{cls.class_code}</CardTitle>
                        <CardDescription>
                          {cls.total_sessions} buổi ·{" "}
                          {cls.enrollments[0]?.count ?? 0} học viên
                        </CardDescription>
                      </CardHeader>
                      {cls.description && (
                        <CardContent className="text-sm text-muted-foreground">
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

      <div className="grid gap-4 md:grid-cols-2">
        <CourseForm />
        <ClassForm courses={courseOptions} />
      </div>
    </div>
  );
}
