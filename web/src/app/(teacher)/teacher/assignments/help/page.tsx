import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { GradingTabs } from "../grading-tabs";
import type { AssignmentChoice, CourseChoice } from "../grading-tool";
import { HelpTool } from "./help-tool";

export const metadata = { title: "Hỏi bài — Eduverse" };

interface AssignmentRow {
  id: string;
  course_id: string;
  session_number: number;
  title: string;
}

export default async function HelpPage() {
  const supabase = await createClient();

  const [{ data: coursesData }, { data: assignmentsData }] = await Promise.all([
    supabase.from("courses").select("id, code, name").order("code"),
    supabase
      .from("assignments")
      .select("id, course_id, session_number, title")
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
      <div className="space-y-4">
        <PageHeader
          title="Chấm bài"
          description="Gợi ý cho học viên đang bí — không chấm điểm"
        />
        <GradingTabs />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">💡 Gợi ý làm bài cho học viên</CardTitle>
          <CardDescription>
            Em chưa biết bắt đầu thì chọn đề rồi bấm luôn; em gửi bài đang dở thì
            nạp code hoặc ảnh chụp màn hình vào. Kết quả có nút copy để dán lại
            cho em, không được lưu lại
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HelpTool courses={courses} assignments={assignmentChoices} />
        </CardContent>
      </Card>
    </div>
  );
}
