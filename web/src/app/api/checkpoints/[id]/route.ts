import { NextResponse } from "next/server";

import { loadPublicCheckpoint } from "@/lib/checkpoint-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
  }

  const checkpoint = await loadPublicCheckpoint(id);
  if (!checkpoint) {
    return NextResponse.json({ error: "Not found or not a checkpoint" }, { status: 404 });
  }

  return NextResponse.json({ checkpoint });
}
