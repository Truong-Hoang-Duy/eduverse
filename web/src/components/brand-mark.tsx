import { cn } from "@/lib/utils";

/** Logo Eduverse — mũ tốt nghiệp cách điệu. Dùng chung nav + trang auth. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[55%]"
        aria-hidden
      >
        <path d="M12 4 2 9l10 5 10-5-10-5Z" />
        <path d="M6 11v4c0 1 2.5 2.5 6 2.5s6-1.5 6-2.5v-4" />
        <path d="M22 9v5" />
      </svg>
    </span>
  );
}
