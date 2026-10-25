import type { Metadata } from "next";

import { redirect } from "next/navigation";

import {
  loadCheckpointTitle,
  loadPublicCheckpoint,
} from "@/lib/checkpoint-data";

import { CheckpointClientLoader } from "./checkpoint-client-loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const title = await loadCheckpointTitle(id);

  return {
    title: title ? `${title} — Eduverse` : "Đề bài không khả dụng — Eduverse",
    robots: { index: false, follow: false },
  };
}

export default async function CheckpointPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;

  const checkpoint = await loadPublicCheckpoint(id);
  const mainFile =
    checkpoint?.files.find((f) => f.isMain) ?? checkpoint?.files[0];

  // Nếu file đề là PDF, KHÔNG có tệp đính kèm bổ sung và không yêu cầu xem dạng
  // trang web (?view=web), mở trực tiếp file PDF toàn màn hình native.
  // Khi đề có tệp đính kèm (CSV, JSON, code mẫu...) phải hiển thị trang web để
  // học viên điều hướng xem/tải toàn bộ các tệp.
  const hasAttachments = checkpoint?.files.some((f) => !f.isMain) ?? false;
  if (
    mainFile?.kind === "pdf" &&
    mainFile.url &&
    !hasAttachments &&
    view !== "web"
  ) {
    redirect(mainFile.url);
  }

  return <CheckpointClientLoader id={id} />;
}
