import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const stub = (name: string) =>
  fileURLToPath(new URL(`./vitest-stubs/${name}`, import.meta.url));

/**
 * Config THỨ HAI, tách hẳn khỏi `vitest.config.ts`.
 *
 * `pnpm test` = logic THUẦN, chạy offline, vài giây — cổng kiểm tra bắt buộc.
 * `pnpm test:e2e` = gọi THẲNG thân Server Action trên Supabase THẬT, cần mạng +
 * `.env.local`, chạy hàng chục giây. Gộp hai thứ vào một lệnh là biến cổng kiểm
 * tra nhanh thành thứ phải chờ và phải có mạng mới chạy được.
 *
 * Vì sao phải là bộ riêng chứ không viết tiếp bằng script `.mjs` như trước:
 * script Node thuần KHÔNG import được `.ts` và không giải được alias `@/`, nên
 * chúng buộc phải CHÉP LẠI logic của action bằng JS. Chép lại thì đổi action mà
 * quên đổi script vẫn xanh — đúng món nợ kỹ thuật bộ này sinh ra để trả.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Bốn module dưới đây chỉ tồn tại bên trong một request của Next.js. Không
      // thay thế thì mọi action chết ngay dòng `createClient()` / `redirect()`.
      "server-only": stub("server-only.ts"),
      "next/headers": stub("next-headers.ts"),
      "next/cache": stub("next-cache.ts"),
      "next/navigation": stub("next-navigation.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["e2e/**/*.e2e.ts"],
    // Nạp .env.local của web/ + .env của ai-service/ (bộ chấm bài cần
    // AI_SERVICE_API_KEY) — thay cho hai cờ `--env-file` của script cũ.
    setupFiles: ["./e2e/_setup-env.ts"],
    // Các bộ dùng CHUNG một Supabase project: chạy song song là chúng giẫm lên
    // dữ liệu của nhau (rõ nhất ở ca đếm file trong bucket và ca dọn tài khoản
    // test). Tuần tự chậm hơn nhưng đọc kết quả mới tin được.
    fileParallelism: false,
    // Cold start của Render + Gemini có thể tới ~2 phút cho MỘT lượt chấm.
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
