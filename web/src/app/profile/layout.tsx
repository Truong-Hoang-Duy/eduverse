import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/get-profile";

/**
 * Khung app tách khỏi page (giống (teacher)/(student)) để loading.tsx có chỗ
 * bám: nếu AppShell nằm trong page thì khung xương sẽ nháy ra một trang trần
 * không nav, tệ hơn là không có gì.
 */
export default async function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await requireProfile();

  return <AppShell profile={profile}>{children}</AppShell>;
}
