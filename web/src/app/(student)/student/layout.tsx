import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { StudentTabs } from "@/components/student-tabs";
import { requireRole } from "@/lib/get-profile";

export default async function StudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireRole("student");

  return (
    <AppShell profile={profile}>
      <StudentTabs />
      {children}
    </AppShell>
  );
}
