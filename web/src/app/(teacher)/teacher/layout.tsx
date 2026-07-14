import type { ReactNode } from "react";

import { AppNav } from "@/components/app-nav";
import { requireRole } from "@/lib/get-profile";

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireRole("teacher");

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav profile={profile} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
