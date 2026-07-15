import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import type { Profile } from "@/lib/types";

const TEACHER_LINKS = [
  { href: "/teacher", label: "Lớp học" },
  { href: "/teacher/assignments", label: "Chấm bài" },
];

// Học viên điều hướng bằng tab (student-tabs.tsx), nav chỉ còn logo + menu tài khoản.
const STUDENT_LINKS: { href: string; label: string }[] = [];

export function AppNav({ profile }: { profile: Profile }) {
  const links = profile.role === "teacher" ? TEACHER_LINKS : STUDENT_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark />
            <span className="text-base font-bold tracking-tight">Eduverse</span>
          </Link>
          {links.length > 0 && <NavLinks links={links} />}
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}
