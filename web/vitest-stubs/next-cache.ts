/**
 * Stub `next/cache` cho bộ E2E gọi thẳng thân Server Action.
 *
 * `revalidatePath` thật ném lỗi khi gọi ngoài request của Next.js. Ở đây nó GHI
 * LẠI lời gọi thay vì ném — vừa để action chạy trót lọt, vừa để test khẳng định
 * action có xóa cache đúng đường dẫn. Cache sai đường là bug thật đã dính một
 * lần (khu học viên cần MẪU route động, xem DECISIONS.md), mà `next build`
 * không bắt được.
 */

export interface RevalidateCall {
  path: string;
  type?: string;
}

const calls: RevalidateCall[] = [];

export function revalidatePath(path: string, type?: string): void {
  calls.push({ path, type });
}

export function revalidateTag(tag: string): void {
  calls.push({ path: `tag:${tag}` });
}

/** Lời gọi `revalidatePath` kể từ lần `clearRevalidateCalls()` gần nhất. */
export function revalidateCalls(): readonly RevalidateCall[] {
  return calls;
}

export function clearRevalidateCalls(): void {
  calls.length = 0;
}
