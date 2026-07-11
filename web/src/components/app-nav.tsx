import Link from "next/link";

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

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            Eduverse
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {profile.full_name}
            {profile.role === "teacher" ? " (GV)" : ""}
          </span>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              Đăng xuất
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
