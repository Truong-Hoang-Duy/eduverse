import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import type { CourseChoice } from "../assignment-form";
import { GradingTabs } from "../grading-tabs";
import { ProjectReviewTool } from "./project-review-tool";

export const metadata = { title: "Chấm sản phẩm cuối khóa — Eduverse" };

export default async function ProjectReviewPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, code, name")
    .order("code");

  const courses = (data ?? []) as CourseChoice[];

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <PageHeader
          title="Chấm bài"
          description="Nhận xét sản phẩm cuối khóa — không đề bài, không điểm số"
        />
        <GradingTabs />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">✨ Nhận xét sản phẩm cuối khóa</CardTitle>
          <CardDescription>
            Thả cả thư mục sản phẩm vào, AI nhận xét tổng thể. Kết quả chỉ hiện để
            copy, không được lưu lại
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectReviewTool courses={courses} />
        </CardContent>
      </Card>
    </div>
  );
}
