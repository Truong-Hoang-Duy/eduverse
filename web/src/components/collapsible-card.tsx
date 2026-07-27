import type { ReactNode } from "react";

/** Khối nội dung thu gọn bằng `<details>` — ĐÓNG mặc định, bấm tiêu đề mới mở
 *  (`defaultOpen` để mở sẵn). Native HTML nên chạy được trong Server Component,
 *  nội dung vẫn trong DOM khi đóng nên state/action của con không mất.
 *
 *  Nút hành động (dialog...) nên đặt TRONG `children`, KHÔNG đặt ở summary —
 *  bấm bất cứ đâu trong summary đều toggle details. */
export function CollapsibleCard({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-xl border bg-card shadow-sm"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-base font-semibold tracking-tight">{title}</p>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <span className="mt-1 shrink-0 text-sm text-muted-foreground transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}
