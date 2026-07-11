import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { ClassWithCourse, EnrollmentWithStudent } from "@/lib/types";

import { DeleteClassButton } from "./delete-class-button";
import {
  StudentsTable,
  type ClassOption,
  type StudentRow,
} from "./students-table";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: classData }, { data: enrollmentsData }, { data: allClasses }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("*, courses(code, name)")
        .eq("id", id)
        .single(),
      supabase
        .from("enrollments")
        .select("*, profiles(id, full_name, age, school)")
        .eq("class_id", id)
        .order("joined_at"),
      supabase.from("classes").select("id, class_code").order("class_code"),
    ]);

  if (!classData) {
    notFound();
  }

  const cls = classData as ClassWithCourse;
  const enrollments = (enrollmentsData ?? []) as EnrollmentWithStudent[];

  const students: StudentRow[] = enrollments
    .filter((e) => e.profiles !== null)
    .map((e) => ({
      enrollmentId: e.id,
      studentId: e.profiles!.id,
      fullName: e.profiles!.full_name,
      age: e.profiles!.age,
      school: e.profiles!.school,
    }));

  const otherClasses: ClassOption[] = (
    (allClasses ?? []) as { id: string; class_code: string }[]
  )
    .filter((c) => c.id !== id)
    .map((c) => ({ id: c.id, classCode: c.class_code }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/teacher"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Quay lại danh sách lớp
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold">
            Lớp {cls.class_code}
            <Badge variant="secondary">
              {cls.courses ? `${cls.courses.code} — ${cls.courses.name}` : ""}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {cls.total_sessions} buổi · {students.length} học viên
            {cls.description ? ` · ${cls.description}` : ""}
          </p>
        </div>
        <DeleteClassButton classId={cls.id} classCode={cls.class_code} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách học viên</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentsTable
            classId={cls.id}
            students={students}
            otherClasses={otherClasses}
          />
        </CardContent>
      </Card>
    </div>
  );
}
