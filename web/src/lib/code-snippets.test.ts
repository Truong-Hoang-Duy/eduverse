import { describe, expect, it } from "vitest";

import {
  type CodeSnippet,
  decodeSnippetFallback,
  DEFAULT_STARTER_SNIPPETS,
  encodeSnippetFallback,
  filterAndSortSnippets,
  formatSnippetForStudent,
  getSnippetCategoryMeta,
  inferCodeSnippetSuggestion,
  isSnippetFallbackRow,
  normalizeSnippetCategory,
} from "./code-snippets";

describe("code-snippets helpers", () => {
  it("provides the default %matplotlib inline starter snippet", () => {
    expect(DEFAULT_STARTER_SNIPPETS).toHaveLength(1);
    expect(DEFAULT_STARTER_SNIPPETS[0].code).toBe("%matplotlib inline");
    expect(DEFAULT_STARTER_SNIPPETS[0].category).toBe("csa");
    expect(DEFAULT_STARTER_SNIPPETS[0].isPinned).toBe(true);
  });

  it("normalizes categories safely", () => {
    expect(normalizeSnippetCategory("csa")).toBe("csa");
    expect(normalizeSnippetCategory("PYTHON")).toBe("python");
    expect(normalizeSnippetCategory("unknown")).toBe("general");
    expect(normalizeSnippetCategory(null)).toBe("general");
    expect(getSnippetCategoryMeta("csa").shortLabel).toBe("CSA · Biểu đồ");
  });

  it("formats snippet with usage guide for copying to students", () => {
    const formatted = formatSnippetForStudent({
      title: "Sửa lỗi biểu đồ",
      code: "%matplotlib inline",
      usageGuide: "Em chèn dòng lệnh này vào đầu bài nhé.",
    });

    expect(formatted).toBe(
      "Em chèn dòng lệnh này vào đầu bài nhé.\n\n%matplotlib inline"
    );
  });

  it("falls back to title when usage guide is empty", () => {
    const formatted = formatSnippetForStudent({
      title: "Chạy biểu đồ trên Jupyter",
      code: "%matplotlib inline",
      usageGuide: "   ",
    });

    expect(formatted).toBe("Chạy biểu đồ trên Jupyter:\n\n%matplotlib inline");
  });

  it("filters by query and category and sorts pinned items first", () => {
    const items: CodeSnippet[] = [
      {
        id: "1",
        title: "Đọc file CSV bằng Pandas",
        code: "df = pd.read_csv('data.csv')",
        usageGuide: "Dùng để nạp bảng dữ liệu",
        category: "csa",
        isPinned: false,
        createdAt: "2026-10-01T10:00:00Z",
        updatedAt: "2026-10-01T10:00:00Z",
      },
      {
        id: "2",
        title: "Sửa lỗi không hiện biểu đồ",
        code: "%matplotlib inline",
        usageGuide: "Chèn ở đầu ô code đầu tiên",
        category: "csa",
        isPinned: true,
        createdAt: "2026-09-01T10:00:00Z",
        updatedAt: "2026-09-01T10:00:00Z",
      },
      {
        id: "3",
        title: "Cài đặt thư viện PyQt6",
        code: "pip install PyQt6",
        usageGuide: "Chạy trong Terminal",
        category: "setup",
        isPinned: false,
        createdAt: "2026-10-02T10:00:00Z",
        updatedAt: "2026-10-02T10:00:00Z",
      },
    ];

    const allSorted = filterAndSortSnippets(items, "", "all");
    expect(allSorted.map((i) => i.id)).toEqual(["2", "3", "1"]);

    const csaOnly = filterAndSortSnippets(items, "", "csa");
    expect(csaOnly.map((i) => i.id)).toEqual(["2", "1"]);

    const searchByCode = filterAndSortSnippets(items, "matplotlib", "all");
    expect(searchByCode.map((i) => i.id)).toEqual(["2"]);
  });

  it("encodes and decodes fallback rows cleanly", () => {
    const encoded = encodeSnippetFallback({
      title: "Sửa lỗi biểu đồ",
      code: "%matplotlib inline",
      usageGuide: "Chèn đầu bài",
      category: "csa",
      isPinned: true,
      createdAt: "2026-11-04T10:00:00Z",
      updatedAt: "2026-11-04T10:00:00Z",
    });

    expect(isSnippetFallbackRow(encoded.name)).toBe(true);
    const decoded = decodeSnippetFallback({
      id: "row-1",
      name: encoded.name,
      template_text: encoded.template_text,
    });

    expect(decoded).toEqual({
      id: "row-1",
      title: "Sửa lỗi biểu đồ",
      code: "%matplotlib inline",
      usageGuide: "Chèn đầu bài",
      category: "csa",
      isPinned: true,
      createdAt: "2026-11-04T10:00:00Z",
      updatedAt: "2026-11-04T10:00:00Z",
    });
  });

  it("infers intelligent suggestions for %matplotlib inline and pip commands", () => {
    const mpl = inferCodeSnippetSuggestion("%matplotlib inline");
    expect(mpl.category).toBe("csa");
    expect(mpl.title).toContain("biểu đồ");
    expect(mpl.usageGuide).toContain("em");

    const pip = inferCodeSnippetSuggestion("pip install seaborn");
    expect(pip.category).toBe("setup");
    expect(pip.usageGuide).toContain("Terminal");
  });
});
