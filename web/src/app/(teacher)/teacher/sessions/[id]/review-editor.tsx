"use client";

import { useActionState, useState, useTransition } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { MultiSelect } from "@/components/multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ACADEMIC_LEVELS,
  academicLevelLabel,
} from "@/lib/academic-levels";
import { generateAiReview, saveReview } from "@/lib/actions/reviews";
import { addReviewOption } from "@/lib/actions/settings";
import { SKILL_GROUPS } from "@/lib/skill-groups";
import type { ActionResult } from "@/lib/types";

import { type ExistingReview, isReviewed } from "./review-status";

export interface ReviewOptionItem {
  id: string;
  category: string;
  label: string;
  skill_group: string;
}

/** Bộ lọc nhóm kỹ năng cho combo box lựa chọn — "all" = không lọc. */
function GroupFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className="h-7 w-[150px] text-xs"
        aria-label="Lọc theo nhóm kỹ năng"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả nhóm</SelectItem>
        {SKILL_GROUPS.map((g) => (
          <SelectItem key={g.value} value={g.value}>
            {g.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Một học viên khác trong buổi có sẵn điểm mạnh/cần cải thiện đã lưu — để
 *  copy nhanh sang em đang nhận xét (nguồn là dữ liệu ĐÃ LƯU). */
export interface CopySource {
  id: string;
  name: string;
  strengths: string[];
  improvements: string[];
}

export function ReviewEditor({
  sessionId,
  sessionTitle,
  sessionContent,
  studentId,
  studentName,
  options,
  existing,
  priorComments,
  copySources,
}: {
  sessionId: string;
  sessionTitle: string;
  sessionContent: string;
  studentId: string;
  studentName: string;
  options: ReviewOptionItem[];
  existing: ExistingReview | null;
  /** Nhận xét các buổi trước của học viên này — cho AI tránh lặp lời văn. */
  priorComments?: string[];
  /** Bạn cùng buổi đã có điểm mạnh/cải thiện lưu sẵn — để copy nhanh sang. */
  copySources?: CopySource[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveReview,
    {}
  );
  const [strengths, setStrengths] = useState<string[]>(existing?.strengths ?? []);
  const [improvements, setImprovements] = useState<string[]>(
    existing?.improvements ?? []
  );
  const [advice, setAdvice] = useState(existing?.advice ?? "");
  const [comment, setComment] = useState(existing?.ai_generated_comment ?? "");
  const [academicLevel, setAcademicLevel] = useState(
    existing?.academic_level ?? ""
  );
  const [isAbsent, setIsAbsent] = useState(existing?.is_absent ?? false);
  const [aiError, setAiError] = useState("");
  const [aiPending, startAi] = useTransition();
  const [copied, setCopied] = useState(false);

  // Gộp (union, bỏ trùng không phân biệt hoa/thường) lựa chọn của bạn khác vào
  // em này — "copy vào" chứ không ghi đè, để không mất thứ GV đã tick.
  function mergeUnique(current: string[], incoming: string[]): string[] {
    const seen = new Set(current.map((s) => s.toLowerCase()));
    const merged = [...current];
    for (const item of incoming) {
      if (!seen.has(item.toLowerCase())) {
        seen.add(item.toLowerCase());
        merged.push(item);
      }
    }
    return merged;
  }

  function copyFromStudent(sourceId: string) {
    const source = copySources?.find((s) => s.id === sourceId);
    if (!source) return;
    setStrengths((prev) => mergeUnique(prev, source.strengths));
    setImprovements((prev) => mergeUnique(prev, source.improvements));
  }

  // Bộ lọc nhóm kỹ năng của từng combo box — mặc định "all" (không lọc).
  const [strengthGroup, setStrengthGroup] = useState("all");
  const [improvementGroup, setImprovementGroup] = useState("all");

  // Gõ tự do khi danh mục có sẵn không đủ — thêm vào review + lưu vào danh
  // mục dùng chung (review_options) để lần sau chọn lại được.
  const [strengthDraft, setStrengthDraft] = useState("");
  const [improvementDraft, setImprovementDraft] = useState("");

  function persistCustomOption(
    category: "strength" | "improvement",
    label: string,
    skillGroup: string
  ) {
    const alreadyInCatalog = options.some(
      (o) => o.category === category && o.label.toLowerCase() === label.toLowerCase()
    );
    if (alreadyInCatalog) return;
    const fd = new FormData();
    fd.set("category", category);
    fd.set("label", label);
    fd.set("skill_group", skillGroup);
    addReviewOption({}, fd).catch(() => {});
  }

  function addCustomStrength() {
    const value = strengthDraft.trim();
    if (!value) return;
    setStrengths((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistCustomOption("strength", value, strengthGroup === "all" ? "other" : strengthGroup);
    setStrengthDraft("");
  }

  function addCustomImprovement() {
    const value = improvementDraft.trim();
    if (!value) return;
    setImprovements((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistCustomOption(
      "improvement",
      value,
      improvementGroup === "all" ? "other" : improvementGroup
    );
    setImprovementDraft("");
  }

  const strengthOptions = options.filter(
    (o) =>
      o.category === "strength" &&
      (strengthGroup === "all" || o.skill_group === strengthGroup)
  );
  const improvementOptions = options.filter(
    (o) =>
      o.category === "improvement" &&
      (improvementGroup === "all" || o.skill_group === improvementGroup)
  );

  function handleGenerate() {
    setAiError("");
    setCopied(false);
    startAi(async () => {
      const res = await generateAiReview({
        studentName,
        sessionTitle,
        sessionContent,
        strengths,
        improvements,
        adviceHint: advice || undefined,
        previousComment: existing?.ai_generated_comment ?? undefined,
        priorComments,
        academicLevel: academicLevelLabel(academicLevel) ?? undefined,
      });
      if (res.error) {
        setAiError(res.error);
      } else {
        setComment(res.comment ?? "");
      }
    });
  }

  async function handleCopyComment() {
    await navigator.clipboard.writeText(comment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const reviewed = isReviewed(existing);

  return (
    <details className="group rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-medium">
          {studentName}
          {isAbsent ? (
            <Badge variant="outline" className="text-xs">
              Vắng
            </Badge>
          ) : (
            reviewed && (
              <Badge variant="secondary" className="text-xs">
                Đã nhận xét
              </Badge>
            )
          )}
        </span>
        <span className="text-sm text-muted-foreground transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>

      <form action={formAction} className="space-y-4 border-t p-4">
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="student_id" value={studentId} />
        <input type="hidden" name="is_absent" value={String(isAbsent)} />
        <input type="hidden" name="academic_level" value={academicLevel} />

        {/* Đánh vắng — mặc định có đi học. Bật lên thì ẩn toàn bộ phần nhận xét
            vì em không học buổi này. */}
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={isAbsent}
            onChange={(e) => setIsAbsent(e.target.checked)}
            className="size-4"
          />
          🚫 Vắng mặt buổi này (không cần nhận xét)
        </label>

        {isAbsent && (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Em vắng buổi này — bấm &quot;Lưu&quot; để đánh dấu. Em sẽ được bỏ qua
            khi tổng hợp tin Zalo cho phụ huynh.
          </p>
        )}

        {!isAbsent && (
        <>
        {strengths.map((s) => (
          <input key={s} type="hidden" name="strengths" value={s} />
        ))}
        {improvements.map((s) => (
          <input key={s} type="hidden" name="improvements" value={s} />
        ))}

        {(copySources?.length ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Copy điểm mạnh / cần cải thiện từ:
            </span>
            <Select value="" onValueChange={copyFromStudent}>
              <SelectTrigger
                size="sm"
                className="h-7 w-[180px] text-xs"
                aria-label="Copy lựa chọn từ học viên khác"
              >
                <SelectValue placeholder="Chọn bạn để copy..." />
              </SelectTrigger>
              <SelectContent>
                {copySources!.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">💪 Điểm mạnh</p>
              <GroupFilter value={strengthGroup} onChange={setStrengthGroup} />
            </div>
            <MultiSelect
              options={strengthOptions}
              selected={strengths}
              onChange={setStrengths}
              placeholder="Chọn điểm mạnh..."
              emptyText={
                strengthGroup === "all"
                  ? "Chưa có lựa chọn — thêm trong trang Cài đặt."
                  : "Nhóm này chưa có lựa chọn nào."
              }
            />
            <div className="flex gap-2">
              <Input
                value={strengthDraft}
                onChange={(e) => setStrengthDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomStrength();
                  }
                }}
                placeholder="Hoặc gõ câu của riêng bạn rồi Enter..."
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomStrength}
                disabled={!strengthDraft.trim()}
              >
                Thêm
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">🎯 Cần cải thiện</p>
              <GroupFilter
                value={improvementGroup}
                onChange={setImprovementGroup}
              />
            </div>
            <MultiSelect
              options={improvementOptions}
              selected={improvements}
              onChange={setImprovements}
              placeholder="Chọn điểm cần cải thiện..."
              emptyText={
                improvementGroup === "all"
                  ? "Chưa có lựa chọn — thêm trong trang Cài đặt."
                  : "Nhóm này chưa có lựa chọn nào."
              }
            />
            <div className="flex gap-2">
              <Input
                value={improvementDraft}
                onChange={(e) => setImprovementDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomImprovement();
                  }
                }}
                placeholder="Hoặc gõ câu của riêng bạn rồi Enter..."
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomImprovement}
                disabled={!improvementDraft.trim()}
              >
                Thêm
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          💡 Câu gõ tự do cũng được lưu vào danh mục (nhóm đang lọc, hoặc
          &quot;Khác&quot; nếu đang xem Tất cả nhóm) để lần sau chọn lại được.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor={`level-${studentId}`}>
            Xếp loại học lực (tùy chọn)
          </Label>
          <Select
            value={academicLevel}
            onValueChange={(v) =>
              setAcademicLevel(v === "none" ? "" : v)
            }
          >
            <SelectTrigger
              id={`level-${studentId}`}
              size="sm"
              className="w-[200px]"
            >
              <SelectValue placeholder="Chưa chọn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Chưa chọn</SelectItem>
              {ACADEMIC_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            AI dựa vào mức này để viết nhận xét vừa trình độ của em — không nêu
            thẳng xếp loại cho phụ huynh.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`advice-${studentId}`}>Lời khuyên (tùy chọn)</Label>
          <Textarea
            id={`advice-${studentId}`}
            name="advice"
            rows={2}
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            placeholder="Gợi ý thêm cho AI hoặc lời khuyên riêng của bạn..."
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor={`comment-${studentId}`}>Nhận xét gửi phụ huynh</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyComment}
                disabled={!comment}
              >
                {copied ? "✓ Đã copy" : "📋 Copy"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={aiPending}
              >
                {aiPending ? "AI đang viết..." : "✨ AI tạo nhận xét"}
              </Button>
            </div>
          </div>
          <Textarea
            id={`comment-${studentId}`}
            name="ai_comment"
            rows={4}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setCopied(false);
            }}
            placeholder="Bấm 'AI tạo nhận xét' rồi chỉnh sửa lại theo ý bạn..."
          />
          {aiError && <p className="text-sm text-destructive">{aiError}</p>}
        </div>
        </>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending
              ? "Đang lưu..."
              : isAbsent
                ? "Lưu (đánh dấu vắng)"
                : "Lưu nhận xét"}
          </Button>
          <FormMessage result={state} />
        </div>
      </form>
    </details>
  );
}
