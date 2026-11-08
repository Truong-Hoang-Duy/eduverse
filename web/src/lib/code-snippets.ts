export type SnippetCategory =
  | "scratch"
  | "gamemaker"
  | "app"
  | "web"
  | "cs";

export interface SnippetCategoryMeta {
  value: SnippetCategory;
  label: string;
  shortLabel: string;
  icon: string;
  fileLabel: string;
  badgeClass: string;
  accentBarClass: string;
  calloutClass: string;
}

/**
 * 5 môn học chuẩn theo lộ trình từ nhỏ đến lớn đã định nghĩa sẵn trong hệ thống:
 *   1. Scratch
 *   2. GameMaker
 *   3. App (Python & Qt Designer)
 *   4. Web (HTML/CSS/JS)
 *   5. Computer Science (Python / Thuật toán / Dữ liệu)
 */
export const SNIPPET_CATEGORIES: readonly SnippetCategoryMeta[] = [
  {
    value: "scratch",
    label: "Scratch",
    shortLabel: "Scratch",
    icon: "🐱",
    fileLabel: "scratch_blocks.sb3",
    badgeClass:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30",
    accentBarClass: "from-amber-500 via-orange-400 to-yellow-400",
    calloutClass:
      "border-l-amber-500 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]",
  },
  {
    value: "gamemaker",
    label: "GameMaker",
    shortLabel: "GameMaker",
    icon: "🎮",
    fileLabel: "game_script.gml",
    badgeClass:
      "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30",
    accentBarClass: "from-rose-500 via-pink-500 to-orange-400",
    calloutClass:
      "border-l-rose-500 bg-rose-500/[0.06] dark:bg-rose-500/[0.08]",
  },
  {
    value: "app",
    label: "App (Python & Qt)",
    shortLabel: "App",
    icon: "🖥️",
    fileLabel: "app_window.py",
    badgeClass:
      "bg-purple-500/12 text-purple-700 dark:text-purple-300 border-purple-500/30",
    accentBarClass: "from-purple-500 via-fuchsia-500 to-pink-500",
    calloutClass:
      "border-l-purple-500 bg-purple-500/[0.06] dark:bg-purple-500/[0.08]",
  },
  {
    value: "web",
    label: "Web (HTML/CSS/JS)",
    shortLabel: "Web",
    icon: "🌐",
    fileLabel: "app.js",
    badgeClass:
      "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    accentBarClass: "from-cyan-500 via-sky-500 to-blue-500",
    calloutClass:
      "border-l-cyan-500 bg-cyan-500/[0.06] dark:bg-cyan-500/[0.08]",
  },
  {
    value: "cs",
    label: "Computer Science",
    shortLabel: "Computer Science",
    icon: "🐍",
    fileLabel: "main.py",
    badgeClass:
      "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    accentBarClass: "from-emerald-500 via-teal-400 to-cyan-500",
    calloutClass:
      "border-l-emerald-500 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]",
  },
] as const;

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  usageGuide: string;
  category: SnippetCategory;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_STARTER_SNIPPETS: ReadonlyArray<
  Omit<CodeSnippet, "id" | "createdAt" | "updatedAt">
> = [
  {
    title:
      "Sửa lỗi không hiển thị biểu đồ khi chạy code (Jupyter / Matplotlib)",
    code: "%matplotlib inline",
    usageGuide: "",
    category: "cs",
    isPinned: true,
  },
];

export function isValidSnippetCategory(val: string): val is SnippetCategory {
  return SNIPPET_CATEGORIES.some((c) => c.value === val);
}

/**
 * Chuẩn hóa mã phân loại về đúng 1 trong 5 môn học đã định nghĩa:
 *   scratch | gamemaker | app | web | cs
 * Đồng thời tự động ánh xạ các nhãn cũ (csa, csb, python, setup, debug, general) về đúng môn.
 */
export function normalizeSnippetCategory(
  val: string | null | undefined
): SnippetCategory {
  if (!val) return "cs";
  const lower = val.trim().toLowerCase();
  if (isValidSnippetCategory(lower)) return lower;

  if (
    lower === "sb" ||
    lower === "sa" ||
    lower === "si" ||
    lower.includes("scratch")
  ) {
    return "scratch";
  }

  if (
    lower === "game" ||
    lower === "gml" ||
    lower === "gb" ||
    lower === "ga" ||
    lower === "gi" ||
    lower === "gmb" ||
    lower === "gma" ||
    lower === "gmi" ||
    lower.includes("gamemaker")
  ) {
    return "gamemaker";
  }

  if (
    lower === "ptb" ||
    lower === "pta" ||
    lower === "pti" ||
    lower === "apb" ||
    lower === "apa" ||
    lower === "api" ||
    lower === "pyqt" ||
    lower === "gui"
  ) {
    return "app";
  }

  if (
    lower === "jsb" ||
    lower === "jsa" ||
    lower === "jsi" ||
    lower === "wb" ||
    lower === "wa" ||
    lower === "wi" ||
    lower === "html" ||
    lower === "css" ||
    lower === "js"
  ) {
    return "web";
  }

  // Các nhãn cũ (csa, csb, csi, python, setup, debug, general, computer_science) gom gọn về Computer Science
  return "cs";
}

export function getSnippetCategoryMeta(
  category: string | null | undefined
): SnippetCategoryMeta {
  const norm = normalizeSnippetCategory(category);
  return (
    SNIPPET_CATEGORIES.find((c) => c.value === norm) ??
    SNIPPET_CATEGORIES[SNIPPET_CATEGORIES.length - 1]
  );
}

/**
 * Nhận diện nhãn tiêu đề cửa sổ IDE (terminal · bash, jupyter_notebook.ipynb, main.py, app.js...)
 * dựa trên nội dung đoạn code và môn học.
 */
export function getSnippetFileLabel(
  code: string,
  category: string | null | undefined
): string {
  const lower = code.trim().toLowerCase();
  if (
    lower.includes("curl ") ||
    lower.includes("powershell") ||
    lower.includes("uv pip ") ||
    lower.includes("uv venv") ||
    lower.startsWith("pip install") ||
    lower.startsWith("conda install") ||
    lower.includes("source ~/.zshrc")
  ) {
    return "terminal · bash";
  }
  if (lower.includes("%matplotlib") || lower.startsWith("!pip")) {
    return "jupyter_notebook.ipynb";
  }
  return getSnippetCategoryMeta(category).fileLabel;
}

/**
 * Định dạng văn bản đầy đủ (kèm lời hướng dẫn + đoạn code) nếu cần.
 */
export function formatSnippetForStudent(
  snippet: Pick<CodeSnippet, "title" | "code" | "usageGuide">
): string {
  const cleanCode = snippet.code.trim();
  const cleanGuide = snippet.usageGuide.trim();
  const cleanTitle = snippet.title.trim();

  if (cleanGuide) {
    return `${cleanGuide}\n\n${cleanCode}`;
  }
  if (cleanTitle) {
    return `${cleanTitle}:\n\n${cleanCode}`;
  }
  return cleanCode;
}

/**
 * Tự động phân tích đoạn code để gợi ý tiêu đề và môn học (trong 5 môn).
 */
export function inferCodeSnippetSuggestion(
  code: string,
  teacherHint?: string
): {
  title: string;
  usageGuide: string;
  category: SnippetCategory;
} {
  const c = code.trim();
  const lower = c.toLowerCase();
  const hint = (teacherHint ?? "").trim();

  if (lower.includes("%matplotlib inline")) {
    return {
      title:
        hint ||
        "Khắc phục lỗi không hiển thị biểu đồ Matplotlib trên Jupyter Notebook",
      usageGuide: "",
      category: "cs",
    };
  }

  if (lower.includes("plt.show()")) {
    return {
      title:
        hint ||
        "Hiển thị cửa sổ biểu đồ Matplotlib khi chạy file Python (.py)",
      usageGuide: "",
      category: "cs",
    };
  }

  if (
    lower.includes("utf-8") ||
    lower.includes("utf8") ||
    lower.includes("reconfigure")
  ) {
    return {
      title:
        hint || "Khắc phục lỗi font chữ tiếng Việt khi đọc file hoặc in ra màn hình",
      usageGuide: "",
      category: "cs",
    };
  }

  if (lower.includes("filterwarnings") || lower.includes("warnings.ignore")) {
    return {
      title: hint || "Ẩn các dòng cảnh báo đỏ (Warning) không cần thiết trên Jupyter",
      usageGuide: "",
      category: "cs",
    };
  }

  if (
    lower.includes("pd.set_option") ||
    lower.includes("display.max_columns") ||
    lower.includes("display.max_rows")
  ) {
    return {
      title:
        hint || "Hiển thị đầy đủ tất cả các cột / dòng của bảng dữ liệu Pandas",
      usageGuide: "",
      category: "cs",
    };
  }

  if (
    lower.includes("pyqt") ||
    lower.includes("pyside") ||
    lower.includes("qapplication") ||
    lower.includes("qmainwindow") ||
    lower.includes("qt designer") ||
    lower.includes("uic.loadui") ||
    lower.includes("tkinter")
  ) {
    return {
      title: hint || "Cấu trúc khởi tạo giao diện ứng dụng (Python & Qt)",
      usageGuide: "",
      category: "app",
    };
  }

  if (
    lower.includes("document.queryselector") ||
    lower.includes("addeventlistener") ||
    lower.includes("<html") ||
    lower.includes("fetch(")
  ) {
    return {
      title: hint || "Đoạn code mẫu xử lý giao diện & sự kiện Web",
      usageGuide: "",
      category: "web",
    };
  }

  if (
    lower.includes("place_meeting") ||
    lower.includes("instance_create") ||
    lower.includes("keyboard_check") ||
    lower.includes("sprite_index") ||
    lower.includes("room_goto")
  ) {
    return {
      title: hint || "Đoạn lệnh xử lý di chuyển & va chạm trong GameMaker",
      usageGuide: "",
      category: "gamemaker",
    };
  }

  if (
    lower.includes("khi bấm vào lá cờ") ||
    lower.includes("scratch") ||
    hint.toLowerCase().includes("scratch")
  ) {
    return {
      title: hint || "Ghi chú kịch bản khối lệnh Scratch",
      usageGuide: "",
      category: "scratch",
    };
  }

  if (
    lower.includes("pip install") ||
    lower.includes("conda install") ||
    lower.startsWith("!pip") ||
    lower.includes("uv pip install")
  ) {
    return {
      title: hint || `Lệnh cài đặt thư viện (${c.split("\n")[0].slice(0, 40)})`,
      usageGuide: "",
      category: "cs",
    };
  }

  if (
    lower.includes("pandas") ||
    lower.includes("pd.read_") ||
    lower.includes("plt.") ||
    lower.includes("seaborn") ||
    lower.includes("sns.")
  ) {
    return {
      title: hint || "Đoạn lệnh xử lý dữ liệu & vẽ biểu đồ (Pandas / Matplotlib)",
      usageGuide: "",
      category: "cs",
    };
  }

  return {
    title: hint || `Đoạn code mẫu: ${c.split("\n")[0].slice(0, 50)}`,
    usageGuide: "",
    category: "cs",
  };
}

/**
 * Lọc và sắp xếp danh sách đoạn code:
 * - Các mục được ghim (isPinned = true) luôn hiển thị trên cùng.
 * - Hỗ trợ lọc theo danh mục (đã chuẩn hóa về 5 môn) và từ khóa tìm kiếm (không phân biệt hoa/thường).
 */
export function filterAndSortSnippets(
  snippets: readonly CodeSnippet[],
  searchQuery: string,
  categoryFilter: string
): CodeSnippet[] {
  const q = searchQuery.trim().toLowerCase();
  const cat = categoryFilter.trim().toLowerCase();

  return snippets
    .filter((item) => {
      const itemCat = normalizeSnippetCategory(item.category);
      if (cat && cat !== "all" && itemCat !== normalizeSnippetCategory(cat)) {
        return false;
      }
      if (!q) return true;
      const catMeta = getSnippetCategoryMeta(itemCat);
      const haystack = [
        item.title,
        item.code,
        catMeta.label,
        catMeta.shortLabel,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

// ---------- Fallback mã hóa vào zalo_templates nếu bảng code_snippets chưa được tạo trên DB live ----------
export const SNIPPET_FALLBACK_PREFIX = "__CODE_SNIPPET__:";

export function isSnippetFallbackRow(name: string | null | undefined): boolean {
  return typeof name === "string" && name.startsWith(SNIPPET_FALLBACK_PREFIX);
}

interface FallbackPayload {
  title: string;
  code: string;
  usageGuide: string;
  category: SnippetCategory;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export function encodeSnippetFallback(payload: FallbackPayload): {
  name: string;
  template_text: string;
} {
  const safeTitle = payload.title.trim().slice(0, 80) || "Đoạn code";
  return {
    name: `${SNIPPET_FALLBACK_PREFIX}${safeTitle}:${Date.now()}`,
    template_text: JSON.stringify(payload),
  };
}

export function decodeSnippetFallback(row: {
  id: string;
  name: string;
  template_text: string;
}): CodeSnippet | null {
  if (!isSnippetFallbackRow(row.name)) return null;
  try {
    const parsed = JSON.parse(row.template_text) as Partial<FallbackPayload>;
    if (!parsed || typeof parsed.code !== "string") return null;
    const nowIso = new Date().toISOString();
    return {
      id: row.id,
      title: (parsed.title ?? "Đoạn code mẫu").trim(),
      code: parsed.code,
      usageGuide: (parsed.usageGuide ?? "").trim(),
      category: normalizeSnippetCategory(parsed.category),
      isPinned: Boolean(parsed.isPinned),
      createdAt: parsed.createdAt ?? nowIso,
      updatedAt: parsed.updatedAt ?? nowIso,
    };
  } catch {
    return null;
  }
}
