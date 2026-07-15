"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/student", label: "Lớp của tôi" },
  { href: "/student/projects", label: "Sản phẩm" },
  { href: "/student/gallery", label: "Sản phẩm của lớp" },
  { href: "/student/guide", label: "Hướng dẫn" },
];

/** Tab chuyển giữa các khu vực của học viên (dùng Link nên URL chia sẻ được). */
export function StudentTabs() {
  const pathname = usePathname();
  // Link khớp dài nhất thắng, tránh /student làm sáng cả /student/projects.
  const activeHref = TABS.filter(
    (t) => pathname === t.href || pathname.startsWith(`${t.href}/`)
  ).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
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
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
