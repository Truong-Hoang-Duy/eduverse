import type { ReactNode } from "react";

import { AppFooter } from "@/components/app-footer";
import { AppNav } from "@/components/app-nav";
import type { Profile } from "@/lib/types";

/** Khung chung mọi trang đã đăng nhập: nav + nội dung + footer. */
export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppNav profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <AppFooter />
    </div>
  );
}
