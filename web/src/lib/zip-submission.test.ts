import { describe, expect, it } from "vitest";

import { GRADING_BUDGET, PROJECT_BUDGET } from "./submission-files";
import { buildZip } from "./zip-fixture";
import { unzipSubmission } from "./zip-submission";

/**
 * Bài nộp thật của học viên hay có dạng thư mục lồng nhau CÙNG TÊN — em nén
 * thư mục `BaiTap`, bên trong lại là `BaiTap`, bên trong nữa vẫn `BaiTap`
 * (thường do nén đi nén lại, hoặc do Windows "Send to > Compressed folder").
 *
 * Nhóm test này canh việc bung đúng ruột những file đó, sau khi đã sửa lỗi
 * chính file .zip bị lọc ngay lúc chọn (xem `zip-pick.test.ts`).
 */
const KEEP_ALL = { keepImages: true, keepDocuments: true };

function b64(entries: Parameters<typeof buildZip>[0]): string {
  return Buffer.from(buildZip(entries)).toString("base64");
}

describe("unzipSubmission với thư mục lồng nhau cùng tên", () => {
  it("should find source files buried under repeated folder names", () => {
    const zip = b64([
      { name: "BaiTap/BaiTap/BaiTap/index.js", content: "console.log(1);" },
      { name: "BaiTap/BaiTap/BaiTap/style.css", content: "body{margin:0}" },
    ]);

    const res = unzipSubmission(zip, KEEP_ALL, GRADING_BUDGET);

    expect(res.error).toBeUndefined();
    expect(res.entries?.map((e) => e.name).sort()).toEqual([
      "BaiTap/BaiTap/BaiTap/index.js",
      "BaiTap/BaiTap/BaiTap/style.css",
    ]);
  });

  it("should still work when the folders are nested very deep", () => {
    const deep = "a/".repeat(10) + "main.py";
    const res = unzipSubmission(b64([{ name: deep, content: "print(1)" }]), KEEP_ALL, GRADING_BUDGET);

    expect(res.error).toBeUndefined();
    expect(res.entries?.[0].name).toBe(deep);
  });

  it("should ignore the folder ENTRIES themselves and keep the files", () => {
    // Nhiều công cụ nén ghi cả mục thư mục (tên kết thúc bằng "/") vào .zip.
    const res = unzipSubmission(
      b64([
        { name: "BaiTap/" },
        { name: "BaiTap/BaiTap/" },
        { name: "BaiTap/BaiTap/app.js", content: "let a = 1;" },
      ]),
      KEEP_ALL,
      GRADING_BUDGET
    );

    expect(res.error).toBeUndefined();
    expect(res.entries?.map((e) => e.name)).toEqual(["BaiTap/BaiTap/app.js"]);
  });

  it("should drop junk folders no matter how deep they sit", () => {
    const res = unzipSubmission(
      b64([
        { name: "BaiTap/BaiTap/app.js", content: "let a = 1;" },
        { name: "BaiTap/BaiTap/node_modules/left-pad/index.js", content: "x" },
        { name: "BaiTap/.git/config", content: "[core]" },
      ]),
      KEEP_ALL,
      GRADING_BUDGET
    );

    expect(res.entries?.map((e) => e.name)).toEqual(["BaiTap/BaiTap/app.js"]);
    expect(res.skipped?.folder).toBe(2);
  });

  it("should explain itself when the archive really holds nothing usable", () => {
    // Ca này mới ĐÚNG là "không có gì đọc được" — thông báo phải nói về ruột
    // file nén, khác hẳn câu "không tìm thấy file nào trong thứ vừa chọn".
    const res = unzipSubmission(
      b64([{ name: "BaiTap/node_modules/x/index.js", content: "x" }]),
      KEEP_ALL,
      GRADING_BUDGET
    );

    expect(res.entries).toBeUndefined();
    expect(res.error).toContain("không có file bài làm nào đọc được");
  });

  it("should keep images for grading but drop them for a project", () => {
    const entries = [
      { name: "BaiTap/BaiTap/app.js", content: "let a = 1;" },
      { name: "BaiTap/BaiTap/anh-chup-code.png", content: "fake png" },
    ];

    const grading = unzipSubmission(b64(entries), KEEP_ALL, GRADING_BUDGET);
    const project = unzipSubmission(b64(entries), {}, PROJECT_BUDGET);

    expect(grading.entries?.length).toBe(2);
    expect(project.entries?.map((e) => e.name)).toEqual(["BaiTap/BaiTap/app.js"]);
  });
});
