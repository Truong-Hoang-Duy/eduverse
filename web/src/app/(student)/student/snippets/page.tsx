import { SnippetsManager } from "@/app/(teacher)/teacher/snippets/snippets-manager";
import { PageHeader } from "@/components/page-header";
import { listSnippetsForStudent } from "@/lib/actions/snippets";
import { requireRole } from "@/lib/get-profile";

export const metadata = { title: "Sổ tay Code — CodeLuma" };

export default async function StudentSnippetsPage() {
  const profile = await requireRole("student");
  const snippets = await listSnippetsForStudent(profile.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sổ tay Code"
        description="Các đoạn code mẫu và mẹo sửa lỗi nhanh từ giáo viên — bấm Copy để dán ngay vào bài làm"
      />
      <SnippetsManager initialSnippets={snippets} readOnly />
    </div>
  );
}

