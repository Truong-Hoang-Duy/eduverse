// Nơi DUY NHẤT gọi ai-service. Chỉ import từ server-side code
// (Server Actions / Route Handlers) — không bao giờ từ client component.
import "server-only";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY ?? "";

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export async function callAiService<TResponse>(
  endpoint: string,
  body: unknown
): Promise<TResponse> {
  const res = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": AI_SERVICE_API_KEY,
    },
    body: JSON.stringify(body),
    // Render free có cold start 30-60s → timeout rộng.
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const detail = await res
      .json()
      .then((d: { detail?: string }) => d.detail)
      .catch(() => undefined);
    throw new AiServiceError(
      detail ?? "AI đang bận, thử lại sau ít phút.",
      res.status
    );
  }

  return res.json() as Promise<TResponse>;
}
