import type { ReactNode } from "react";

import { Progress } from "@/components/ui/progress";

/** Thẻ số liệu: nhãn nhỏ viết hoa, số lớn, chú thích, tuỳ chọn thanh tiến độ. */
export function StatCard({
  label,
  value,
  hint,
  progress,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  /** 0-100; có giá trị thì hiện thanh tiến độ thay cho hint. */
  progress?: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-bold tracking-tight">{value}</p>
      {progress !== undefined ? (
        <Progress value={progress} className="mt-3 h-1.5" />
      ) : null}
      {hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
