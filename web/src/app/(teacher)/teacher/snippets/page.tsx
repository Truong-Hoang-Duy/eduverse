import { PageHeader } from "@/components/page-header";
import { listMySnippets } from "@/lib/actions/snippets";
import { requireRole } from "@/lib/get-profile";

import { SnippetsManager } from "./snippets-manager";

export const metadata = { title: "Sổ tay Code — CodeLuma" };

export default async function SnippetsPage() {
  const profile = await requireRole("teacher");
  const snippets = await listMySnippets(profile.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sổ tay Code"
        description="Lưu trữ các đoạn code mẫu và câu lệnh thường dùng theo 5 môn học — bấm Copy để gửi nhanh cho học viên"
      />
      <SnippetsManager initialSnippets={snippets} />
    </div>
  );
}

