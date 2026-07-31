"use client";

import { useState, useTransition } from "react";

import { SubmissionDropzone } from "@/components/submission/submission-dropzone";
import { SubmissionFileList } from "@/components/submission/submission-file-list";
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
import { readPickedAsText } from "@/lib/read-dropped-files";
import { fileToBase64 } from "@/lib/submission-attachment";
import {
  budgetWarning,
  emptyTally,
  formatBytes,
  PROJECT_BUDGET,
  totalBytes,
  type SubmissionFile,
} from "@/lib/submission-files";
import { useSubmissionPicker } from "@/lib/use-submission-picker";

import type { CourseChoice } from "../assignment-form";

const SECTIONS: { key: keyof ProjectReview; label: string }[] = [
  { key: "diem_manh", label: "💪 Điểm mạnh" },
  { key: "can_cai_thien", label: "🎯 Cần cải thiện" },
  { key: "goi_y", label: "💡 Gợi ý nâng cấp" },
];

/**
 * File của sản phẩm cuối khóa: đọc thành CHỮ ngay (khác hai tab kia gửi base64).
 * `key` = đường dẫn, vì trong một project không có hai file cùng đường dẫn.
 */
type ProjectItem = SubmissionFile & { key: string };

function withKey(file: SubmissionFile): ProjectItem {
  return { ...file, key: file.path };
}

function toCopyText(review: ProjectReview): string {
  return SECTIONS.filter((s) => review[s.key].length > 0)
    .map((s) => {
      // Bỏ emoji khi copy — GV dán vào Zalo/Word, icon ở đó chỉ gây rối.
      const label = s.label.replace(/^\S+\s/, "").toUpperCase();
      return `${label}:\n${review[s.key].map((line) => `- ${line}`).join("\n")}`;
    })
    .join("\n\n");
}

export function ProjectReviewTool({ courses }: { courses: CourseChoice[] }) {
  const [courseId, setCourseId] = useState("");
  const [notes, setNotes] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<ProjectReview | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startReview] = useTransition();

  const picker = useSubmissionPicker<ProjectItem>({
    // Sản phẩm cuối khóa chỉ đọc file chữ: ảnh là asset (logo, background),
    // PDF/Word không phải code. Khác chủ ý với hai tab kia.
    filter: {},
    budget: PROJECT_BUDGET,
    toItems: async (picked) => {
      const read = await readPickedAsText(picked);
      return { items: read.items.map(withKey), skipped: read.skipped };
    },
    unzip: async (zip) => {
      const res = await extractZipFiles({ zipB64: await fileToBase64(zip) });
      return {
        items: (res.files ?? []).map(withKey),
        skipped: res.skipped ?? emptyTally(),
        error: res.error,
      };
    },
    hasResult: review !== null,
    onItemsChanged: () => {
      setReview(null);
      setCopied(false);
      setExcluded(new Set());
    },
  });

  // GV bỏ tick file không muốn gửi — chỉ tab này có, vì đầu vào là cả một thư
  // mục nên cần soát trước khi tiêu một lượt Gemini.
  const chosen = picker.items.filter((f) => !excluded.has(f.path));
  const warning = budgetWarning(chosen, PROJECT_BUDGET);
  const canReview = chosen.length > 0 && !pending && !picker.reading;

  function toggleFile(item: ProjectItem) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(item.path)) next.delete(item.path);
      else next.add(item.path);
      return next;
    });
    setReview(null);
  }

  function handleReview() {
    picker.setError("");
    setReview(null);
    setCopied(false);
    startReview(async () => {
      const res = await reviewProject({
        courseId: courseId || undefined,
        notes: notes || undefined,
        // Bỏ `key` (thứ chỉ dùng để dựng danh sách) trước khi gửi qua mạng.
        files: chosen.map(({ path, content, size }) => ({ path, content, size })),
      });
      if (res.error) picker.setError(res.error);
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
        <SubmissionDropzone
          handlers={picker.dropzone}
          idleIcon="📁"
          idleLabel="Bấm hoặc kéo thả cả thư mục (hoặc file .zip) vào đây"
          // Sản phẩm nhận mọi đuôi code, không giới hạn như tab bài tập.
          accept=""
          hint="Tự bỏ qua node_modules, .git, ảnh và file nén bên trong. Sản phẩm của một em mỗi lần; không lưu lại gì."
        />
      </div>

      {picker.notice && (
        <p className="rounded-lg border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700 dark:text-green-400">
          ✓ {picker.notice}
        </p>
      )}
      {warning && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ {warning}
        </p>
      )}

      <SubmissionFileList
        items={picker.items}
        skipped={picker.skipped}
        summary={`Nhận xét ${chosen.length}/${picker.items.length} file · ${formatBytes(
          totalBytes(chosen)
        )}`}
        onClear={picker.clear}
        isExcluded={(item) => excluded.has(item.path)}
        onToggle={toggleFile}
      />

      <Button onClick={handleReview} disabled={!canReview}>
        {pending ? "AI đang xem sản phẩm..." : "✨ Nhận xét sản phẩm"}
      </Button>

      {picker.error && <p className="text-sm text-destructive">{picker.error}</p>}

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
