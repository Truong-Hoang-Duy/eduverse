import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/get-profile";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireRole("student");

  return (
    // Tab (Sản phẩm / Sản phẩm của lớp / Hướng dẫn) KHÔNG còn ở đây: chúng thuộc
    // từng lớp, nằm trong `classes/[classId]/layout.tsx`.
    <AppShell profile={profile}>{children}</AppShell>
  );
}
