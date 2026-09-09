import type { ReactNode } from "react";

import { AppFooter } from "@/components/app-footer";
import { AppNav } from "@/components/app-nav";
import { ScrollToTop } from "@/components/scroll-to-top";
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
    <div className="flex min-h-screen flex-col bg-background relative overflow-hidden">
      {/* Decorative background glows for glassmorphism */}
      <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 flex min-h-screen flex-col w-full">
        <AppNav profile={profile} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <AppFooter />
      </div>
      <ScrollToTop />
    </div>
  );
}
