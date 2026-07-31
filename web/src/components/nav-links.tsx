"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavLinkLabel } from "@/components/nav-link-label";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
  /** Chỉ sáng khi URL trùng khít, không tính trang con. */
  exact?: boolean;
}

export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  // Link khớp dài nhất thắng (VD /teacher/settings không làm sáng cả /teacher).
  const activeHref = links
    .filter((l) =>
      l.exact
        ? pathname === l.href
        : pathname === l.href || pathname.startsWith(`${l.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    // Lưới an toàn cho máy hẹp hơn ~360px: 4 mục vẫn tràn dù đã xuống hàng
    // riêng, nên cho cuộn ngang thay vì để chúng đè lên nhau. `scrollbar-none`
    // không có trong Tailwind mặc định — giấu thanh cuộn bằng utility dưới đây.
    <nav className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((link) => {
        const active = link.href === activeHref;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              // px nhỏ hơn trên điện thoại: đủ để 4 mục tiếng Việt vừa một hàng
              // ngang màn hình, vẫn giữ vùng bấm cao 32px cho ngón tay.
              "shrink-0 rounded-md px-2.5 py-1.5 font-medium whitespace-nowrap transition-colors sm:px-3",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <NavLinkLabel>{link.label}</NavLinkLabel>
          </Link>
        );
      })}
    </nav>
  );
}
