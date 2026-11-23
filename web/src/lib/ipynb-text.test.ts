import { describe, expect, it } from "vitest";

import { ipynbToText } from "./ipynb-text";

describe("ipynbToText", () => {
  it("should extract code and markdown cells cleanly", () => {
    const notebook = {
      cells: [
        {
          cell_type: "markdown",
          source: ["# Bai tap 1\n", "Phan tich du lieu"],
        },
        {
          cell_type: "code",
          source: ["import pandas as pd\n", "df = pd.DataFrame({'a': [1, 2]})"],
          outputs: [
            {
              data: {
                "text/plain": ["   a\n0  1\n1  2"],
                "image/png": "iVBORw0KGgoAAAANSUhEUgAA...very_long_base64_string...",
              },
            },
          ],
        },
      ],
    };

    const result = ipynbToText(JSON.stringify(notebook));
    expect(result).toContain("# [Cell 1 - Markdown]");
    expect(result).toContain("# Bai tap 1\nPhan tich du lieu");
    expect(result).toContain("# [Cell 2 - Code]");
    expect(result).toContain("import pandas as pd");
    expect(result).toContain("# [Output]");
    expect(result).toContain("0  1\n# 1  2");
    // Does NOT contain base64 image data
    expect(result).not.toContain("very_long_base64_string");
  });

  it("should handle error outputs and stream text outputs", () => {
    const notebook = {
      cells: [
        {
          cell_type: "code",
          source: "print('Hello world')",
          outputs: [
            {
              output_type: "stream",
              text: ["Hello world\n"],
            },
          ],
        },
        {
          cell_type: "code",
          source: "1 / 0",
          outputs: [
            {
              output_type: "error",
              ename: "ZeroDivisionError",
              evalue: "division by zero",
            },
          ],
        },
      ],
    };

    const result = ipynbToText(JSON.stringify(notebook));
    expect(result).toContain("Hello world");
    expect(result).toContain("Error: ZeroDivisionError: division by zero");
  });

  it("should return raw string if not valid JSON", () => {
    const badJson = "not json at all";
    expect(ipynbToText(badJson)).toBe(badJson);
  });

  it("should skip empty cells but maintain numbering", () => {
    const notebook = {
      cells: [
        { cell_type: "code", source: "" },
        { cell_type: "code", source: "x = 42" },
      ],
    };
    const result = ipynbToText(JSON.stringify(notebook));
    expect(result).toContain("# [Cell 2 - Code]");
    expect(result).toContain("x = 42");
    expect(result).not.toContain("# [Cell 1");
  });
});
