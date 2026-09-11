"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateDemoTotal,
  DEMO_SCORE_CRITERIA,
  DNL_CRITERIA,
  type FinalPresentationEvaluation,
  formatFullEvaluationText,
  scoreToLevel,
} from "@/lib/presentation-evaluation";

export function PresentationEvaluationCard({
  studentName,
  data,
  onChange,
}: {
  studentName: string;
  data: FinalPresentationEvaluation;
  onChange: (updated: FinalPresentationEvaluation) => void;
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedKeys, setCopiedKeys] = useState<Record<string, boolean>>({});

  function setCopiedKey(key: string) {
    setCopiedKeys((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedKeys((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  }

  async function handleCopyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
  }

  async function handleCopyAll() {
    const fullText = formatFullEvaluationText(studentName, data);
    await navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  }

  function handleDemoScoreChange(key: string, valStr: string) {
    const val = parseFloat(valStr) || 0;
    const updatedDemo = {
      ...data.demo_score,
      [key]: val,
    };
    const newTotal = calculateDemoTotal(updatedDemo);
    onChange({
      ...data,
      demo_score: {
        ...updatedDemo,
        total: newTotal,
      },
    });
  }

  function handleDnlScoreChange(key: string, score: number) {
    const level = scoreToLevel(score);
    const existing = data.dnl_evaluations[key] ?? {
      score,
      level,
      comment: "",
    };
    onChange({
      ...data,
      dnl_evaluations: {
        ...data.dnl_evaluations,
        [key]: {
          ...existing,
          score,
          level,
        },
      },
    });
  }

  function handleDnlCommentChange(key: string, comment: string) {
    const existing = data.dnl_evaluations[key] ?? {
      score: 4,
      level: "Khá",
      comment: "",
    };
    onChange({
      ...data,
      dnl_evaluations: {
        ...data.dnl_evaluations,
        [key]: {
          ...existing,
          comment,
        },
      },
    });
  }

  const groups = ["KIẾN THỨC", "KỸ NĂNG", "THÁI ĐỘ"] as const;

  return (
    <div className="space-y-5 rounded-xl border border-primary/20 bg-muted/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            📊 Bảng Đánh Giá Năng Lực & Demo Score (Chuẩn Denise LMS)
          </h4>
          <p className="text-xs text-muted-foreground">
            Khớp form đánh giá buổi thuyết trình LMS. Bấm 📋 Copy từng ô để dán sang Denise nhanh chóng.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopyAll}
          className="cursor-pointer text-xs"
        >
          {copiedAll ? "✓ Đã copy toàn bộ bảng" : "📋 Copy toàn bộ bảng đánh giá"}
        </Button>
      </div>

      {/* --- PHẦN 1: DEMO SCORE (Image 5) --- */}
      <div className="space-y-3 rounded-lg border border-dashed bg-card p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-primary">
            Demo Score: {data.demo_score.total} / 5.0
          </span>
          <span className="text-xs text-muted-foreground">Thang điểm 5.0</span>
        </div>

        <div className="space-y-2.5">
          {DEMO_SCORE_CRITERIA.map((criterion) => {
            const scoreVal =
              data.demo_score[
                criterion.key as keyof typeof data.demo_score
              ] ?? 0;
            return (
              <div
                key={criterion.key}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 text-sm last:border-b-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max={criterion.maxScore}
                    value={scoreVal}
                    onChange={(e) =>
                      handleDemoScoreChange(criterion.key, e.target.value)
                    }
                    className="h-8 w-20 text-center font-semibold text-foreground"
                  />
                  <span className="font-medium text-foreground">
                    {criterion.name}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopyText(criterion.key, String(scoreVal))
                  }
                  className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKeys[criterion.key] ? "✓ Đã chép" : "📋 Copy điểm"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- PHẦN 2: 9 TIÊU CHÍ ĐNL THEO 3 NHÓM (Image 1, 2, 3, 4) --- */}
      <div className="space-y-6">
        {groups.map((grp) => {
          const criteriaInGroup = DNL_CRITERIA.filter((c) => c.group === grp);
          return (
            <div key={grp} className="space-y-3">
              <h5 className="text-xs font-bold tracking-wider text-muted-foreground uppercase border-b pb-1">
                {grp}
              </h5>

              <div className="space-y-4">
                {criteriaInGroup.map((criterion) => {
                  const evalItem = data.dnl_evaluations[criterion.key] ?? {
                    score: 4,
                    level: "Khá",
                    comment: "",
                  };

                  return (
                    <div
                      key={criterion.key}
                      className="space-y-2 rounded-lg border bg-card p-3 sm:p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label className="text-sm font-semibold text-foreground">
                          {criterion.name}
                        </Label>

                        {/* Điểm 1..5 và Xếp loại TB/Khá/Giỏi */}
                        <div className="flex items-center gap-2">
                          {/* Badge Level */}
                          <div className="flex items-center gap-1">
                            <Badge
                              variant={
                                evalItem.level === "TB" ? "default" : "outline"
                              }
                              className={`text-[10px] ${
                                evalItem.level === "TB"
                                  ? "bg-amber-600 hover:bg-amber-600 text-white"
                                  : "text-muted-foreground opacity-60"
                              }`}
                            >
                              TB
                            </Badge>
                            <Badge
                              variant={
                                evalItem.level === "Khá" ? "default" : "outline"
                              }
                              className={`text-[10px] ${
                                evalItem.level === "Khá"
                                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                                  : "text-muted-foreground opacity-60"
                              }`}
                            >
                              Khá
                            </Badge>
                            <Badge
                              variant={
                                evalItem.level === "Giỏi" ? "default" : "outline"
                              }
                              className={`text-[10px] ${
                                evalItem.level === "Giỏi"
                                  ? "bg-blue-600 hover:bg-blue-600 text-white"
                                  : "text-muted-foreground opacity-60"
                              }`}
                            >
                              Giỏi
                            </Badge>
                          </div>

                          {/* 1..5 Radio buttons */}
                          <div className="flex items-center gap-1.5 pl-2 border-l">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() =>
                                  handleDnlScoreChange(criterion.key, num)
                                }
                                className={`size-6 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                                  evalItem.score === num
                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/50"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Textarea comment */}
                      <Textarea
                        rows={2}
                        value={evalItem.comment}
                        onChange={(e) =>
                          handleDnlCommentChange(
                            criterion.key,
                            e.target.value
                          )
                        }
                        placeholder={`Nhận xét về ${criterion.description.toLowerCase()}...`}
                        className="text-xs resize-y"
                      />

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopyText(
                              criterion.key,
                              evalItem.comment
                            )
                          }
                          disabled={!evalItem.comment.trim()}
                          className="h-6 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {copiedKeys[criterion.key]
                            ? "✓ Đã copy nhận xét"
                            : "📋 Copy nhận xét ô này"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
