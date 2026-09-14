"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateDemoTotal,
  calculateGrandTotal,
  DEMO_SCORE_CRITERIA,
  distributeScores,
  DNL_CRITERIA,
  type FinalPresentationEvaluation,
  formatFullEvaluationText,
  scoreToLevel,
} from "@/lib/presentation-evaluation";

export function PresentationEvaluationCard({
  studentName,
  data,
  onChange,
  hideDemoScore = false,
}: {
  studentName: string;
  data: FinalPresentationEvaluation;
  onChange: (updated: FinalPresentationEvaluation) => void;
  hideDemoScore?: boolean;
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
    const fullText = formatFullEvaluationText(studentName, data, {
      hideDemoScore,
    });
    await navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  }

  const knowledgeScore = Number(data.demo_score.knowledge_score ?? 3.5);
  const demoTotal = calculateDemoTotal(data.demo_score);
  const grandTotal = calculateGrandTotal(knowledgeScore, demoTotal);

  function handleKnowledgeScoreChange(valStr: string) {
    const kVal = Math.min(5.0, Math.max(0, parseFloat(valStr) || 0));
    const newGrandTotal = calculateGrandTotal(kVal, demoTotal);
    onChange({
      ...data,
      demo_score: {
        ...data.demo_score,
        knowledge_score: kVal,
        demo_total: demoTotal,
        total: newGrandTotal,
      },
    });
  }

  function handleDemoScoreChange(key: string, valStr: string) {
    const val = parseFloat(valStr) || 0;
    const updatedDemo = {
      ...data.demo_score,
      [key]: val,
    };
    const newDemoTotal = calculateDemoTotal(updatedDemo);
    const newGrandTotal = calculateGrandTotal(knowledgeScore, newDemoTotal);
    onChange({
      ...data,
      demo_score: {
        ...updatedDemo,
        knowledge_score: knowledgeScore,
        demo_total: newDemoTotal,
        total: newGrandTotal,
      },
    });
  }

  function handleAutoDistribute(targetScore: number) {
    const distributed = distributeScores(targetScore);
    // Đồng bộ DNL nếu có tiêu chí nào dưới 3
    const targetDnlScore = targetScore >= 8.5 ? 5 : targetScore >= 7.0 ? 4 : 3;
    const targetDnlLevel = scoreToLevel(targetDnlScore);
    const updatedDnl = { ...data.dnl_evaluations };
    for (const key of Object.keys(updatedDnl)) {
      if (updatedDnl[key].score < 3) {
        updatedDnl[key] = {
          ...updatedDnl[key],
          score: targetDnlScore,
          level: targetDnlLevel,
        };
      }
    }
    onChange({
      ...data,
      demo_score: distributed,
      dnl_evaluations: updatedDnl,
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
            {hideDemoScore
              ? "📊 Bảng Đánh Giá Năng Lực (Chuẩn Denise LMS)"
              : "📊 Bảng Đánh Giá Năng Lực & Tổng Điểm (Chuẩn Denise LMS)"}
          </h4>
          <p className="text-xs text-muted-foreground">
            {hideDemoScore
              ? "Đánh giá 9 tiêu chí năng lực Kiến thức, Kỹ năng và Thái độ cho bài kiểm tra cuối khóa."
              : "Tổng hợp cả điểm kiến thức + demo sản phẩm (thang 10), tự động chia đều không dưới 6.0 điểm."}
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

      {/* --- PHẦN 1: 9 TIÊU CHÍ ĐNL THEO 3 NHÓM (Image 1, 2, 3, 4) --- */}
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

      {/* --- PHẦN 2: TỔNG CẢ ĐIỂM KIẾN THỨC + DEMO SẢN PHẨM Ở CUỐI (Khớp Image 5) --- */}
      {!hideDemoScore && (
        <div className="space-y-3.5 rounded-lg border border-dashed bg-card p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold text-primary">
                Demo Score: {grandTotal} / 10.0
              </span>
              <Badge variant="secondary" className="text-xs">
                Kiến thức: {knowledgeScore}/5.0
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Demo SP: {demoTotal}/5.0
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">Thang điểm 10.0</span>
          </div>

          {/* Cảnh báo nếu tổng điểm dưới 6.0 */}
          {grandTotal < 6.0 && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              <span>
                ⚠️ Điểm tổng kết hiện tại ({grandTotal}/10.0) đang dưới 6.0 điểm. Theo quy chế điểm tổng kết không dưới 6.0.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleAutoDistribute(6.0)}
                className="h-6 text-[11px] font-semibold border-amber-500/40 hover:bg-amber-500/20 cursor-pointer"
              >
                🎯 Chia đều 6.0đ
              </Button>
            </div>
          )}

          {/* Thanh công cụ chia đều điểm nhanh */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/40 p-2 text-xs">
            <span className="font-medium text-foreground">🎯 Chia đều điểm (≥ 6.0):</span>
            {[6.0, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0].map((pts) => (
              <Button
                key={pts}
                type="button"
                variant={grandTotal === pts ? "default" : "outline"}
                size="sm"
                onClick={() => handleAutoDistribute(pts)}
                className="h-6 px-2 text-[11px] cursor-pointer"
              >
                {pts.toFixed(1)}đ
              </Button>
            ))}
          </div>

          {/* Bảng nhập điểm chi tiết khớp ảnh Denise LMS */}
          <div className="space-y-2 pt-1">
            {/* Hàng 1: Demo2024 | CSI -> Điểm kiến thức */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5 text-sm bg-primary/5 -mx-2 px-2 py-1.5 rounded">
              <div className="flex items-center gap-3">
                <span className="w-28 text-xs font-bold tracking-wider text-primary uppercase">
                  Demo2024 | CSI
                </span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5.0"
                  value={knowledgeScore}
                  onChange={(e) => handleKnowledgeScoreChange(e.target.value)}
                  className="h-8 w-20 text-center font-bold text-primary border-primary/40"
                />
                <span className="font-semibold text-foreground">
                  Điểm kiến thức lý thuyết / trên lớp (tối đa 5 điểm)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyText("knowledge_score", String(knowledgeScore))
                }
                className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copiedKeys["knowledge_score"] ? "✓ Đã chép" : "📋 Copy điểm"}
              </Button>
            </div>

            {/* 5 Hàng Demo sản phẩm */}
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
                    <div className="w-28 text-xs text-muted-foreground hidden sm:block">
                      Demo sản phẩm
                    </div>
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
      )}

    </div>
  );
}
