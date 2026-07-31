import { describe, expect, it } from "vitest";

import type { GradeInputFile } from "@/lib/actions/grading";
import type { PickedFile } from "@/lib/read-dropped-files";

import {
  attachmentFromZipEntry,
  attachmentsFromPicked,
} from "./submission-attachment";

/**
 * `key` là thứ quyết định việc thả nhiều lượt có bị trùng file hay không —
 * `useSubmissionPicker` lọc trùng hoàn toàn dựa vào nó. Sai luật đặt key thì
 * hoặc file bị bỏ oan, hoặc cùng một file bị gửi cho AI hai lần.
 */
function pick(path: string, content: string, lastModified = 1000): PickedFile {
  return {
    path,
    file: new File([content], path.split("/").pop() ?? path, {
      type: "text/javascript",
      lastModified,
    }),
  };
}

describe("attachmentsFromPicked", () => {
  it("should keep the relative path, not just the file name", () => {
    // AI đọc đường dẫn để hiểu bố cục thư mục — mất nó là mất ngữ cảnh.
    const { items } = attachmentsFromPicked([pick("js/app.js", "x")]);

    expect(items[0].path).toBe("js/app.js");
  });

  it("should not read the file content yet", () => {
    // Nạp thư mục lớn phải nhanh; base64 hóa để dành tới lúc bấm gửi.
    const { items } = attachmentsFromPicked([pick("a.js", "console.log(1);")]);

    expect(items[0].contentB64).toBeNull();
    expect(items[0].file).toBeInstanceOf(File);
  });

  it("should give two different files two different keys", () => {
    const { items } = attachmentsFromPicked([
      pick("a.js", "mot"),
      pick("b.js", "hai"),
    ]);

    expect(items[0].key).not.toBe(items[1].key);
  });

  it("should give the SAME file the same key across two drops", () => {
    // Thả lại đúng thư mục cũ thì không được nhân đôi danh sách.
    const first = attachmentsFromPicked([pick("a.js", "noi dung")]);
    const second = attachmentsFromPicked([pick("a.js", "noi dung")]);

    expect(first.items[0].key).toBe(second.items[0].key);
  });

  it("should tell apart a file that was edited between two drops", () => {
    // Sửa bài rồi thả lại: phải là mục MỚI, không thì AI chấm bản cũ.
    const before = attachmentsFromPicked([pick("a.js", "cu", 1000)]);
    const after = attachmentsFromPicked([pick("a.js", "moi hon nhieu", 2000)]);

    expect(before.items[0].key).not.toBe(after.items[0].key);
  });

  it("should tell apart two files with the same name in different folders", () => {
    const { items } = attachmentsFromPicked([
      pick("js/index.js", "x"),
      pick("css/index.js", "x"),
    ]);

    expect(items[0].key).not.toBe(items[1].key);
  });
});

describe("attachmentFromZipEntry", () => {
  const entry: GradeInputFile = {
    name: "bai-lam/app.js",
    mimeType: "",
    contentB64: "Y29uc29sZS5sb2coMSk7",
    size: 17,
  };

  it("should carry the already-extracted content instead of a File", () => {
    // Server giải nén sẵn nên không còn object File nào để đọc lại.
    const item = attachmentFromZipEntry(entry);

    expect(item.file).toBeNull();
    expect(item.contentB64).toBe(entry.contentB64);
    expect(item.path).toBe("bai-lam/app.js");
    expect(item.size).toBe(17);
  });

  it("should not collide with a file picked from disk at the same path", () => {
    // Cùng đường dẫn nhưng một cái từ .zip, một cái từ máy — vẫn là hai nguồn
    // khác nhau, gộp nhầm là mất một cái.
    const fromZip = attachmentFromZipEntry({ ...entry, name: "a.js" });
    const fromDisk = attachmentsFromPicked([pick("a.js", "x")]).items[0];

    expect(fromZip.key).not.toBe(fromDisk.key);
  });
});
