export type SnippetCategory =
  | "csa"
  | "csb"
  | "python"
  | "app"
  | "web"
  | "debug"
  | "setup"
  | "general";

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

export const SNIPPET_CATEGORIES: readonly SnippetCategoryMeta[] = [
  {
    value: "csa",
    label: "CSA · Dữ liệu & Biểu đồ",
    shortLabel: "CSA · Biểu đồ",
    icon: "📊",
    fileLabel: "jupyter_notebook.ipynb",
    badgeClass:
      "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    accentBarClass: "from-emerald-500 via-teal-400 to-cyan-500",
    calloutClass:
      "border-l-emerald-500 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.08]",
  },
  {
    value: "csb",
    label: "CSB · Python nền tảng",
    shortLabel: "CSB · Python",
    icon: "🐍",
    fileLabel: "main.py",
    badgeClass:
      "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/30",
    accentBarClass: "from-blue-500 via-indigo-500 to-sky-400",
    calloutClass:
      "border-l-blue-500 bg-blue-500/[0.06] dark:bg-blue-500/[0.08]",
  },
  {
    value: "debug",
    label: "Sửa lỗi hay gặp",
    shortLabel: "Sửa lỗi",
    icon: "🛠️",
    fileLabel: "quick_fix.py",
    badgeClass:
      "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30",
    accentBarClass: "from-rose-500 via-pink-500 to-amber-400",
    calloutClass:
      "border-l-rose-500 bg-rose-500/[0.06] dark:bg-rose-500/[0.08]",
  },
  {
    value: "setup",
    label: "Cài đặt & Môi trường",
    shortLabel: "Cài đặt",
    icon: "⚙️",
    fileLabel: "terminal · bash",
    badgeClass:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30",
    accentBarClass: "from-amber-500 via-orange-400 to-yellow-400",
    calloutClass:
      "border-l-amber-500 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]",
  },
  {
    value: "python",
    label: "Python chung",
    shortLabel: "Python",
    icon: "⚡",
    fileLabel: "colab_script.py",
    badgeClass:
      "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    accentBarClass: "from-indigo-500 via-violet-500 to-purple-500",
    calloutClass:
      "border-l-indigo-500 bg-indigo-500/[0.06] dark:bg-indigo-500/[0.08]",
  },
  {
    value: "app",
    label: "App · Giao diện PyQt/GUI",
    shortLabel: "App / GUI",
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
    label: "Web · HTML/CSS/JS",
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
    value: "general",
    label: "Khác",
    shortLabel: "Khác",
    icon: "📝",
    fileLabel: "snippet.txt",
    badgeClass: "bg-muted text-muted-foreground border-border",
    accentBarClass: "from-slate-500 via-zinc-400 to-slate-400",
    calloutClass: "border-l-slate-400 bg-muted/50",
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
    usageGuide:
      "Khi em đã gõ đúng câu lệnh vẽ biểu đồ nhưng chạy không thấy hình hiện ra, hãy chèn dòng lệnh này vào đầu ô code đầu tiên của bài rồi chạy lại nhé.",
    category: "csa",
    isPinned: true,
  },
];

export function isValidSnippetCategory(val: string): val is SnippetCategory {
  return SNIPPET_CATEGORIES.some((c) => c.value === val);
}

export function normalizeSnippetCategory(
  val: string | null | undefined
): SnippetCategory {
  if (!val) return "general";
  const lower = val.trim().toLowerCase();
  return isValidSnippetCategory(lower) ? lower : "general";
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
 * Định dạng văn bản đầy đủ (kèm lời hướng dẫn + đoạn code) để giáo viên copy 1 chạm gửi thẳng cho học sinh qua Zalo/Zoom/Meet.
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
 * Tự động phân tích đoạn code để gợi ý tiêu đề, hướng dẫn và danh mục (dùng làm fallback tức thì nếu máy chủ AI đang cập nhật).
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
      usageGuide:
        "Khi em đã gõ đúng câu lệnh vẽ biểu đồ nhưng chạy không thấy hình hiện ra, hãy chèn dòng lệnh này vào dòng đầu tiên của ô code đầu bài rồi chạy lại nhé.",
      category: "csa",
    };
  }

  if (lower.includes("plt.show()")) {
    return {
      title:
        hint ||
        "Hiển thị cửa sổ biểu đồ Matplotlib khi chạy file Python (.py)",
      usageGuide:
        "Em thêm dòng lệnh này vào cuối phần code vẽ biểu đồ để chương trình bật cửa sổ hiển thị hình vẽ lên màn hình nhé.",
      category: "csa",
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
      usageGuide:
        "Khi đọc file hoặc in chữ tiếng Việt bị lỗi ký tự lạ, em thêm thiết lập bảng mã UTF-8 này vào câu lệnh để hiển thị đúng tiếng Việt nhé.",
      category: "debug",
    };
  }

  if (lower.includes("filterwarnings") || lower.includes("warnings.ignore")) {
    return {
      title: hint || "Ẩn các dòng cảnh báo đỏ (Warning) không cần thiết trên Jupyter",
      usageGuide:
        "Em chèn đoạn lệnh này vào ô code đầu tiên để ẩn bớt các thông báo cảnh báo dài dòng, giúp kết quả bài làm gọn gàng và dễ nhìn hơn nhé.",
      category: "csa",
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
      usageGuide:
        "Khi bảng dữ liệu bị ẩn bớt các cột ở giữa bằng dấu '...', em chạy dòng lệnh này để xem toàn bộ các cột của bảng nhé.",
      category: "csa",
    };
  }

  if (
    lower.includes("pip install") ||
    lower.includes("conda install") ||
    lower.startsWith("!pip")
  ) {
    return {
      title: hint || `Lệnh cài đặt thư viện (${c.slice(0, 40)})`,
      usageGuide:
        "Em mở Terminal (hoặc ô code trong Jupyter nếu có dấu ! ở đầu) rồi dán câu lệnh này vào và nhấn Enter để cài đặt thư viện trước khi chạy bài nhé.",
      category: "setup",
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
      usageGuide:
        "Em chèn đoạn code này vào bài làm tại bước xử lý dữ liệu hoặc vẽ biểu đồ, lưu ý kiểm tra lại tên biến DataFrame và tên cột cho khớp với bộ dữ liệu của bài nhé.",
      category: "csa",
    };
  }

  if (
    lower.includes("pyqt") ||
    lower.includes("qapplication") ||
    lower.includes("qmainwindow") ||
    lower.includes("tkinter")
  ) {
    return {
      title: hint || "Cấu trúc khởi tạo giao diện ứng dụng (GUI)",
      usageGuide:
        "Em đặt đoạn code này ở phần khởi tạo cửa sổ chương trình để hiển thị giao diện ứng dụng mượt mà nhé.",
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
      usageGuide:
        "Em thêm đoạn code này vào file HTML/CSS/JS tương ứng trong dự án Web của mình rồi tải lại trang để kiểm tra kết quả nhé.",
      category: "web",
    };
  }

  return {
    title: hint || `Đoạn code mẫu: ${c.split("\n")[0].slice(0, 50)}`,
    usageGuide:
      "Em tham khảo và chèn đoạn lệnh này vào đúng vị trí tương ứng trong bài làm của mình, sau đó chạy thử lại chương trình nhé.",
    category: "python",
  };
}

/**
 * Lọc và sắp xếp danh sách đoạn code:
 * - Các mục được ghim (isPinned = true) luôn hiển thị trên cùng.
 * - Hỗ trợ lọc theo danh mục và từ khóa tìm kiếm (không phân biệt hoa/thường).
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
      if (cat && cat !== "all" && item.category !== cat) {
        return false;
      }
      if (!q) return true;
      const catMeta = getSnippetCategoryMeta(item.category);
      const haystack = [
        item.title,
        item.code,
        item.usageGuide,
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
      title:
        typeof parsed.title === "string" && parsed.title.trim()
          ? parsed.title.trim()
          : "Đoạn code mẫu",
      code: parsed.code,
      usageGuide:
        typeof parsed.usageGuide === "string" ? parsed.usageGuide : "",
      category: normalizeSnippetCategory(parsed.category),
      isPinned: Boolean(parsed.isPinned),
      createdAt:
        typeof parsed.createdAt === "string" ? parsed.createdAt : nowIso,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : nowIso,
    };
  } catch {
    return null;
  }
}
