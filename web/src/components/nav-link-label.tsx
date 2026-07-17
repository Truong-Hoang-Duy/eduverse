"use client";

import { Loader2Icon } from "lucide-react";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/**
 * Nhãn link kèm spinner trong lúc đang chuyển trang.
 *
 * PHẢI render BÊN TRONG <Link>: useLinkStatus đọc context do chính Link cấp,
 * gọi ở component khai báo Link sẽ luôn trả pending=false — không lỗi, chỉ im
 * lặng sai.
 *
 * Spinner đè overlay thay vì chèn inline để nav không bị giãn ra rồi co lại
 * (các pill rộng theo nội dung).
 */
export function NavLinkLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={pending ? "opacity-25" : undefined}>{children}</span>
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2Icon
            className="size-3.5 animate-spin"
            role="status"
            aria-label="Đang chuyển trang"
          />
        </span>
      ) : null}
    </span>
  );
}
