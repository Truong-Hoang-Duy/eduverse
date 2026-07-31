import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Cùng alias với tsconfig.json — thiếu cái này thì mọi import `@/lib/...`
    // trong code đang test đều không giải được.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` ném lỗi khi import ngoài Server Component → test module
      // server bị ném oan. Xem vitest-stubs/server-only.ts.
      "server-only": fileURLToPath(
        new URL("./vitest-stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    // Các module đang test đều là logic THUẦN chạy server/Node (đọc ZIP, lọc
    // file, validate URL) — không cần môi trường DOM.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
