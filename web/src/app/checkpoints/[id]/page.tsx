import type { Metadata } from "next";

import { loadCheckpointTitle } from "@/lib/checkpoint-data";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CheckpointClientLoader id={id} />;
}
