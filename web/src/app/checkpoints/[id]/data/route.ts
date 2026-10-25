import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { loadPublicCheckpoint } from "@/lib/checkpoint-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing identifier" }, { status: 400 });
  }

  const checkpoint = await loadPublicCheckpoint(id);
  if (!checkpoint) {
    return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const targetFileName = url.searchParams.get("file");

  const attachmentFiles = checkpoint.files.filter((f) => !f.isMain);
  if (attachmentFiles.length === 0) {
    return NextResponse.json(
      { error: "Đề bài này không có tệp dữ liệu đính kèm" },
      { status: 404 }
    );
  }

  const targetFile = targetFileName
    ? attachmentFiles.find((f) => f.fileName === targetFileName) ??
      attachmentFiles[0]
    : attachmentFiles[0];

  if (targetFile?.url) {
    redirect(targetFile.url);
  }

  return NextResponse.json(
    { error: "Không tìm thấy đường dẫn tải tệp" },
    { status: 404 }
  );
}
