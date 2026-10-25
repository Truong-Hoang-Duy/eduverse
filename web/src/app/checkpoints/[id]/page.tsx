import type { Metadata } from "next";
import Link from "next/link";

import { loadPublicCheckpoint } from "@/lib/checkpoint-data";

import { PublicCheckpointView } from "./checkpoint-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const checkpoint = await loadPublicCheckpoint(id);

  return {
    title: checkpoint
      ? `${checkpoint.title} — Eduverse`
      : "Đề bài không khả dụng — Eduverse",
    robots: { index: false, follow: false },
  };
}

export default async function CheckpointPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const checkpoint = await loadPublicCheckpoint(id);

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
