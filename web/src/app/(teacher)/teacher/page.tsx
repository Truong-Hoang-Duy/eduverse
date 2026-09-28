import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { isClassCompleted } from "@/lib/class-completion";
import { createClient } from "@/lib/supabase/server";
import type { Class, Course } from "@/lib/types";

import { ClassForm, type CourseOption } from "./class-form";
import { ClassList, type ClassItem } from "./class-list";
import { CourseForm } from "./course-form";
import { type ExistingReview, isHandled } from "./sessions/[id]/review-status";

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

  // Gom cả 3 query ban đầu (courses, classes, sessions) vào một Promise.all song song
  // để loại bỏ 1 roundtrip mạng tuần tự (tiết kiệm 100-200ms khi tải trang).
  const [{ data: coursesData }, { data: classesData }, { data: sessionsData }] =
    await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase
        .from("classes")
        .select("*, enrollments(count)")
        .order("class_code"),
      supabase.from("sessions").select("id, class_id, session_number"),
    ]);

  const courses = (coursesData ?? []) as Course[];
  const classes = (classesData ?? []) as ClassRow[];

  const lastSessionIdByClass = new Map<string, string>();
  for (const cls of classes) {
    const last = (sessionsData ?? []).find(
      (s) => s.class_id === cls.id && s.session_number === cls.total_sessions
    );
    if (last) lastSessionIdByClass.set(cls.id, last.id);
  }

  const lastSessionIds = [...lastSessionIdByClass.values()];
  const { data: lastReviewsData } = lastSessionIds.length
    ? await supabase
        .from("student_reviews")
        .select("session_id, strengths, improvements, ai_generated_comment, is_absent")
        .in("session_id", lastSessionIds)
    : { data: [] };

  const handledCountBySession = new Map<string, number>();
  for (const row of (lastReviewsData ?? []) as (ExistingReview & {
    session_id: string;
  })[]) {
    if (!isHandled(row)) continue;
    handledCountBySession.set(
      row.session_id,
      (handledCountBySession.get(row.session_id) ?? 0) + 1
    );
  }

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
    const studentCount = cls.enrollments[0]?.count ?? 0;
    const lastSessionId = lastSessionIdByClass.get(cls.id);
    return {
      id: cls.id,
      classCode: cls.class_code,
      courseId: cls.course_id,
      courseCode: course?.code ?? "",
      courseName: course?.name ?? "",
      courseDescription: course?.description ?? null,
      totalSessions: cls.total_sessions,
      studentCount,
      description: cls.description,
      completed: isClassCompleted({
        studentCount,
        handledCount: lastSessionId
          ? (handledCountBySession.get(lastSessionId) ?? 0)
          : 0,
      }),
    };
  });

  const totalStudents = classItems.reduce((sum, c) => sum + c.studentCount, 0);
  const activeCount = classItems.filter((c) => !c.completed).length;
  const completedCount = classItems.length - activeCount;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Khóa học & lớp"
        description="Quản lý các khóa học và lớp bạn đang dạy"
        action={
          <div className="flex gap-2">
            <CourseForm />
            <ClassForm courses={courseOptions} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Khóa học"
          value={courses.length}
          hint="Chương trình đang dạy"
        />
        <StatCard
          label="Lớp đang học"
          value={activeCount}
          hint={
            completedCount > 0
              ? `${completedCount} lớp đã hoàn thành`
              : "Lớp đang mở"
          }
        />
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
    </div>
  );
}
