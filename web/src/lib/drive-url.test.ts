import { describe, expect, it } from "vitest";

import {
  driveUrlError,
  isSafeHttpUrl,
  looksLikeGoogleDrive,
  shortenDriveUrl,
} from "./drive-url";

const FOLDER =
  "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz?usp=sharing";

describe("driveUrlError", () => {
  it("should accept a real Drive folder link", () => {
    expect(driveUrlError(FOLDER)).toBeNull();
  });

  it("should accept a non-Google https link", () => {
    // Không chặn dịch vụ khác — chỉ cảnh báo ở UI (xem looksLikeGoogleDrive).
    expect(driveUrlError("https://onedrive.live.com/abc")).toBeNull();
  });

  it("should reject an empty value", () => {
    expect(driveUrlError("   ")).toContain("Chưa nhập");
  });

  it("should reject text that is not a url", () => {
    expect(driveUrlError("drive google folders abc")).toContain("không hợp lệ");
  });

  it("should reject dangerous schemes", () => {
    // Dán javascript:/data: rồi render thành <a href> là lỗ XSS.
    expect(driveUrlError("javascript:alert(1)")).toContain("https://");
    expect(driveUrlError("data:text/html,<script>alert(1)</script>")).toContain(
      "https://"
    );
  });

  it("should reject an absurdly long value", () => {
    expect(driveUrlError(`https://drive.google.com/${"a".repeat(600)}`)).toContain(
      "quá dài"
    );
  });

  it("should trim before judging", () => {
    expect(driveUrlError(`  ${FOLDER}  `)).toBeNull();
  });
});

describe("looksLikeGoogleDrive", () => {
  it("should recognise Drive and Docs hosts", () => {
    expect(looksLikeGoogleDrive(FOLDER)).toBe(true);
    expect(looksLikeGoogleDrive("https://docs.google.com/document/d/x")).toBe(true);
  });

  it("should not recognise other hosts", () => {
    expect(looksLikeGoogleDrive("https://onedrive.live.com/abc")).toBe(false);
    expect(looksLikeGoogleDrive("khong-phai-url")).toBe(false);
  });
});

describe("shortenDriveUrl", () => {
  it("should strip the scheme and www so the host reads first", () => {
    expect(shortenDriveUrl("https://www.example.com/a")).toBe("example.com/a");
    expect(shortenDriveUrl("http://example.com/a")).toBe("example.com/a");
  });

  it("should leave a short link untouched", () => {
    expect(shortenDriveUrl("https://drive.google.com/x")).toBe("drive.google.com/x");
  });

  it("should elide the middle of a long link but keep host and tail", () => {
    const short = shortenDriveUrl(FOLDER);

    expect(short.length).toBeLessThanOrEqual(42);
    expect(short).toContain("…");
    expect(short.startsWith("drive.google.com/")).toBe(true);
    // Giữ 8 ký tự cuối để phân biệt 2 thư mục khác nhau cùng tiền tố.
    expect(short.endsWith("=sharing")).toBe(true);
  });

  it("should not invent a shortened url — the original is never rewritten", () => {
    // "Rút gọn" ở dự án này là rút gọn CÁCH HIỂN THỊ, không gọi TinyURL.
    expect(shortenDriveUrl(FOLDER)).not.toContain("tinyurl");
    expect(shortenDriveUrl(FOLDER)).not.toMatch(/^https?:/);
  });
});

describe("isSafeHttpUrl", () => {
  it("should accept http and https", () => {
    expect(isSafeHttpUrl(FOLDER)).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
  });

  it("should reject script-bearing schemes even with padding", () => {
    // Đây là chốt chặn chỗ RENDER: dòng `javascript:` có thể đã nằm trong DB do
    // học viên ghi thẳng qua API (bug 2026-07-30) — bọc nó thành <a href> là
    // stored XSS nhắm vào giáo viên và bạn cùng lớp.
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("  javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("JavaScript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("should reject anything that is not a url", () => {
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl("khong-phai-url")).toBe(false);
    expect(isSafeHttpUrl("/duong-dan-noi-bo")).toBe(false);
  });
});
