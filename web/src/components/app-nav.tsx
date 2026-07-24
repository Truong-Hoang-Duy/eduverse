import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { isAdminUsername } from "@/lib/admin-access";
import type { Profile } from "@/lib/types";

const TEACHER_LINKS = [
  { href: "/teacher", label: "Lớp học" },
  { href: "/teacher/assignments", label: "Chấm bài" },
  { href: "/teacher/gallery", label: "Sản phẩm" },
];

// Chỉ hiện cho username khai trong ADMIN_USERNAMES. Ẩn link chỉ là cho gọn nav
// — chặn thật nằm ở `requireAdmin()` trong chính trang đó.
const ADMIN_LINK = { href: "/teacher/admin", label: "Vận hành" };

// Học viên: 3 tab (student-tabs.tsx) là con của "Lớp học" nên nav này sáng
// suốt cả khu /student/* — không dùng exact.
const STUDENT_LINKS = [{ href: "/student", label: "Lớp học" }];

export function AppNav({ profile }: { profile: Profile }) {
  const links =
    profile.role === "teacher"
      ? isAdminUsername(profile.username)
        ? [...TEACHER_LINKS, ADMIN_LINK]
        : TEACHER_LINKS
      : STUDENT_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <BrandMark />
            {/* Ẩn chữ trên điện thoại để nav không tràn — logo là đủ nhận diện. */}
            <span className="hidden text-base font-bold tracking-tight sm:inline">
              Eduverse
            </span>
          </Link>
          {links.length > 0 && <NavLinks links={links} />}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}
