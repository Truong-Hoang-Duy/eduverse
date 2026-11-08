"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCodeSnippet,
  saveCodeSnippet,
  suggestCodeSnippetWithAi,
  togglePinCodeSnippet,
} from "@/lib/actions/snippets";
import {
  type CodeSnippet,
  filterAndSortSnippets,
  getSnippetCategoryMeta,
  getSnippetFileLabel,
  normalizeSnippetCategory,
  SNIPPET_CATEGORIES,
  type SnippetCategory,
} from "@/lib/code-snippets";
import { cn } from "@/lib/utils";

interface SnippetsManagerProps {
  initialSnippets: CodeSnippet[];
  readOnly?: boolean;
}

const PYTHON_KEYWORDS = new Set([
  "import",
  "from",
  "as",
  "with",
  "def",
  "class",
  "return",
  "if",
  "elif",
  "else",
  "for",
  "while",
  "in",
  "not",
  "and",
  "or",
  "try",
  "except",
  "finally",
  "raise",
  "True",
  "False",
  "None",
  "async",
  "await",
  "lambda",
  "yield",
  "pass",
  "break",
  "continue",
  "const",
  "let",
  "var",
  "function",
]);

const BUILTIN_CALLS = new Set([
  "print",
  "open",
  "len",
  "range",
  "str",
  "int",
  "float",
  "list",
  "dict",
  "set",
  "super",
  "input",
  "type",
  "enumerate",
  "zip",
]);

/**
 * Tô màu cú pháp (Syntax Highlighting) nhẹ nhàng cho từng dòng code để khung IDE sinh động, dễ nhìn.
 */
function highlightCodeLine(line: string): ReactNode {
  const trimmed = line.trim();

  // Dòng comment (# ... hoặc // ...)
  if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
    return <span className="italic text-slate-400/90">{line}</span>;
  }

  // Dòng lệnh magic Jupyter / Terminal (%matplotlib, !pip, pip install...)
  if (
    trimmed.startsWith("%") ||
    trimmed.startsWith("!") ||
    /^pip\s+install\b/i.test(trimmed) ||
    /^conda\s+install\b/i.test(trimmed)
  ) {
    const parts = line.split(/(\s+)/);
    return parts.map((part, idx) => {
      if (idx === 0 || part.startsWith("%") || part.startsWith("!")) {
        return (
          <span key={idx} className="font-semibold text-amber-300">
            {part}
          </span>
        );
      }
      if (part.startsWith("-")) {
        return (
          <span key={idx} className="text-sky-300">
            {part}
          </span>
        );
      }
      return (
        <span key={idx} className="text-emerald-300">
          {part}
        </span>
      );
    });
  }

  // Tách chuỗi ('...', "..."), comment cuối dòng (#...), từ khóa và định danh
  const tokenRegex =
    /(#.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_][A-Za-z0-9_]*\b|\d+(?:\.\d+)?)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith("#")) {
      nodes.push(
        <span key={key} className="italic text-slate-400/90">
          {token}
        </span>
      );
    } else if (token.startsWith("'") || token.startsWith('"')) {
      nodes.push(
        <span key={key} className="text-emerald-300">
          {token}
        </span>
      );
    } else if (/^\d/.test(token)) {
      nodes.push(
        <span key={key} className="text-amber-300">
          {token}
        </span>
      );
    } else if (PYTHON_KEYWORDS.has(token)) {
      nodes.push(
        <span key={key} className="font-semibold text-purple-400">
          {token}
        </span>
      );
    } else if (BUILTIN_CALLS.has(token)) {
      nodes.push(
        <span key={key} className="text-sky-300">
          {token}
        </span>
      );
    } else {
      const nextChar = line[match.index + token.length];
      if (nextChar === "(") {
        nodes.push(
          <span key={key} className="text-sky-300">
            {token}
          </span>
        );
      } else {
        nodes.push(
          <span key={key} className="text-zinc-100">
            {token}
          </span>
        );
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : line;
}

export function SnippetsManager({
  initialSnippets,
  readOnly = false,
}: SnippetsManagerProps) {
  const [snippets, setSnippets] = useState<CodeSnippet[]>(initialSnippets);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Trạng thái copy phản hồi tức thì
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Trạng thái Dialog Thêm / Sửa
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SnippetCategory>("cs");
  const [isPinned, setIsPinned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  const [isSaving, startSaveTransition] = useTransition();
  const [isAiLoading, startAiTransition] = useTransition();
  const [pendingPinId, setPendingPinId] = useState<string | null>(null);

  const filteredSnippets = useMemo(
    () => filterAndSortSnippets(snippets, searchQuery, categoryFilter),
    [snippets, searchQuery, categoryFilter]
  );

  // Đếm số lượng theo từng môn học (đã chuẩn hóa về 5 môn) để hiển thị trên thanh lọc
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: snippets.length };
    for (const s of snippets) {
      const norm = normalizeSnippetCategory(s.category);
      counts[norm] = (counts[norm] ?? 0) + 1;
    }
    return counts;
  }, [snippets]);

  function openCreateDialog() {
    setEditingId(null);
    setCode("");
    setTitle("");
    setCategory("cs");
    setIsPinned(false);
    setFormError(null);
    setAiSuccessMsg(null);
    setDialogOpen(true);
  }

  function openEditDialog(item: CodeSnippet) {
    setEditingId(item.id);
    setCode(item.code);
    setTitle(item.title);
    setCategory(normalizeSnippetCategory(item.category));
    setIsPinned(item.isPinned);
    setFormError(null);
    setAiSuccessMsg(null);
    setDialogOpen(true);
  }

  async function handleCopyCode(item: CodeSnippet) {
    try {
      await navigator.clipboard.writeText(item.code.trim());
      setCopiedCodeId(item.id);
      setTimeout(() => {
        setCopiedCodeId((prev) => (prev === item.id ? null : prev));
      }, 2000);
    } catch {
      // Bỏ qua nếu trình duyệt chặn clipboard
    }
  }

  function handleAiSuggest() {
    if (!code.trim()) {
      setFormError(
        "Bạn hãy dán đoạn code vào ô bên dưới trước khi bấm '✨ AI đặt tên & chọn môn' nhé."
      );
      return;
    }
    setFormError(null);
    setAiSuccessMsg(null);

    startAiTransition(async () => {
      try {
        const res = await suggestCodeSnippetWithAi({
          code,
          teacherHint: title.trim() || undefined,
        });
        if (res.error) {
          setFormError(res.error);
          return;
        }
        if (res.title) setTitle(res.title);
        if (res.category) setCategory(normalizeSnippetCategory(res.category));
        setAiSuccessMsg(
          "✨ AI đã gợi ý xong tiêu đề và môn học! Bạn có thể bấm Lưu ngay."
        );
      } catch {
        setFormError(
          "Không kết nối được máy chủ AI. Vui lòng thử lại sau ít giây."
        );
      }
    });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    startSaveTransition(async () => {
      const res = await saveCodeSnippet({
        id: editingId ?? undefined,
        title,
        code,
        usageGuide: "",
        category,
        isPinned,
      });

      if (res.error) {
        setFormError(res.error);
        return;
      }

      if (res.snippet) {
        const saved = res.snippet;
        setSnippets((prev) => {
          const exists = prev.some((x) => x.id === saved.id);
          if (exists) {
            return prev.map((x) => (x.id === saved.id ? saved : x));
          }
          return [saved, ...prev];
        });
      }
      setDialogOpen(false);
    });
  }

  async function handleTogglePin(item: CodeSnippet) {
    const nextPinned = !item.isPinned;
    setPendingPinId(item.id);
    setSnippets((prev) =>
      prev.map((x) => (x.id === item.id ? { ...x, isPinned: nextPinned } : x))
    );
    const res = await togglePinCodeSnippet(item.id, nextPinned);
    if (res.error) {
      setSnippets((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, isPinned: item.isPinned } : x
        )
      );
    }
    setPendingPinId(null);
  }

  async function handleDeleteAction(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    const prevList = snippets;
    setSnippets((prev) => prev.filter((x) => x.id !== id));
    const res = await deleteCodeSnippet(id);
    if (res.error) {
      setSnippets(prevList);
    }
  }

  return (
    <div className="space-y-6">
      {/* Thanh công cụ: Tìm kiếm + Lọc theo 5 môn học + Nút thêm mới */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Tìm nhanh theo lỗi, câu lệnh (VD: matplotlib, biểu đồ, zip, pandas...)"
              className="h-10 w-full bg-background pr-4"
            />
          </div>
          {!readOnly && (
            <Button
              type="button"
              onClick={openCreateDialog}
              className="h-10 shrink-0 cursor-pointer font-semibold shadow-xs"
            >
              + Thêm đoạn code mới
            </Button>
          )}
        </div>

        {/* Bộ lọc 5 môn học chuẩn lộ trình */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              categoryFilter === "all"
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            📚 Tất cả ({categoryCounts.all ?? 0})
          </button>
          {SNIPPET_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.value] ?? 0;
            const active = categoryFilter === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategoryFilter(cat.value)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {cat.icon} {cat.shortLabel}
                {count > 0 ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Danh sách thẻ Sổ tay Code */}
      {filteredSnippets.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <p className="text-base font-semibold">
            {snippets.length === 0
              ? "Chưa có đoạn code nào trong Sổ tay"
              : "Không tìm thấy đoạn code phù hợp với bộ lọc"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {snippets.length === 0
              ? "Lưu lại các câu lệnh sửa lỗi hoặc code mẫu để copy gửi học viên chỉ với 1 chạm."
              : "Hãy thử từ khóa khác hoặc chuyển bộ lọc về 'Tất cả'."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {snippets.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }}
              >
                Xóa bộ lọc
              </Button>
            )}
            {!readOnly && (
              <Button type="button" onClick={openCreateDialog}>
                + Thêm đoạn code mới
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredSnippets.map((item) => {
            const catMeta = getSnippetCategoryMeta(item.category);
            const fileLabel = getSnippetFileLabel(item.code, item.category);
            const isCodeCopied = copiedCodeId === item.id;
            const rawLines = item.code.trim().split("\n");
            const lineCount = rawLines.length;

            return (
              <Card
                key={item.id}
                className={cn(
                  "group relative flex flex-col gap-0 overflow-hidden rounded-2xl border p-0 transition-all duration-200 hover:border-primary/40 hover:shadow-md",
                  item.isPinned
                    ? "border-amber-500/35 bg-gradient-to-b from-amber-500/[0.03] to-transparent shadow-sm"
                    : "bg-card shadow-xs"
                )}
              >
                {/* Dải màu điểm nhấn trên đỉnh thẻ theo 5 môn học */}
                <div
                  className={cn(
                    "h-1.5 w-full bg-gradient-to-r",
                    catMeta.accentBarClass
                  )}
                />

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  {/* Hàng 1: Nhãn môn học + Cụm nút quản lý */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.isPinned && (
                        <Badge
                          variant="secondary"
                          className="border border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-300 text-[11px] font-semibold"
                        >
                          {readOnly ? "📌 Quan trọng" : "📌 Đã ghim"}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-semibold",
                          catMeta.badgeClass
                        )}
                      >
                        <span className="mr-1">{catMeta.icon}</span>
                        {catMeta.label}
                      </Badge>
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pendingPinId === item.id}
                          onClick={() => handleTogglePin(item)}
                          title={
                            item.isPinned
                              ? "Bỏ ghim khỏi đầu trang"
                              : "Ghim lên đầu trang"
                          }
                          className="h-6 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:bg-background hover:text-foreground cursor-pointer"
                        >
                          {item.isPinned ? "Bỏ ghim" : "📌 Ghim"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="h-6 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:bg-background hover:text-foreground cursor-pointer"
                        >
                          Sửa
                        </Button>
                        <ConfirmDialog
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 rounded-md px-2 text-[11px] font-medium text-destructive hover:bg-destructive/15 hover:text-destructive cursor-pointer"
                            >
                              Xóa
                            </Button>
                          }
                          title="Xóa đoạn code này?"
                          description={`Bạn có chắc muốn xóa "${item.title}" khỏi Sổ tay Code không?`}
                          confirmLabel="Xóa"
                          action={handleDeleteAction}
                          fields={{ id: item.id }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Hàng 2: Tiêu đề nổi bật */}
                  <h3 className="mt-3 text-base sm:text-[17px] font-bold leading-snug tracking-tight text-foreground">
                    {item.title}
                  </h3>

                  {/* Hàng 3: Khung cửa sổ IDE hiển thị code */}
                  <div className="mt-3.5 flex flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800/90 bg-[#0d1117] shadow-inner">
                    {/* Thanh tiêu đề cửa sổ IDE kiểu macOS */}
                    <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-3.5 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-rose-500/85" />
                          <span className="size-2.5 rounded-full bg-amber-400/85" />
                          <span className="size-2.5 rounded-full bg-emerald-500/85" />
                        </div>
                        <span className="ml-1.5 font-mono text-[11px] font-medium text-zinc-400">
                          {fileLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded bg-zinc-800/90 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                          {lineCount} dòng
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(item)}
                          className={cn(
                            "cursor-pointer rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors",
                            isCodeCopied
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                          )}
                        >
                          {isCodeCopied ? "✓ Đã chép" : "Copy"}
                        </button>
                      </div>
                    </div>

                    {/* Vùng nội dung code có đánh số dòng & tô màu cú pháp (chỉ căn giữa dọc khi có 1 dòng, còn nhiều dòng luôn bắt đầu từ dòng 01 ở trên cùng) */}
                    <div
                      className={cn(
                        "flex flex-1 flex-col overflow-x-auto overflow-y-auto max-h-64 px-3 py-3 font-mono text-xs sm:text-[13px] leading-6",
                        lineCount === 1 ? "justify-center" : "justify-start"
                      )}
                    >
                      {lineCount === 1 && (
                        <div className="flex items-baseline gap-3 text-slate-500 select-none">
                          <span className="w-5 shrink-0 text-right text-[11px] text-zinc-600">
                            01
                          </span>
                          <span className="italic text-[12px] text-slate-500">
                            # Chèn dòng lệnh này vào đầu ô code rồi chạy lại:
                          </span>
                        </div>
                      )}
                      {rawLines.map((lineText, idx) => {
                        const displayLineNum =
                          lineCount === 1 ? 2 : idx + 1;
                        const numLabel =
                          displayLineNum < 10
                            ? `0${displayLineNum}`
                            : String(displayLineNum);
                        return (
                          <div
                            key={idx}
                            className="flex items-baseline gap-3 hover:bg-white/[0.03] rounded px-1 -mx-1"
                          >
                            <span className="w-5 shrink-0 select-none text-right text-[11px] text-zinc-600">
                              {numLabel}
                            </span>
                            <span className="whitespace-pre-wrap break-all text-zinc-100">
                              {lineText ? (
                                highlightCodeLine(lineText)
                              ) : (
                                <span>&nbsp;</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hàng 4: Nút Copy 1 chạm dưới chân thẻ */}
                  <div className="mt-3.5 flex items-center">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCopyCode(item)}
                      className={cn(
                        "h-9 w-full cursor-pointer text-xs font-semibold shadow-xs transition-all",
                        isCodeCopied &&
                          "bg-emerald-600 text-white hover:bg-emerald-600"
                      )}
                    >
                      {isCodeCopied ? "✓ Đã copy code!" : "📋 Copy đoạn code"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Popup Thêm / Sửa đoạn code có tích hợp nút ✨ AI đặt tên & chọn môn */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Chỉnh sửa đoạn code" : "Thêm đoạn code vào Sổ tay"}
            </DialogTitle>
            <DialogDescription>
              Chỉ cần dán đoạn code rồi bấm{" "}
              <span className="font-semibold text-foreground">
                ✨ AI đặt tên & chọn môn
              </span>{" "}
              — AI sẽ tự động đặt tiêu đề và chọn đúng môn học cho bạn.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Bước 1: Dán đoạn code + Nút AI gợi ý */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="snippet-code" className="text-sm font-semibold">
                  1. Đoạn code cần lưu <span className="text-destructive">*</span>
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isAiLoading || isSaving}
                  onClick={handleAiSuggest}
                  className="h-8 cursor-pointer border border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  {isAiLoading
                    ? "⏳ AI đang phân tích..."
                    : "✨ AI đặt tên & chọn môn"}
                </Button>
              </div>
              <Textarea
                id="snippet-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ví dụ: %matplotlib inline"
                rows={5}
                className="font-mono text-sm"
                required
              />
            </div>

            {aiSuccessMsg && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {aiSuccessMsg}
              </div>
            )}

            {formError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {formError}
              </div>
            )}

            {/* Bước 2: Tiêu đề / Tên vấn đề */}
            <div className="space-y-1.5">
              <Label htmlFor="snippet-title" className="text-sm font-semibold">
                2. Tên vấn đề / Tình huống{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (để trống hệ thống sẽ tự đặt)
                </span>
              </Label>
              <Input
                id="snippet-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Sửa lỗi không hiển thị biểu đồ khi chạy code"
              />
            </div>

            {/* Bước 3: Nhãn 5 môn học & Ghim */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">3. Môn học</Label>
              <div className="flex flex-wrap gap-1.5">
                {SNIPPET_CATEGORIES.map((cat) => {
                  const selected = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={cn(
                        "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all",
                        selected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="snippet-pinned"
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="size-4 cursor-pointer rounded border-border accent-primary"
              />
              <Label
                htmlFor="snippet-pinned"
                className="cursor-pointer text-sm font-medium"
              >
                📌 Ghim đoạn code này lên đầu Sổ tay để tìm nhanh
              </Label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isAiLoading}
                className="cursor-pointer font-semibold"
              >
                {isSaving
                  ? "Đang lưu..."
                  : editingId
                  ? "Lưu thay đổi"
                  : "Lưu vào Sổ tay"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
