"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavLinkLabel } from "@/components/nav-link-label";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/teacher/assignments", label: "Bài tập hàng ngày", exact: true },
  { href: "/teacher/assignments/project", label: "Sản phẩm cuối khóa" },
  { href: "/teacher/assignments/help", label: "Hỏi bài" },
];

/** Ba công cụ nằm chung nav "Chấm bài" — dùng Link nên URL chia sẻ được. */
export function GradingTabs() {
  const pathname = usePathname();

  // "Bài tập hàng ngày" phải `exact`, không thì nó sáng cả khi ở trang con.
  const activeHref = TABS.filter((t) =>
    t.exact ? pathname === t.href : pathname.startsWith(t.href)
  ).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
      {TABS.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <NavLinkLabel>{tab.label}</NavLinkLabel>
          </Link>
        );
      })}
    </div>
  );
}
