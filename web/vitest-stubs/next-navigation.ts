/**
 * Stub `next/navigation` cho bộ E2E gọi thẳng thân Server Action.
 *
 * `redirect()` thật hoạt động bằng cách NÉM một lỗi nội bộ của Next.js rồi để
 * framework bắt lại. Ngoài Next.js không ai bắt, nên ở đây ném một lớp lỗi
 * riêng có mang theo đích đến — `expectRedirect()` trong `e2e/_harness.ts` bắt
 * đúng lớp này. Nhờ vậy test khẳng định được "guard đá về /teacher" thay vì chỉ
 * thấy một lỗi chung chung.
 */

export class RedirectError extends Error {
  constructor(public readonly destination: string) {
    super(`NEXT_REDIRECT: ${destination}`);
    this.name = "RedirectError";
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/** Kiểu trả `never` y như `redirect()` thật, để TS hiểu code sau nó không chạy. */
export function redirect(destination: string): never {
  throw new RedirectError(destination);
}

export function permanentRedirect(destination: string): never {
  throw new RedirectError(destination);
}

export function notFound(): never {
  throw new NotFoundError();
}
