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
  let res: Response;
  try {
    res = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AI_SERVICE_API_KEY,
      },
      body: JSON.stringify(body),
      // Giới hạn 55s: Chủ động timeout trước mốc 60s của Vercel Serverless Function,
      // đảm bảo Server Action luôn trả về JSON có kiểm soát thay vì bị Vercel kill với 504 HTML.
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err: unknown) {
    const errorName = err instanceof Error ? err.name : "";
    if (errorName === "TimeoutError" || errorName === "AbortError") {
      throw new AiServiceError(
        "Máy chủ AI mất hơn 55 giây chưa phản hồi (có thể đang khởi động lại từ giấc ngủ đông trên Render). Vui lòng đợi 30 giây và bấm thử lại.",
        504
      );
    }
    throw new AiServiceError(
      "Không thể kết nối đến máy chủ AI (Render/mạng gián đoạn). Vui lòng thử lại sau.",
      503
    );
  }

  if (!res.ok) {
    const detail = await res
      .json()
      .then((d: { detail?: string }) => d.detail)
      .catch(() => undefined);
    throw new AiServiceError(
      detail ?? `AI trả về mã lỗi ${res.status}. Vui lòng thử lại sau ít phút.`,
      res.status
    );
  }

  return res.json() as Promise<TResponse>;
}
