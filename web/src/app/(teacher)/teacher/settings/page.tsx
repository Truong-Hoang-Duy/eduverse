import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { listMyCombos } from "@/lib/actions/review-combos";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

import { ComboManager } from "./combo-manager";
import { OptionManager } from "./option-manager";
import { TemplateManager } from "./template-manager";

export const metadata = { title: "Cài đặt — Eduverse" };

/** Khối cài đặt thu gọn — ĐÓNG mặc định, bấm tiêu đề mới mở (yêu cầu user
 *  2026-07-27, cho trang gọn). Dùng `<details>` như các accordion khác. Nội
 *  dung vẫn nằm trong DOM khi đóng nên state/action của manager bên trong
 *  không bị mất. */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-base font-semibold tracking-tight">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="mt-1 shrink-0 text-sm text-muted-foreground transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}

export default async function SettingsPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  const [{ data: options }, { data: templates }, combos] = await Promise.all([
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
    listMyCombos(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cài đặt"
        description="Danh mục nhận xét, bộ combo và mẫu tin Zalo dùng chung cho mọi lớp"
      />

      <SettingsSection
        title="Danh mục nhận xét"
        description="Các lựa chọn hiện ra khi nhận xét học viên trong từng buổi học"
      >
        <OptionManager options={options ?? []} />
      </SettingsSection>

      <SettingsSection
        title="Bộ combo nhận xét"
        description="Gom sẵn nhiều điểm mạnh / cần cải thiện thành từng bộ đặt tên"
      >
        <ComboManager combos={combos} options={options ?? []} />
      </SettingsSection>

      <SettingsSection
        title="Mẫu tin Zalo"
        description="Khung tin nhắn để AI ghép nội dung tổng hợp tình hình lớp vào"
      >
        <TemplateManager templates={templates ?? []} />
      </SettingsSection>
    </div>
  );
}
