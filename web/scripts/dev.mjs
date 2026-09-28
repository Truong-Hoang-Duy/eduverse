// Chạy `next dev` rồi tự mở trình duyệt khi server sẵn sàng — khỏi phải gõ
// tay localhost:3000 mỗi lần (yêu cầu user 2026-08-06).
// Chạy: pnpm dev (package.json đã trỏ "dev" qua script này).
import { spawn, exec } from "node:child_process";
import { platform } from "node:os";

const child = spawn("next", ["dev", "--turbopack"], {
  stdio: ["inherit", "pipe", "inherit"],
  shell: true,
});

function openBrowser(url) {
  const cmd =
    platform() === "win32"
      ? `start "" "${url}"`
      : platform() === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}

let lastUrl = "http://localhost:3000";
let opened = false;

// Next in "Local: http://localhost:3000" TRƯỚC, rồi "Ready in ...ms" SAU khi
// biên dịch xong — theo dõi cả 2 trên cùng một luồng chunk để lấy đúng cổng
// (Next tự tăng cổng nếu 3000 đang bận) và chỉ mở trình duyệt khi đã sẵn sàng
// nhận request, không mở sớm rồi ra trang lỗi.
child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  const localMatch = text.match(/Local:\s+(http:\/\/localhost:\d+)/);
  if (localMatch) lastUrl = localMatch[1];

  if (!opened && /Ready in/.test(text)) {
    opened = true;
    // Gửi request khởi động (warmup) để Next.js bắt đầu biên dịch trang và layout
    // ngay lập tức, giảm tối đa độ trễ trắng trang khi trình duyệt mở lên.
    fetch(lastUrl).catch(() => {});
    openBrowser(lastUrl);
  }
});

// Phòng khi định dạng log đổi và không khớp regex trên — vẫn mở sau 20s để
// khỏi im lặng bỏ qua tính năng.
const fallback = setTimeout(() => {
  if (!opened) {
    opened = true;
    fetch(lastUrl).catch(() => {});
    openBrowser(lastUrl);
  }
}, 20000);
fallback.unref();

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
