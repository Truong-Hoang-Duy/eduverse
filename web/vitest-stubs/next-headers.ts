/**
 * Stub `next/headers` cho bộ E2E gọi THẲNG thân Server Action (`pnpm test:e2e`).
 *
 * `cookies()` thật chỉ chạy được bên trong một request của Next.js. Ngoài đó nó
 * ném lỗi, nên mọi action đều chết ngay dòng `createClient()`. Ở đây thay bằng
 * một hộp cookie trong bộ nhớ: `@supabase/ssr` ghi session đăng nhập vào đó y
 * như ghi vào cookie thật, nhờ vậy action chạy dưới đúng danh nghĩa một người
 * dùng và **RLS vẫn có hiệu lực** — đây là điểm khiến bộ E2E này khác test mock.
 *
 * KHÔNG ảnh hưởng build thật: alias chỉ khai trong `vitest.e2e.config.ts`.
 */

export interface JarCookie {
  name: string;
  value: string;
}

/**
 * Hộp cookie tối giản. `@supabase/ssr` chỉ dùng `getAll` + `set`, nhưng vẫn
 * thêm `get`/`delete` cho khớp hình dạng của `cookies()` thật.
 */
export class CookieJar {
  private readonly store = new Map<string, string>();

  getAll(): JarCookie[] {
    return [...this.store].map(([name, value]) => ({ name, value }));
  }

  get(name: string): JarCookie | undefined {
    const value = this.store.get(name);
    return value === undefined ? undefined : { name, value };
  }

  /**
   * `@supabase/ssr` gọi `set(name, value, options)`. Tham số thứ 3 cố ý KHÔNG
   * khai: maxAge/httpOnly/sameSite chỉ có ý nghĩa với trình duyệt, và JS bỏ qua
   * đối số thừa. Giá trị rỗng = Supabase đang XÓA cookie đó.
   */
  set(name: string, value: string): void {
    if (value === "") this.store.delete(name);
    else this.store.set(name, value);
  }

  delete(name: string): void {
    this.store.delete(name);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Hộp đang có hiệu lực. Mặc định là hộp RỖNG = chưa đăng nhập, để action nào
 * quên bọc `runAs()` sẽ rơi vào nhánh "phiên hết hạn" chứ không âm thầm mượn
 * quyền của người dùng ở ca test trước.
 */
let activeJar = new CookieJar();

export function setActiveJar(jar: CookieJar): CookieJar {
  const previous = activeJar;
  activeJar = jar;
  return previous;
}

export function getActiveJar(): CookieJar {
  return activeJar;
}

/** `cookies()` của Next 15 trả Promise — giữ đúng để `await cookies()` chạy được. */
export async function cookies(): Promise<CookieJar> {
  return activeJar;
}

export async function headers(): Promise<Headers> {
  return new Headers();
}
