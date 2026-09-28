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
  const [{ data: project }, driveUrl] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("class_id", classId)
      .eq("student_id", profile.id)
      .maybeSingle(),
    getMyDriveLink(),
  ]);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">📁 Thư mục nộp bài</CardTitle>
          <CardDescription>
            Em sẽ tải tất cả bài tập (CP1, CP2, SPCK) vào đây. Giáo viên và các
            bạn sẽ theo dõi tại đường dẫn này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriveLinkForm initialUrl={driveUrl} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <ProjectEditor
          classId={classId}
          project={(project as ProjectData | null) ?? null}
        />
      </Card>
    </div>
  );
}
