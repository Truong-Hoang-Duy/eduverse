import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  extractAttachmentPaths,
  getDisplayFileName,
} from "@/lib/assignment-utils";
import { createClient } from "@/lib/supabase/server";

import { AssignmentForm } from "./assignment-form";
import { GradingTabs } from "./grading-tabs";
import {
  GradingTool,
  type AssignmentChoice,
  type CourseChoice,
} from "./grading-tool";
import { SavedAssignments, type SavedAssignment } from "./saved-assignments";

export const metadata = { title: "Chấm bài — Eduverse" };

interface AssignmentRow {
  id: string;
  course_id: string;
  session_number: number;
  title: string;
  spec_file_path: string | null;
  instructions: string | null;
}

export default async function AssignmentsPage() {
  const supabase = await createClient();

  const [{ data: coursesData }, { data: assignmentsData }] = await Promise.all([
    supabase.from("courses").select("id, code, name").order("code"),
    supabase
      .from("assignments")
      .select(
        "id, course_id, session_number, title, spec_file_path, instructions"
      )
      .order("session_number"),
  ]);

  const courses = (coursesData ?? []) as CourseChoice[];
  const assignments = (assignmentsData ?? []) as AssignmentRow[];

  const savedAssignments: SavedAssignment[] = assignments.map((a) => {
    const attPaths = extractAttachmentPaths(a.instructions, null);
    return {
      id: a.id,
      courseId: a.course_id,
      sessionNumber: a.session_number,
      title: a.title,
      specFilePath: a.spec_file_path,
      specFileName: a.spec_file_path
        ? getDisplayFileName(a.spec_file_path)
        : undefined,
      attachmentCount: attPaths.length,
      attachmentNames: attPaths.map(getDisplayFileName),
    };
  });

  const assignmentChoices: AssignmentChoice[] = assignments.map((a) => ({
    id: a.id,
    courseId: a.course_id,
    courseCode: courses.find((c) => c.id === a.course_id)?.code ?? "",
    sessionNumber: a.session_number,
    title: a.title,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageHeader
          title="Chấm bài"
          description="Chấm bài tập hàng ngày — chọn khóa và đề, tải file bài làm lên"
          action={
            courses.length > 0 ? (
              <AssignmentForm
                courses={courses}
                existingAssignments={savedAssignments}
              />
            ) : null
          }
        />
        <GradingTabs />
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

          <SavedAssignments courses={courses} assignments={savedAssignments} />
        </>
      )}
    </div>
  );
}
