"use client";

import { useActionState, useState, useTransition } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateAiReview, saveReview } from "@/lib/actions/reviews";
import type { ActionResult } from "@/lib/types";

export interface ReviewOptionItem {
  id: string;
  category: string;
  label: string;
}

export interface ExistingReview {
  strengths: string[];
  improvements: string[];
  advice: string | null;
  ai_generated_comment: string | null;
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

  const strengthOptions = options.filter((o) => o.category === "strength");
  const improvementOptions = options.filter((o) => o.category === "improvement");

  function toggle(list: string[], set: (v: string[]) => void, label: string) {
    set(list.includes(label) ? list.filter((l) => l !== label) : [...list, label]);
  }

  function handleGenerate() {
    setAiError("");
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

  const reviewed = Boolean(
    existing &&
      (existing.strengths.length > 0 ||
        existing.improvements.length > 0 ||
        existing.ai_generated_comment)
  );

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
          <div className="space-y-2">
            <p className="text-sm font-medium">💪 Điểm mạnh</p>
            {strengthOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Chưa có lựa chọn — thêm trong trang Cài đặt.
              </p>
            )}
            {strengthOptions.map((opt) => (
              <Label
                key={opt.id}
                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  checked={strengths.includes(opt.label)}
                  onCheckedChange={() => toggle(strengths, setStrengths, opt.label)}
                />
                {opt.label}
              </Label>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">🎯 Cần cải thiện</p>
            {improvementOptions.map((opt) => (
              <Label
                key={opt.id}
                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  checked={improvements.includes(opt.label)}
                  onCheckedChange={() =>
                    toggle(improvements, setImprovements, opt.label)
                  }
                />
                {opt.label}
              </Label>
            ))}
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
          <div className="flex items-center justify-between">
            <Label htmlFor={`comment-${studentId}`}>Nhận xét gửi phụ huynh</Label>
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
          <Textarea
            id={`comment-${studentId}`}
            name="ai_comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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
