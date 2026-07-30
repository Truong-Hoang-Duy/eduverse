import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMyDriveLink } from "@/lib/actions/drive-link";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

import { DriveLinkForm } from "../../../drive-link-form";
import { ProjectEditor, type ProjectData } from "./project-editor";

export const metadata = { title: "Sản phẩm của tôi — Eduverse" };

export default async function StudentClassProjectsPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const profile = await requireRole("student");
  const supabase = await createClient();

  // Lớp đã được layout xác thực là lớp của em này rồi.
  const [{ data: cls }, { data: project }, driveUrl] = await Promise.all([
    supabase
      .from("classes")
      // Chỉ cần mã khóa để AI gợi ý tính năng đúng trình độ; tên lớp đã có ở
      // tiêu đề của layout nên form không hiện lại nữa.
      .select("courses(code)")
      .eq("id", classId)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("*")
      .eq("class_id", classId)
      .eq("student_id", profile.id)
      .maybeSingle(),
    getMyDriveLink(),
  ]);

  const courseCode =
    (cls?.courses as unknown as { code: string } | null)?.code ?? "";

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">📁 Thư mục nộp bài tập</CardTitle>
          <CardDescription>
            Nơi em upload bài tập các buổi để giáo viên xem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriveLinkForm initialUrl={driveUrl} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Sản phẩm cuối khóa</CardTitle>
          <CardDescription>
            {project
              ? "Chỉnh sửa sản phẩm của bạn"
              : "Chưa có sản phẩm — điền form bên dưới để tạo"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectEditor
            classId={classId}
            courseCode={courseCode}
            project={(project as ProjectData | null) ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
