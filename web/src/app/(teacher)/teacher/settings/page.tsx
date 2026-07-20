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

import { OptionManager } from "./option-manager";
import { TemplateManager } from "./template-manager";

export const metadata = { title: "Cài đặt — Eduverse" };

export default async function SettingsPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  const [{ data: options }, { data: templates }] = await Promise.all([
    supabase
      .from("review_options")
      .select("id, category, label, skill_group")
      .eq("teacher_id", profile.id)
      .order("label"),
    supabase
      .from("zalo_templates")
      .select("id, name, template_text")
      .eq("teacher_id", profile.id)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt"
        description="Danh mục nhận xét và mẫu tin Zalo dùng chung cho mọi lớp"
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Danh mục nhận xét</CardTitle>
          <CardDescription>
            Các lựa chọn hiện ra khi nhận xét học viên trong từng buổi học
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OptionManager options={options ?? []} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Mẫu tin Zalo</CardTitle>
          <CardDescription>
            Khung tin nhắn để AI ghép nội dung tổng hợp tình hình lớp vào
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateManager templates={templates ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
