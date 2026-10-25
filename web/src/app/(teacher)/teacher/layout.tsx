import type { ReactNode } from "react";

import { AiWarmup } from "@/components/ai-warmup";
import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/get-profile";

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireRole("teacher");

  return (
    <AppShell profile={profile}>
      <AiWarmup />
      {children}
    </AppShell>
  );
}
