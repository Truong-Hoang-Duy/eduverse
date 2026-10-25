"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { PublicCheckpointPayload } from "@/lib/checkpoint-data";

import { PublicCheckpointView } from "./checkpoint-view";

export function CheckpointClientLoader({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [checkpoint, setCheckpoint] = useState<PublicCheckpointPayload | null>(
    null
  );

  useEffect(() => {
    let ignore = false;
    async function fetchCheckpoint() {
      try {
        setLoading(true);
        const res = await fetch(`/api/checkpoints/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (!ignore) setCheckpoint(null);
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setCheckpoint(data.checkpoint ?? null);
        }
      } catch {
        if (!ignore) setCheckpoint(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchCheckpoint();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-6 shadow-xs">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-8 w-3/4 rounded-md" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-6 shadow-xs">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  if (!checkpoint) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md space-y-4 rounded-2xl border border-border/80 bg-card p-8 text-center shadow-lg">
          <span className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-muted text-3xl">
            🔒
          </span>
          <h1 className="text-xl font-bold tracking-tight">
            Đề bài không khả dụng
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Đường dẫn này không tồn tại hoặc đề bài này chưa được mở quyền xem công khai cho học viên (chỉ các đề bài có tiêu đề chứa từ khóa Checkpoints mới hỗ trợ xem công khai).
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
            >
              <span>← Về trang chủ</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <PublicCheckpointView checkpoint={checkpoint} />;
}
