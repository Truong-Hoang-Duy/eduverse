import { describe, expect, it } from "vitest";

import { pickedFromInput } from "./read-dropped-files";
import { skipReasonFor } from "./submission-files";

/**
 * Lỗi user báo 2026-07-31: chọn file .zip thì hiện "Không tìm thấy file nào
 * trong thứ vừa chọn", dù bên trong có mã nguồn.
 *
 * Gốc: `.zip` nằm trong danh sách đuôi nhị phân, nên chính file nén bị lọc bỏ
 * NGAY LÚC CHỌN — chưa từng được mở ra. Câu thông báo đó chỉ phát ra khi danh
 * sách rỗng *trước* lúc giải nén, nên nó hoàn toàn không nói gì về ruột file.
 *
 * Cách sửa: `skipReasonFor` GIỮ NGUYÊN (một file nén nằm trong thư mục bài làm
 * đúng là rác); tầng quyết định là chỗ CHỌN file — nộp đúng một .zip thì nó là
 * cái hộp, không phải bài làm.
 */
function file(name: string): File {
  return new File(["noi dung"], name);
}

const GRADING_FILTER = { keepImages: true, keepDocuments: true };

describe("skipReasonFor với file nén", () => {
  it("should still call a .zip binary — that layer does not decide", () => {
    expect(skipReasonFor("BaiTap.zip")).toBe("binary");
  });

  it("should still drop a .zip nested inside a submission folder", () => {
    expect(skipReasonFor("bai-lam/assets/anh.zip")).toBe("binary");
  });
});

describe("chọn đúng MỘT file .zip để nộp", () => {
  it("should keep it so it can actually be unzipped", () => {
    const picked = pickedFromInput([file("BaiTap.zip")], GRADING_FILTER);

    expect(picked.map((p) => p.path)).toEqual(["BaiTap.zip"]);
  });

  it("should keep it on the project tab too (no filter options)", () => {
    const picked = pickedFromInput([file("SanPham.zip")]);

    expect(picked.map((p) => p.path)).toEqual(["SanPham.zip"]);
  });

  it("should not care what the zip is named", () => {
    // User nén thư mục lồng nhau, tên file nén ngoài cùng có thể trùng luôn tên
    // một thư mục bị lọc (dist, build, out, bin...).
    for (const name of ["dist.zip", "build.zip", "out.zip", "bin.zip"]) {
      expect(pickedFromInput([file(name)]).length, name).toBe(1);
    }
  });

  it("should accept an uppercase extension", () => {
    expect(pickedFromInput([file("BaiTap.ZIP")]).length).toBe(1);
  });
});

describe("chọn .zip lẫn với thứ khác", () => {
  it("should drop the zip and keep the rest", () => {
    // Nhiều file thì không giải nén được (chỉ giải nén khi nộp ĐÚNG một .zip),
    // nên file nén lúc này lại là rác đúng nghĩa.
    const picked = pickedFromInput(
      [file("bai-lam.js"), file("lung-tung.zip")],
      GRADING_FILTER
    );

    expect(picked.map((p) => p.path)).toEqual(["bai-lam.js"]);
  });

  it("should drop a zip that sits inside a chosen folder", () => {
    const withPath = (path: string) => {
      const f = file(path.split("/").pop()!);
      Object.defineProperty(f, "webkitRelativePath", { value: path });
      return f;
    };

    const picked = pickedFromInput(
      [withPath("bai-lam/app.js"), withPath("bai-lam/anh.zip")],
      GRADING_FILTER
    );

    expect(picked.map((p) => p.path)).toEqual(["bai-lam/app.js"]);
  });
});
