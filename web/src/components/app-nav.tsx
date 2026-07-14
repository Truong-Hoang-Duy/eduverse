import Link from "next/link";

import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import type { Profile } from "@/lib/types";

const TEACHER_LINKS = [
  { href: "/teacher", label: "Lớp học" },
  { href: "/profile", label: "Hồ sơ" },
];

const STUDENT_LINKS = [
  { href: "/student", label: "Lớp của tôi" },
  { href: "/profile", label: "Hồ sơ" },
];

export function AppNav({ profile }: { profile: Profile }) {
  const links = profile.role === "teacher" ? TEACHER_LINKS : STUDENT_LINKS;
  const initial = profile.full_name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              E
            </span>
            <span className="text-base font-bold tracking-tight">Eduverse</span>
          </Link>
          <NavLinks links={links} />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {initial}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {profile.role === "teacher" ? "Giáo viên" : "Học viên"}
              </p>
            </div>
          </div>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Đăng xuất
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
