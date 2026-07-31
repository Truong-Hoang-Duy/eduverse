import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

import { ClassTabs } from "./class-tabs";

/**
 * Khung của một lớp: chặn học viên KHÔNG học lớp này, rồi hiện tiêu đề lớp + tab.
 * RLS đã chặn ở tầng dữ liệu, đây là lớp phụ để trả 404 cho gọn thay vì hiện
 * trang trống.
 */
export default async function StudentClassLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const profile = await requireRole("student");
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("class_id, classes(class_code, total_sessions, courses(code, name))")
    .eq("class_id", classId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (!enrollment) notFound();

  const cls = enrollment.classes as unknown as {
    class_code: string;
    total_sessions: number;
    courses: { code: string; name: string } | null;
  } | null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/student">← Quay lại danh sách lớp</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Lớp {cls?.class_code ?? ""}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {cls?.courses?.name ?? "Khóa học"} · {cls?.total_sessions ?? 0} buổi
          </p>
        </div>
      </div>

      <ClassTabs classId={classId} />

      {children}
    </div>
  );
}
