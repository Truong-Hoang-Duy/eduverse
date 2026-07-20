"use client";

import { useActionState, useState, useTransition } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { MultiSelect } from "@/components/multi-select";
import { Badge } from "@/components/ui/badge";
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
import { generateAiReview, saveReview } from "@/lib/actions/reviews";
import { SKILL_GROUPS } from "@/lib/skill-groups";
import type { ActionResult } from "@/lib/types";

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

export interface ExistingReview {
  strengths: string[];
  improvements: string[];
  advice: string | null;
  ai_generated_comment: string | null;
}

/** Đã nhận xét khi có ít nhất 1 trong 3: điểm mạnh, cần cải thiện, hoặc nhận
 *  xét AI — dùng chung cho badge "Đã nhận xét" và bộ lọc Hoàn thành/Chưa. */
export function isReviewed(existing: ExistingReview | null): boolean {
  return Boolean(
    existing &&
      (existing.strengths.length > 0 ||
        existing.improvements.length > 0 ||
        existing.ai_generated_comment)
  );
}

export function ReviewEditor({
  sessionId,
  sessionTitle,
  sessionContent,
  studentId,
  studentName,
  options,
  existing,
}: {
  sessionId: string;
  sessionTitle: string;
  sessionContent: string;
  studentId: string;
  studentName: string;
  options: ReviewOptionItem[];
  existing: ExistingReview | null;
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
  const [aiError, setAiError] = useState("");
  const [aiPending, startAi] = useTransition();
  const [copied, setCopied] = useState(false);

  // Bộ lọc nhóm kỹ năng của từng combo box — mặc định "all" (không lọc).
  const [strengthGroup, setStrengthGroup] = useState("all");
  const [improvementGroup, setImprovementGroup] = useState("all");

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
          {reviewed && (
            <Badge variant="secondary" className="text-xs">
              Đã nhận xét
            </Badge>
          )}
        </span>
        <span className="text-sm text-muted-foreground transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>

      <form action={formAction} className="space-y-4 border-t p-4">
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="student_id" value={studentId} />
        {strengths.map((s) => (
          <input key={s} type="hidden" name="strengths" value={s} />
        ))}
        {improvements.map((s) => (
          <input key={s} type="hidden" name="improvements" value={s} />
        ))}

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
          </div>
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

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Đang lưu..." : "Lưu nhận xét"}
          </Button>
          <FormMessage result={state} />
        </div>
      </form>
    </details>
  );
}
