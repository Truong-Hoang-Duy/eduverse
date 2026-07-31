// Nạp biến môi trường cho bộ E2E — bản thay thế cho các cờ `--env-file` mà
// script `.mjs` cũ phải gõ tay (và hay quên cờ thứ hai của ai-service).
//
// `process.loadEnvFile` là stdlib của Node (cùng bộ phân tích với `--env-file`),
// nên không cần thêm dependency nào để đọc `.env`.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Chụp lại biến từ SHELL trước khi nạp file: đặt `AI_SERVICE_URL=...` ngay trên
// dòng lệnh phải THẮNG file, vì đó đúng là cách đổi port khi cổng 8000 dính
// "socket ma" (xem SESSION_NOTES.md).
const fromShell = { ...process.env };

const envFiles = [
  // ai-service trước, web sau → web/.env.local thắng khi trùng tên biến.
  new URL("../../ai-service/.env", import.meta.url),
  new URL("../.env.local", import.meta.url),
];

for (const url of envFiles) {
  const path = fileURLToPath(url);
  if (existsSync(path)) process.loadEnvFile(path);
}

Object.assign(process.env, fromShell);
