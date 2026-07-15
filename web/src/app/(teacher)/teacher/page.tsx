import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import type { Class, Course } from "@/lib/types";

import { ClassForm, type CourseOption } from "./class-form";
import { ClassList, type ClassItem } from "./class-list";
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

  const classItems: ClassItem[] = classes.map((cls) => {
    const course = courses.find((c) => c.id === cls.course_id);
    return {
      id: cls.id,
      classCode: cls.class_code,
      courseId: cls.course_id,
      courseCode: course?.code ?? "",
      courseName: course?.name ?? "",
      totalSessions: cls.total_sessions,
      studentCount: cls.enrollments[0]?.count ?? 0,
      description: cls.description,
    };
  });

  const totalStudents = classItems.reduce((sum, c) => sum + c.studentCount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Khóa học & lớp"
        description="Quản lý các khóa học và lớp bạn đang dạy"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Khóa học"
          value={courses.length}
          hint="Chương trình đang dạy"
        />
        <StatCard label="Lớp" value={classes.length} hint="Lớp đang mở" />
        <StatCard
          label="Học viên"
          value={totalStudents}
          hint="Tổng trên tất cả các lớp"
        />
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Chưa có khóa học nào</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Tạo khóa học đầu tiên (VD: JSB — JavaScript Basic) bằng form bên
            dưới, sau đó mở lớp để học viên tham gia.
          </p>
        </div>
      ) : (
        <ClassList classes={classItems} />
      )}

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
