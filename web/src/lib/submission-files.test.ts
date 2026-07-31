import { describe, expect, it } from "vitest";

import {
  budgetWarning,
  describeSkipped,
  emptyTally,
  formatBytes,
  GRADING_BUDGET,
  PROJECT_BUDGET,
  skipReasonFor,
  stripCommonRoot,
  totalBytes,
} from "./submission-files";

/**
 * Luật lọc này là nguồn DUY NHẤT cho cả 3 đường nạp file (kéo thả thư mục,
 * `<input webkitdirectory>`, giải nén .zip) và cho CẢ HAI tab chấm bài. Sửa nhầm
 * một dòng là thư mục `node_modules` lọt vào request gửi Gemini, hoặc tệ hơn là
 * bài làm thật của học viên bị bỏ im lặng.
 */
describe("skipReasonFor", () => {
  it("should keep ordinary code files", () => {
    expect(skipReasonFor("index.html")).toBeNull();
    expect(skipReasonFor("js/app.js")).toBeNull();
    expect(skipReasonFor("src/main.py")).toBeNull();
    expect(skipReasonFor("bai-lam/style.css")).toBeNull();
  });

  it("should skip generated directories anywhere in the path", () => {
    expect(skipReasonFor("node_modules/react/index.js")).toBe("folder");
    expect(skipReasonFor("bai/node_modules/x/y.js")).toBe("folder");
    expect(skipReasonFor("bai/.git/HEAD")).toBe("folder");
    expect(skipReasonFor("bai/dist/bundle.js")).toBe("folder");
    expect(skipReasonFor("bai/__pycache__/m.pyc")).toBe("folder");
  });

  it("should skip lock files and generated bundles", () => {
    expect(skipReasonFor("package-lock.json")).toBe("junk");
    expect(skipReasonFor("pnpm-lock.yaml")).toBe("junk");
    expect(skipReasonFor("app.min.js")).toBe("junk");
    expect(skipReasonFor("app.js.map")).toBe("junk");
  });

  it("should skip hidden config files but keep .htaccess", () => {
    expect(skipReasonFor("bai/.env")).toBe("junk");
    expect(skipReasonFor(".gitignore")).toBe("junk");
    // Có bài web dùng .htaccess thật — bỏ nó là mất bài làm.
    expect(skipReasonFor("bai/.htaccess")).toBeNull();
  });

  it("should keep images and documents ONLY when asked", () => {
    // Tab bài tập: ảnh chụp code có thể CHÍNH LÀ bài làm → giữ.
    const daily = { keepImages: true, keepDocuments: true };
    expect(skipReasonFor("anh-chup.png", daily)).toBeNull();
    expect(skipReasonFor("bao-cao.pdf", daily)).toBeNull();
    expect(skipReasonFor("bai.docx", daily)).toBeNull();

    // Tab sản phẩm: ảnh chỉ là asset, PDF/Word không phải code → bỏ.
    expect(skipReasonFor("anh-chup.png")).toBe("image");
    expect(skipReasonFor("bao-cao.pdf")).toBe("binary");
    expect(skipReasonFor("bai.docx")).toBe("binary");
  });

  it("should skip archives and media regardless of options", () => {
    const daily = { keepImages: true, keepDocuments: true };
    expect(skipReasonFor("bai.zip", daily)).toBe("binary");
    expect(skipReasonFor("nhac.mp3", daily)).toBe("binary");
    expect(skipReasonFor("app.exe", daily)).toBe("binary");
  });

  it("should treat extensions case-insensitively", () => {
    expect(skipReasonFor("ANH.PNG")).toBe("image");
    expect(skipReasonFor("Bai.DOCX")).toBe("binary");
  });

  it("should keep files with unknown extensions so odd code still gets graded", () => {
    // Chủ trương "đuôi code mở thoải mái": lạ thì vẫn nhận, ai-service decode text.
    expect(skipReasonFor("bai.svelte")).toBeNull();
    expect(skipReasonFor("bai.zig")).toBeNull();
    expect(skipReasonFor("Makefile")).toBeNull();
  });
});

describe("stripCommonRoot", () => {
  it("should drop the shared top folder so paths stay readable", () => {
    const files = [
      { path: "bai-cuoi-khoa/index.html", size: 1 },
      { path: "bai-cuoi-khoa/js/app.js", size: 1 },
    ];

    expect(stripCommonRoot(files).map((f) => f.path)).toEqual([
      "index.html",
      "js/app.js",
    ]);
  });

  it("should keep paths when roots differ", () => {
    const files = [
      { path: "bai-1/index.html", size: 1 },
      { path: "bai-2/index.html", size: 1 },
    ];

    expect(stripCommonRoot(files).map((f) => f.path)).toEqual([
      "bai-1/index.html",
      "bai-2/index.html",
    ]);
  });

  it("should leave a single file alone", () => {
    const files = [{ path: "thu-muc/index.html", size: 1 }];
    expect(stripCommonRoot(files)[0].path).toBe("thu-muc/index.html");
  });

  it("should not strip when a file sits at the root beside a folder", () => {
    const files = [
      { path: "index.html", size: 1 },
      { path: "js/app.js", size: 1 },
    ];

    expect(stripCommonRoot(files).map((f) => f.path)).toEqual([
      "index.html",
      "js/app.js",
    ]);
  });
});

describe("budgetWarning", () => {
  const file = (size: number) => ({ size });

  it("should stay silent inside the budget", () => {
    expect(budgetWarning([file(1024)], PROJECT_BUDGET)).toBeNull();
  });

  it("should warn when there are too many files", () => {
    const many = Array.from({ length: PROJECT_BUDGET.maxFiles + 1 }, () => file(1));
    expect(budgetWarning(many, PROJECT_BUDGET)).toContain("quá 30 file");
  });

  it("should warn when the total is too large", () => {
    const heavy = [file(PROJECT_BUDGET.maxTotalBytes + 1)];
    expect(budgetWarning(heavy, PROJECT_BUDGET)).toContain("Tổng");
  });

  it("should let daily grading carry more than project review", () => {
    // Bài tập có thể là PDF scan → ngân sách phải rộng hơn tab sản phẩm.
    const pdf = [file(3 * 1024 * 1024)];
    expect(budgetWarning(pdf, GRADING_BUDGET)).toBeNull();
    expect(budgetWarning(pdf, PROJECT_BUDGET)).not.toBeNull();
  });
});

describe("totalBytes / formatBytes", () => {
  it("should sum sizes", () => {
    expect(totalBytes([{ path: "a", content: "", size: 10 }])).toBe(10);
    expect(totalBytes([])).toBe(0);
  });

  it("should format with a unit a teacher can read", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("describeSkipped", () => {
  it("should be empty when nothing was skipped", () => {
    expect(describeSkipped(emptyTally())).toBe("");
  });

  it("should list every kind that was skipped", () => {
    const tally = { ...emptyTally(), folder: 4, junk: 2, image: 1 };
    const text = describeSkipped(tally);

    expect(text).toContain("4 file trong thư mục sinh tự động");
    expect(text).toContain("2 file rác/cấu hình");
    expect(text).toContain("1 ảnh");
    expect(text).not.toContain("nhị phân");
  });
});
