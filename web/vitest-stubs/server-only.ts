/**
 * Stub cho package `server-only` khi chạy vitest.
 *
 * `server-only` cố ý ném lỗi khi bị import ngoài Server Component để chặn lộ code
 * server ra client. Vitest chạy trong Node thuần nên không có ngữ cảnh đó và bị
 * ném oan — alias sang file rỗng này (khai trong `vitest.config.ts`) để test được
 * các module server. KHÔNG ảnh hưởng build thật: Next.js vẫn dùng package gốc.
 */
export {};
