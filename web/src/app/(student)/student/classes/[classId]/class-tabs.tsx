"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavLinkLabel } from "@/components/nav-link-label";
import { cn } from "@/lib/utils";

/**
 * Tab của MỘT lớp. Trước đây 3 tab này ở cấp toàn khu học viên nên học viên học
 * nhiều lớp thấy sản phẩm các lớp trộn lẫn (user phản ánh 2026-07-30) — giờ mỗi
 * lớp có bộ tab riêng, URL mang `classId` nên chia sẻ/bookmark được từng lớp.
 */
export function ClassTabs({ classId }: { classId: string }) {
  const pathname = usePathname();
  const base = `/student/classes/${classId}`;

  const tabs = [
    { href: `${base}/projects`, label: "Sản phẩm của tôi" },
    { href: `${base}/gallery`, label: "Sản phẩm của lớp" },
    { href: `${base}/guide`, label: "Hướng dẫn" },
  ];

  const activeHref = tabs
    .filter((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
      {tabs.map((tab) => {
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
