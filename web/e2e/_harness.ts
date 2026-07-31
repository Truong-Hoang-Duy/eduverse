// Bộ đồ nghề dùng chung cho E2E gọi THẲNG thân Server Action.
//
// Điểm khác biệt so với các script `scripts/e2e-*.mjs`: script chỉ gọi
// `supabase-js` để CHÉP LẠI những gì action làm, nên đổi action mà quên đổi
// script thì test vẫn xanh. Ở đây test import chính hàm action và gọi nó, nên
// đổi chữ ký hàm là `pnpm typecheck` đỏ, đổi hành vi là `pnpm test:e2e` đỏ.
//
// Người dùng vẫn là người dùng THẬT với session THẬT (cookie nằm trong
// `CookieJar`), nên **RLS vẫn có hiệu lực** — bộ này không mock Supabase.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { CookieJar, setActiveJar } from "../vitest-stubs/next-headers";
import { RedirectError } from "../vitest-stubs/next-navigation";

/** Email ảo `<username>@eduverse.local` — người dùng không bao giờ thấy nó. */
const FAKE_DOMAIN = "eduverse.local";

export const TEST_PASSWORD = "test-password-123";

export interface TestUser {
  id: string;
  username: string;
  email: string;
  /** Cookie session của riêng người này — truyền vào `runAs()`. */
  jar: CookieJar;
}

export function emailOf(username: string): string {
  return `${username}@${FAKE_DOMAIN}`;
}

/** Hậu tố duy nhất cho mỗi lần chạy, để hai lần chạy không đụng tên nhau. */
export function uniqueSuffix(): string {
  return String(Date.now());
}

/** Client service-role — CHỈ dùng để dựng bối cảnh và soi xuyên RLS khi kiểm chứng. */
export function admin() {
  return createAdminClient();
}

// ---------- Chạy code dưới danh nghĩa một người dùng ----------

/**
 * Chạy `fn` như thể request đến từ `user`.
 *
 * Truyền `null` = KHÁCH chưa đăng nhập (hộp cookie rỗng) — dùng cho các ca
 * "phiên hết hạn". Hộp cũ luôn được trả lại trong `finally` để một ca đỏ giữa
 * chừng không làm rò quyền sang ca sau.
 */
export async function runAs<T>(
  user: TestUser | null,
  fn: () => Promise<T>
): Promise<T> {
  return withJar(user?.jar ?? new CookieJar(), fn);
}

/** Hộp cookie mới toanh = một trình duyệt chưa đăng nhập bao giờ. */
export function newJar(): CookieJar {
  return new CookieJar();
}

/**
 * Chạy `fn` với hộp cookie CHỈ ĐỊNH và giữ lại mọi thứ nó ghi vào đó.
 *
 * Cần cho luồng đăng ký/đăng nhập: chính action gọi `signInWithPassword`, tức
 * SESSION DO ACTION TẠO RA chứ không phải do test dựng sẵn. Nhờ vậy test khẳng
 * định được "đăng ký xong là đăng nhập luôn" — thứ mà script cũ phải tự làm lấy
 * nên không bao giờ kiểm được.
 */
export async function withJar<T>(jar: CookieJar, fn: () => Promise<T>): Promise<T> {
  const previous = setActiveJar(jar);
  try {
    return await fn();
  } finally {
    setActiveJar(previous);
  }
}

/**
 * Client Supabase gắn với session của `user`, dùng để DỰNG bối cảnh và KIỂM
 * CHỨNG dưới đúng quyền của người đó (RLS còn hiệu lực).
 *
 * Dùng chính `createClient()` của app: nó chụp lại hộp cookie MỘT lần lúc tạo,
 * nên client trả về vẫn trỏ đúng người kể cả sau khi `runAs` trả hộp cũ về.
 */
export async function clientFor(user: TestUser) {
  return runAs(user, () => createClient());
}

/**
 * Bắt `redirect()` của Next.js và trả về đích đến.
 *
 * Guard của route (`requireAdmin`, `requireRole`) báo từ chối bằng cách
 * redirect chứ không trả lỗi, nên không có hàm này thì không khẳng định được
 * "đá về /teacher" — chỉ thấy một promise bị reject.
 */
export async function expectRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof RedirectError) return err.destination;
    throw err;
  }
  throw new Error("Hàm này lẽ ra phải redirect nhưng đã chạy xong bình thường.");
}

// ---------- Tạo người dùng + đăng nhập ----------

/**
 * Đăng nhập vào một hộp cookie mới, đi qua ĐÚNG `createClient()` của app nên
 * session được ghi y hệt lúc chạy thật.
 */
export async function signIn(username: string): Promise<CookieJar> {
  const jar = new CookieJar();
  const previous = setActiveJar(jar);
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailOf(username),
      password: TEST_PASSWORD,
    });
    if (error) throw new Error(`Đăng nhập ${username} lỗi: ${error.message}`);
  } finally {
    setActiveJar(previous);
  }
  return jar;
}

/**
 * Dựng sẵn một tài khoản qua admin API (đường mà chính Server Action đăng ký
 * dùng) rồi đăng nhập luôn.
 *
 * ⚠️ Học viên PHẢI có `class_code` của một lớp CÓ THẬT: trigger
 * `handle_new_user` tự ghi danh theo mã lớp, thiếu thì `createUser` trả 500 với
 * message rỗng, không hề nói thiếu gì (xem DECISIONS.md).
 */
export async function createUser(
  username: string,
  metadata: Record<string, string>
): Promise<TestUser> {
  const { data, error } = await admin().auth.admin.createUser({
    email: emailOf(username),
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { ...metadata, username },
  });
  if (error) throw new Error(`Tạo tài khoản ${username} lỗi: ${error.message}`);

  trackUser(data.user.id);
  return {
    id: data.user.id,
    username,
    email: emailOf(username),
    jar: await signIn(username),
  };
}

// ---------- Sổ dọn dẹp ----------

const createdUserIds = new Set<string>();
const createdCourseCodes = new Set<string>();
const uploadedPaths = new Set<string>();

export function trackUser(id: string): void {
  createdUserIds.add(id);
}

/** Khóa học xóa theo MÃ: xóa khóa là mọi lớp/đề/sản phẩm bên dưới cascade theo. */
export function trackCourseCode(code: string): void {
  createdCourseCodes.add(code);
}

/** File Storage — bucket KHÔNG cascade theo khóa ngoại, phải tự nhớ mà dọn. */
export function trackFile(path: string): void {
  uploadedPaths.add(path);
}

/**
 * Quên sổ dọn dẹp mà KHÔNG xóa gì.
 *
 * Chỉ dành cho ca test đã tự tay xóa sạch bằng đường khác — cụ thể là ca chạy
 * `purgeTestUsers()` thật (nó xóa mọi tài khoản khớp tiền tố test, gồm cả tài
 * khoản của chính bộ test). Không có hàm này thì `cleanupAll` sẽ báo "còn sót"
 * cho những thứ đã biến mất đúng ý đồ.
 */
export function forgetTracked(): void {
  uploadedPaths.clear();
  createdCourseCodes.clear();
  createdUserIds.clear();
}

/**
 * Dọn mọi thứ đã tạo. Gọi trong `afterAll`.
 *
 * Thứ tự BẮT BUỘC: file → khóa học → tài khoản.
 * `student_reviews.created_by` trỏ tới `profiles` mà KHÔNG cascade, nên còn
 * nhận xét là xóa giáo viên không nổi; mà `deleteUser` trả lỗi trong `{ error }`
 * chứ không ném, nên bỏ qua là tài khoản rác nằm lại im ru.
 */
export async function cleanupAll(): Promise<void> {
  const service = admin();
  const problems: string[] = [];

  if (uploadedPaths.size > 0) {
    const { error } = await service.storage
      .from("assignment-specs")
      .remove([...uploadedPaths]);
    if (error) problems.push(`file Storage: ${error.message}`);
  }

  for (const code of createdCourseCodes) {
    const { error } = await service.from("courses").delete().eq("code", code);
    if (error) problems.push(`khóa ${code}: ${error.message}`);
  }

  for (const id of createdUserIds) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) problems.push(`tài khoản ${id}: ${error.message}`);
  }

  uploadedPaths.clear();
  createdCourseCodes.clear();
  createdUserIds.clear();

  // Không ném: dọn hụt không được làm đỏ một bộ test đã chạy đúng. Nhưng phải
  // KÊU LÊN, vì rác để lại sẽ làm các lần chạy sau khó hiểu.
  if (problems.length > 0) {
    console.error(`⚠️ Dọn dẹp còn sót: ${problems.join(" | ")}`);
  }
}
