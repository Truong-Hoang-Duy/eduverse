import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

import { ProjectEditor, type ProjectData } from "./project-editor";

export const metadata = { title: "Sản phẩm cuối khóa — Eduverse" };

interface EnrollmentRow {
  classes: {
    id: string;
    class_code: string;
    courses: { code: string } | null;
  } | null;
}

export default async function StudentProjectsPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const [{ data: enrollmentsData }, { data: projectsData }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("classes(id, class_code, courses(code))")
      .eq("student_id", profile.id),
    supabase
      .from("projects")
      .select("*")
      .eq("student_id", profile.id),
  ]);

  const enrollments = (enrollmentsData ?? []) as unknown as EnrollmentRow[];
  const projects = (projectsData ?? []) as ProjectData[] &
    { class_id: string }[];

  const classes = enrollments
    .map((e) => e.classes)
    .filter((c): c is NonNullable<EnrollmentRow["classes"]> => c !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sản phẩm cuối khóa"
        description="Khai báo dự án cuối khóa của bạn cho từng lớp"
      />

      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Bạn chưa tham gia lớp nào</p>
        </div>
      ) : (
        classes.map((cls) => {
          const project =
            (projects.find(
              (p) => (p as unknown as { class_id: string }).class_id === cls.id
            ) as ProjectData | undefined) ?? null;
          return (
            <Card key={cls.id} className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  Lớp {cls.class_code}
                </CardTitle>
                <CardDescription>
                  {project
                    ? "Chỉnh sửa sản phẩm của bạn"
                    : "Chưa có sản phẩm — điền form bên dưới để tạo"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectEditor
                  classId={cls.id}
                  classCode={cls.class_code}
                  courseCode={cls.courses?.code ?? ""}
                  project={project}
                />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
