import { describe, expect, it } from "vitest";

import { buildZip } from "./zip-fixture";
import { listZipEntries, readZipEntry } from "./zip";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("readZipEntry", () => {
  it("should read a deflated entry", () => {
    const zip = buildZip([{ name: "a.txt", content: "xin chào deflate" }]);

    expect(decode(readZipEntry(zip, "a.txt")!)).toBe("xin chào deflate");
  });

  it("should read a stored (uncompressed) entry", () => {
    const zip = buildZip([{ name: "a.txt", content: "không nén", method: 0 }]);

    expect(decode(readZipEntry(zip, "a.txt")!)).toBe("không nén");
  });

  it("should find an entry nested behind others", () => {
    const zip = buildZip([
      { name: "first.txt", content: "một" },
      { name: "deep/second.txt", content: "hai" },
      { name: "third.txt", content: "ba" },
    ]);

    expect(decode(readZipEntry(zip, "deep/second.txt")!)).toBe("hai");
  });

  it("should re-read the name length from the local header, not the directory", () => {
    // Bản ZIP thật hay có extra field ở local header mà bảng mục lục ghi 0. Lấy
    // theo số của bảng mục lục là trỏ lệch vào giữa dữ liệu → đọc ra rác.
    const zip = buildZip([
      { name: "a.txt", content: "đúng dữ liệu", localExtraBytes: 16 },
    ]);

    expect(decode(readZipEntry(zip, "a.txt")!)).toBe("đúng dữ liệu");
  });

  it("should return null for a missing entry", () => {
    const zip = buildZip([{ name: "a.txt", content: "x" }]);

    expect(readZipEntry(zip, "khong-co.txt")).toBeNull();
  });

  it("should return null when the bytes are not a zip", () => {
    expect(readZipEntry(new TextEncoder().encode("chỉ là chữ"), "a.txt")).toBeNull();
    expect(readZipEntry(new Uint8Array(0), "a.txt")).toBeNull();
  });
});

describe("listZipEntries", () => {
  it("should list every file", () => {
    const zip = buildZip([
      { name: "index.html", content: "<h1>hi</h1>" },
      { name: "js/app.js", content: "console.log(1)" },
    ]);

    expect(listZipEntries(zip).map((e) => e.name)).toEqual([
      "index.html",
      "js/app.js",
    ]);
  });

  it("should skip directory entries", () => {
    const zip = buildZip([
      { name: "bai/", method: 0 },
      { name: "bai/index.html", content: "x" },
    ]);

    expect(listZipEntries(zip).map((e) => e.name)).toEqual(["bai/index.html"]);
  });

  it("should never inflate what `keep` rejects", () => {
    // node_modules bị chặn theo TÊN nên dữ liệu của nó không bao giờ vào RAM.
    // Entry rác này sẽ làm inflate ném lỗi nếu bị bung — test đỏ ngay.
    const zip = buildZip([
      { name: "node_modules/big.js", corrupt: true },
      { name: "index.html", content: "giữ lại" },
    ]);

    const kept = listZipEntries(zip, (name) => !name.startsWith("node_modules/"));

    expect(kept.map((e) => e.name)).toEqual(["index.html"]);
    expect(decode(kept[0].data)).toBe("giữ lại");
  });

  it("should skip a corrupt entry but still return the healthy ones", () => {
    // Một file hỏng không được làm mất cả bài làm của học viên.
    const zip = buildZip([
      { name: "hong.js", corrupt: true },
      { name: "tot.js", content: "vẫn đọc được" },
    ]);

    const entries = listZipEntries(zip);

    expect(entries.map((e) => e.name)).toEqual(["tot.js"]);
  });

  it("should return an empty list for non-zip bytes", () => {
    expect(listZipEntries(new TextEncoder().encode("không phải zip"))).toEqual([]);
  });
});
