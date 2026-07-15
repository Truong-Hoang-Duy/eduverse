import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/get-profile";

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireRole("teacher");

  return <AppShell profile={profile}>{children}</AppShell>;
}
