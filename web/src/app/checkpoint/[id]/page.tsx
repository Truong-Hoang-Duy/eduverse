import { redirect } from "next/navigation";

export default async function CheckpointRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/checkpoints/${id}`);
}
