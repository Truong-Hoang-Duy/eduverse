import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TEST_USER_PREFIXES } from "./admin-report";

/**
 * Lưới an toàn cho một bug ĐÃ XẢY RA: danh sách tiền tố từng bị chép tay ở 2 nơi
 * và lệch khỏi thực tế — `dl.`, `e4.`, `ek.` được script dùng nhưng không khai,
 * nên `purge-test-users.mjs` không dọn nổi tài khoản của 3 bộ E2E đó (còn sót 6
 * tài khoản `dl.` trong DB thật lúc phát hiện) và `/teacher/admin` đếm chúng là
 * tài khoản thật.
 *
 * Test này đọc THẲNG các script E2E nên thêm script mới với tiền tố mới là
 * `pnpm test` đỏ ngay, không chờ tới lúc dọn rác mới biết.
 */
const SCRIPTS_DIR = join(process.cwd(), "scripts");

/** Tiền tố của mọi `makeUser(\`xx.vai-tro.${ts}\`)` trong các script E2E. */
function prefixesUsedByScripts(): Map<string, string[]> {
  const found = new Map<string, string[]>();

  for (const file of readdirSync(SCRIPTS_DIR)) {
    if (!file.startsWith("e2e-") || !file.endsWith(".mjs")) continue;

    const source = readFileSync(join(SCRIPTS_DIR, file), "utf8");
    for (const [, prefix] of source.matchAll(/makeUser\(`([a-z0-9]+\.)/g)) {
      const files = found.get(prefix) ?? [];
      if (!files.includes(file)) files.push(file);
      found.set(prefix, files);
    }
  }

  return found;
}

describe("TEST_USER_PREFIXES", () => {
  it("should find at least one E2E script to check against", () => {
    // Nếu regex hỏng hoặc script đổi cách tạo user, test dưới sẽ pass suông.
    expect(prefixesUsedByScripts().size).toBeGreaterThan(3);
  });

  it("should declare every prefix the E2E scripts actually create", () => {
    const missing: string[] = [];
    for (const [prefix, files] of prefixesUsedByScripts()) {
      if (!TEST_USER_PREFIXES.includes(prefix)) {
        missing.push(`${prefix} (dùng ở ${files.join(", ")})`);
      }
    }

    expect(
      missing,
      "Thiếu tiền tố trong src/lib/test-user-prefixes.json → purge-test-users.mjs " +
        "sẽ không dọn được tài khoản của script đó"
    ).toEqual([]);
  });

  it("should not declare prefixes no script uses any more", () => {
    // Tiền tố chết làm script dọn quét rộng hơn cần thiết — script này XÓA tài
    // khoản nên phạm vi phải khớp đúng thực tế.
    const used = new Set(prefixesUsedByScripts().keys());
    const dead = TEST_USER_PREFIXES.filter((p) => !used.has(p));

    expect(dead, "Tiền tố không script nào dùng — bỏ khỏi JSON").toEqual([]);
  });

  it("should only hold prefixes that end with a dot", () => {
    // `<prefix>.<vai trò>.<timestamp>`: thiếu dấu chấm là khớp quá rộng, VD "e4"
    // sẽ khớp cả username thật bắt đầu bằng "e4".
    for (const prefix of TEST_USER_PREFIXES) {
      expect(prefix.endsWith("."), `"${prefix}" phải kết thúc bằng dấu chấm`).toBe(
        true
      );
      expect(prefix.length).toBeGreaterThan(1);
    }
  });

  it("should not contain a prefix that is a prefix of another", () => {
    // Trùng lồng nhau thì phạm vi xóa rộng hơn ý định mà không ai nhận ra.
    for (const a of TEST_USER_PREFIXES) {
      for (const b of TEST_USER_PREFIXES) {
        if (a !== b) expect(b.startsWith(a)).toBe(false);
      }
    }
  });
});
