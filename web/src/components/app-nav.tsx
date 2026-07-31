import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { isAdminUsername } from "@/lib/admin-access";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

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

  // Giáo viên có 3-4 mục tiếng Việt; cộng logo, nút đổi giao diện và avatar thì
  // KHÔNG đủ chỗ trên một hàng ~360px — chúng đè lên nhau (lỗi đã thấy trên máy
  // user). Cho nav xuống hàng riêng trên điện thoại. Học viên chỉ có 1 mục nên
  // vẫn để cùng hàng, đẩy xuống là phí nguyên một dòng của màn hình nhỏ.
  const stackOnMobile = links.length > 2;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      {/* Dùng `order` thay vì render NavLinks hai lần: giữ đúng MỘT client
          component, và thứ tự đọc bằng bàn phím vẫn là logo → nav → tài khoản. */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 sm:flex-nowrap sm:gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <BrandMark />
          {/* Ẩn chữ trên điện thoại để nav không tràn — logo là đủ nhận diện. */}
          <span className="hidden text-base font-bold tracking-tight sm:inline">
            Eduverse
          </span>
        </Link>

        {links.length > 0 && (
          <div
            className={cn(
              "min-w-0 sm:order-2 sm:w-auto sm:flex-1 sm:pl-2",
              stackOnMobile ? "order-3 w-full" : "order-2 flex-1"
            )}
          >
            <NavLinks links={links} />
          </div>
        )}

        <div
          className={cn(
            "flex shrink-0 items-center gap-2 sm:order-3 sm:ml-0",
            // Nav đã xuống hàng dưới thì cụm này phải tự đẩy sang phải.
            stackOnMobile ? "order-2 ml-auto" : "order-3"
          )}
        >
          <ThemeToggle />
          <UserMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}
