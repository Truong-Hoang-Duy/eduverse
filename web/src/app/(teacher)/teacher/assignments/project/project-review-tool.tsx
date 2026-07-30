"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  extractZipFiles,
  reviewProject,
  type ProjectReview,
} from "@/lib/actions/project-review";
import {
  pickedFromDrop,
  pickedFromInput,
  readAsSubmissionFiles,
  type PickedFile,
} from "@/lib/read-dropped-files";
import {
  budgetWarning,
  describeSkipped,
  emptyTally,
  formatBytes,
  PROJECT_BUDGET,
  totalBytes,
  type SkipTally,
  type SubmissionFile,
} from "@/lib/submission-files";

import type { CourseChoice } from "../assignment-form";

const SECTIONS: { key: keyof ProjectReview; label: string }[] = [
  { key: "diem_manh", label: "💪 Điểm mạnh" },
  { key: "can_cai_thien", label: "🎯 Cần cải thiện" },
  { key: "goi_y", label: "💡 Gợi ý nâng cấp" },
];

function toCopyText(review: ProjectReview): string {
  return SECTIONS.filter((s) => review[s.key].length > 0)
    .map((s) => {
      // Bỏ emoji khi copy — GV dán vào Zalo/Word, icon ở đó chỉ gây rối.
      const label = s.label.replace(/^\S+\s/, "").toUpperCase();
      return `${label}:\n${review[s.key].map((line) => `- ${line}`).join("\n")}`;
    })
    .join("\n\n");
}

/** Đọc File thành base64 (bỏ phần "data:...;base64," ở đầu). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error(`Không đọc được file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function ProjectReviewTool({ courses }: { courses: CourseChoice[] }) {
  const [courseId, setCourseId] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<SkipTally>(emptyTally());
  const [review, setReview] = useState<ProjectReview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reading, startReading] = useTransition();
  const [pending, startReview] = useTransition();

  const dragDepth = useRef(0);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chosen = files.filter((f) => !excluded.has(f.path));
  const warning = budgetWarning(chosen, PROJECT_BUDGET);
  const canReview = chosen.length > 0 && !pending && !reading;

  function reset() {
    setReview(null);
    setError("");
    setNotice("");
    setCopied(false);
  }

  function applyResult(next: SubmissionFile[], tally: SkipTally) {
    setFiles(next);
    setExcluded(new Set());
    setSkipped(tally);

    const ignored = describeSkipped(tally);
    setNotice(
      `Đã đọc ${next.length} file (${formatBytes(totalBytes(next))})` +
        (ignored ? ` · bỏ qua ${ignored}` : "")
    );
  }

  /** Một file .zip → giải nén ở server (dùng lại bộ đọc ZIP đã có). */
  function loadZip(zip: File) {
    startReading(async () => {
      try {
        const res = await extractZipFiles({ zipB64: await fileToBase64(zip) });
        if (res.error) {
          setError(res.error);
          return;
        }
        applyResult(res.files ?? [], res.skipped ?? emptyTally());
      } catch {
        setError("Không đọc được file .zip này.");
      }
    });
  }

  function loadPicked(picked: PickedFile[]) {
    if (picked.length === 0) {
      setError(
        "Không tìm thấy file code nào — thư mục có thể chỉ chứa ảnh hoặc file sinh tự động."
      );
      return;
    }

    // Đúng một file .zip thì giải nén, còn lại đọc thẳng thành chữ.
    if (picked.length === 1 && picked[0].path.toLowerCase().endsWith(".zip")) {
      loadZip(picked[0].file);
      return;
    }

    startReading(async () => {
      const { files: next, skipped: tally } = await readAsSubmissionFiles(picked);
      if (next.length === 0) {
        setError("Không đọc được file nào trong số đã chọn.");
        return;
      }
      applyResult(next, tally);
    });
  }

  async function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    reset();

    // PHẢI gom entry đồng bộ ở đây: dataTransfer.items bị xóa ngay khi handler
    // trả về, `await` trước khi gom là mất sạch dữ liệu.
    const entries = Array.from(e.dataTransfer.items).map((item) =>
      item.webkitGetAsEntry()
    );
    const plainFiles = Array.from(e.dataTransfer.files);

    loadPicked(await pickedFromDrop(entries, plainFiles));
  }

  function handleInput(list: FileList | null, input: HTMLInputElement | null) {
    reset();
    loadPicked(pickedFromInput(Array.from(list ?? [])));
    // Dọn input để chọn LẠI đúng thư mục vừa bỏ vẫn kích hoạt onChange.
    if (input) input.value = "";
  }

  function toggleFile(path: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    setReview(null);
  }

  function handleReview() {
    setError("");
    setReview(null);
    setCopied(false);
    startReview(async () => {
      const res = await reviewProject({
        courseId: courseId || undefined,
        notes: notes || undefined,
        files: chosen,
      });
      if (res.error) setError(res.error);
      else setReview(res.review ?? null);
    });
  }

  async function handleCopy() {
    if (!review) return;
    await navigator.clipboard.writeText(toCopyText(review));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Khóa học (tùy chọn)</Label>
          <Select
            value={courseId}
            onValueChange={(v) => setCourseId(v === "none" ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Không chọn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không chọn</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Cho AI biết trình độ để nhận xét vừa sức, không đòi hỏi như người đi làm.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-notes">Ghi chú cho AI (tùy chọn)</Label>
          <Textarea
            id="project-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VD: sản phẩm web quản lý thư viện, em mới học 8 buổi, chú ý phần xử lý form..."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>File sản phẩm của một học viên *</Label>
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          // Thiếu preventDefault ở dragOver là trình duyệt tự mở file thay vì thả.
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) setDragging(false);
          }}
          onDrop={handleDrop}
          className={`space-y-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
        >
          <p className="text-3xl leading-none" aria-hidden="true">
            {dragging ? "📥" : "📁"}
          </p>
          <p className="text-base font-medium">
            {reading
              ? "Đang đọc file..."
              : "Kéo thả cả thư mục (hoặc file .zip) vào đây"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reading}
              onClick={() => folderInputRef.current?.click()}
            >
              📁 Chọn thư mục
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reading}
              onClick={() => fileInputRef.current?.click()}
            >
              📄 Chọn file / .zip
            </Button>
          </div>
        </div>

        {/* webkitdirectory không có trong type của React → phải spread vào. */}
        <input
          ref={folderInputRef}
          type="file"
          multiple
          {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
          onChange={(e) => handleInput(e.target.files, e.target)}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleInput(e.target.files, e.target)}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />

        <p className="text-xs text-muted-foreground">
          Tự bỏ qua node_modules, .git, ảnh và file nén bên trong. Sản phẩm của một
          em mỗi lần; không lưu lại gì.
        </p>
      </div>

      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
      {warning && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ {warning}
        </p>
      )}

      {files.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">
              Nhận xét {chosen.length}/{files.length} file ·{" "}
              {formatBytes(totalBytes(chosen))}
            </p>
            <button
              type="button"
              onClick={() => {
                setFiles([]);
                setExcluded(new Set());
                setSkipped(emptyTally());
                reset();
              }}
              className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              ✕ Xóa hết
            </button>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {files.map((f) => (
              <li key={f.path}>
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={!excluded.has(f.path)}
                    onChange={() => toggleFile(f.path)}
                    className="size-3.5 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {f.path}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatBytes(f.size)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {skipped.folder + skipped.junk + skipped.image + skipped.binary > 0 && (
            <p className="text-xs text-muted-foreground">
              Đã bỏ qua {describeSkipped(skipped)}.
            </p>
          )}
        </div>
      )}

      <Button onClick={handleReview} disabled={!canReview}>
        {pending ? "AI đang xem sản phẩm..." : "✨ Nhận xét sản phẩm"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {review && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Nhận xét sản phẩm</p>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "✓ Đã copy" : "📋 Copy nhận xét"}
            </Button>
          </div>
          <div className="divide-y">
            {SECTIONS.filter((s) => review[s.key].length > 0).map((section) => (
              <div key={section.key} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold">{section.label}</p>
                <ul className="mt-1 space-y-1.5">
                  {review[section.key].map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
