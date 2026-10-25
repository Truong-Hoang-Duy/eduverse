import { NextResponse } from "next/server";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

export const maxDuration = 60;

/**
 * Endpoint đánh thức ngầm (warm-up) ai-service trên Render.
 * Trả về phản hồi ngay lập tức cho client để không gây giật lag giao diện,
 * đồng thời kích hoạt request ngầm đến Render /health để đánh thức máy chủ.
 */
export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50_000);

    // Kích hoạt request thức dậy ngầm tới Render
    fetch(`${AI_SERVICE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          console.warn("[ai-warmup] Health check returned status:", res.status);
        }
      })
      .catch(() => {
        // Lỗi timeout hoặc network trong nền không cần throw ra ngoài
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return NextResponse.json({ ok: true, message: "Warmup initiated" });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Warmup failed" },
      { status: 500 }
    );
  }
}
