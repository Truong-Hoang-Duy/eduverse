import { describe, expect, it } from "vitest";

import {
  type CodeSnippet,
  decodeSnippetFallback,
  DEFAULT_STARTER_SNIPPETS,
  encodeSnippetFallback,
  filterAndSortSnippets,
  formatSnippetForStudent,
  getSnippetCategoryMeta,
  getSnippetFileLabel,
  inferCodeSnippetSuggestion,
  isSnippetFallbackRow,
  normalizeSnippetCategory,
  SNIPPET_CATEGORIES,
} from "./code-snippets";

describe("code-snippets helpers", () => {
  it("provides the 5 predefined subjects in roadmap order", () => {
    expect(SNIPPET_CATEGORIES.map((c) => c.value)).toEqual([
      "scratch",
      "gamemaker",
      "app",
      "web",
      "cs",
    ]);
  });

  it("provides the default %matplotlib inline starter snippet", () => {
    expect(DEFAULT_STARTER_SNIPPETS).toHaveLength(1);
    expect(DEFAULT_STARTER_SNIPPETS[0].code).toBe("%matplotlib inline");
    expect(DEFAULT_STARTER_SNIPPETS[0].category).toBe("cs");
    expect(DEFAULT_STARTER_SNIPPETS[0].isPinned).toBe(true);
  });

  it("normalizes categories and maps legacy categories to the 5 subjects safely", () => {
    expect(normalizeSnippetCategory("scratch")).toBe("scratch");
    expect(normalizeSnippetCategory("gamemaker")).toBe("gamemaker");
    expect(normalizeSnippetCategory("app")).toBe("app");
    expect(normalizeSnippetCategory("web")).toBe("web");
    expect(normalizeSnippetCategory("cs")).toBe("cs");
    expect(normalizeSnippetCategory("csa")).toBe("cs");
    expect(normalizeSnippetCategory("csb")).toBe("cs");
    expect(normalizeSnippetCategory("PYTHON")).toBe("cs");
    expect(normalizeSnippetCategory("setup")).toBe("cs");
    expect(normalizeSnippetCategory("unknown")).toBe("cs");
    expect(normalizeSnippetCategory(null)).toBe("cs");
    expect(getSnippetCategoryMeta("csa").shortLabel).toBe("Computer Science");
    expect(getSnippetCategoryMeta("app").shortLabel).toBe("App");
  });

  it("detects appropriate IDE window file labels", () => {
    expect(getSnippetFileLabel("uv pip install numpy", "cs")).toBe(
      "terminal · bash"
    );
    expect(getSnippetFileLabel("%matplotlib inline", "cs")).toBe(
      "jupyter_notebook.ipynb"
    );
    expect(getSnippetFileLabel("print('hello')", "cs")).toBe("main.py");
    expect(getSnippetFileLabel("console.log(1)", "web")).toBe("app.js");
  });

  it("formats snippet for copying to students", () => {
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
        usageGuide: "",
        category: "cs",
        isPinned: false,
        createdAt: "2026-10-01T10:00:00Z",
        updatedAt: "2026-10-01T10:00:00Z",
      },
      {
        id: "2",
        title: "Sửa lỗi không hiện biểu đồ",
        code: "%matplotlib inline",
        usageGuide: "",
        category: "cs",
        isPinned: true,
        createdAt: "2026-09-01T10:00:00Z",
        updatedAt: "2026-09-01T10:00:00Z",
      },
      {
        id: "3",
        title: "Khởi tạo cửa sổ PyQt6",
        code: "app = QApplication([])",
        usageGuide: "",
        category: "app",
        isPinned: false,
        createdAt: "2026-10-02T10:00:00Z",
        updatedAt: "2026-10-02T10:00:00Z",
      },
    ];

    const allSorted = filterAndSortSnippets(items, "", "all");
    expect(allSorted.map((i) => i.id)).toEqual(["2", "3", "1"]);

    const csOnly = filterAndSortSnippets(items, "", "cs");
    expect(csOnly.map((i) => i.id)).toEqual(["2", "1"]);

    const searchByCode = filterAndSortSnippets(items, "matplotlib", "all");
    expect(searchByCode.map((i) => i.id)).toEqual(["2"]);
  });

  it("encodes and decodes fallback rows cleanly", () => {
    const encoded = encodeSnippetFallback({
      title: "Sửa lỗi biểu đồ",
      code: "%matplotlib inline",
      usageGuide: "",
      category: "cs",
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
      usageGuide: "",
      category: "cs",
      isPinned: true,
      createdAt: "2026-11-04T10:00:00Z",
      updatedAt: "2026-11-04T10:00:00Z",
    });
  });

  it("infers intelligent suggestions for %matplotlib inline and PyQt commands", () => {
    const mpl = inferCodeSnippetSuggestion("%matplotlib inline");
    expect(mpl.category).toBe("cs");
    expect(mpl.title).toContain("biểu đồ");

    const pyqt = inferCodeSnippetSuggestion("from PyQt6.QtWidgets import QApplication");
    expect(pyqt.category).toBe("app");
  });
});
