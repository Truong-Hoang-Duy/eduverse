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

const GROUP_CONFIG = {
  "KIẾN THỨC": {
    label: "Kiến thức",
    icon: "📚",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    indexBadgeClass: "bg-blue-600 text-white dark:bg-blue-500",
    accentBorder: "border-l-4 border-l-blue-500/70",
  },
  "KỸ NĂNG": {
    label: "Kỹ năng",
    icon: "⚡",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
    indexBadgeClass: "bg-purple-600 text-white dark:bg-purple-500",
    accentBorder: "border-l-4 border-l-purple-500/70",
  },
  "THÁI ĐỘ": {
    label: "Thái độ",
    icon: "🌟",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    indexBadgeClass: "bg-amber-600 text-white dark:bg-amber-500",
    accentBorder: "border-l-4 border-l-amber-500/70",
  },
} as const;

export function PresentationEvaluationCard({
  studentName,
  data,
  onChange,
  hideDemoScore = false,
  isPeriodicExam = false,
}: {
  studentName: string;
  data: FinalPresentationEvaluation;
  onChange: (updated: FinalPresentationEvaluation) => void;
  hideDemoScore?: boolean;
  isPeriodicExam?: boolean;
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeCopiedKey, setActiveCopiedKey] = useState<string | null>(null);
  const [copiedHistory, setCopiedHistory] = useState<Record<string, boolean>>({});

  async function handleCopyText(key: string, text: string) {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    setActiveCopiedKey(key);
    setCopiedHistory((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setActiveCopiedKey((curr) => (curr === key ? null : curr));
    }, 2500);
  }

  async function handleCopyAll() {
    const fullText = formatFullEvaluationText(studentName, data, {
      hideDemoScore,
      isPeriodicExam,
    });
    await navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    // Đánh dấu tất cả các key DNL đã copy
    const allCopied: Record<string, boolean> = {};
    for (const c of DNL_CRITERIA) {
      if (data.dnl_evaluations[c.key]?.comment?.trim()) {
        allCopied[c.key] = true;
      }
    }
    setCopiedHistory((prev) => ({ ...prev, ...allCopied }));
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

  // Thống kê tiến độ
  const filledDnlCount = DNL_CRITERIA.filter(
    (c) => Boolean(data.dnl_evaluations[c.key]?.comment?.trim())
  ).length;
  const copiedDnlCount = DNL_CRITERIA.filter((c) => Boolean(copiedHistory[c.key])).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar: Tinh gọn, tối giản viền, chống copy nhầm */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3.5 sm:p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              {hideDemoScore
                ? "Bảng Đánh Giá Năng Lực 9 Tiêu Chí (Denise LMS)"
                : "Bảng Đánh Giá Năng Lực & Tổng Điểm (Denise LMS)"}
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <span>Học viên:</span>
              <span className="text-primary font-semibold">{studentName}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <span>Đã có nhận xét:</span>
              <span className="font-semibold text-foreground">
                {filledDnlCount}/9
              </span>
            </span>
            {copiedDnlCount > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Đã copy:</span>
                  <span className="font-semibold">{copiedDnlCount}/9</span>
                </span>
              </>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant={copiedAll ? "default" : "outline"}
          size="sm"
          onClick={handleCopyAll}
          className={`h-8 px-3 text-xs font-semibold cursor-pointer transition-all shadow-xs ${
            copiedAll
              ? "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent"
              : "hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          {copiedAll ? "✓ Đã copy toàn bộ bảng" : "📋 Copy toàn bộ 9 nhận xét"}
        </Button>
      </div>

      {/* --- PHẦN 1: 9 TIÊU CHÍ ĐNL THEO 3 NHÓM (Hạn chế tối đa border, có số thứ tự 01..09) --- */}
      <div className="space-y-6">
        {groups.map((grp) => {
          const criteriaInGroup = DNL_CRITERIA.filter((c) => c.group === grp);
          const config = GROUP_CONFIG[grp];

          return (
            <div key={grp} className="space-y-3">
              {/* Header Nhóm: Thoáng, hiện đại, không kẻ vạch thô cứng */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{config.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {grp}
                  </span>
                  <Badge variant="secondary" className={`text-[10px] font-medium border-0 ${config.badgeClass}`}>
                    {criteriaInGroup.length} tiêu chí
                  </Badge>
                </div>
              </div>

              {/* Danh sách tiêu chí trong nhóm: Nền mềm phẳng, vạch màu nhấn nhẹ, nút copy gắn liền tiêu đề */}
              <div className="space-y-3">
                {criteriaInGroup.map((criterion) => {
                  const globalIndex =
                    DNL_CRITERIA.findIndex((c) => c.key === criterion.key) + 1;
                  const formattedIndex = globalIndex < 10 ? `0${globalIndex}` : String(globalIndex);

                  const evalItem = data.dnl_evaluations[criterion.key] ?? {
                    score: 4,
                    level: "Khá",
                    comment: "",
                  };

                  const isCurrentlyActive = activeCopiedKey === criterion.key;
                  const hasBeenCopied = Boolean(copiedHistory[criterion.key]);
                  const hasComment = Boolean(evalItem.comment.trim());

                  return (
                    <div
                      key={criterion.key}
                      className={`relative space-y-3 rounded-xl p-3.5 sm:p-4 transition-all duration-300 ${
                        config.accentBorder
                      } ${
                        isCurrentlyActive
                          ? "bg-emerald-500/10 ring-2 ring-emerald-500/60 shadow-sm"
                          : hasBeenCopied
                          ? "bg-muted/30 hover:bg-muted/50"
                          : "bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      {/* Tiêu đề tiêu chí + Bộ chọn điểm 1..5 + Nút Copy trực quan */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        {/* Cột trái: Số thứ tự to bản + Tên tiêu chí */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold shadow-xs ${
                              hasBeenCopied
                                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                                : config.indexBadgeClass
                            }`}
                            title={`Tiêu chí số ${formattedIndex}`}
                          >
                            {hasBeenCopied ? "✓" : formattedIndex}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-sm font-semibold tracking-tight text-foreground">
                                {criterion.name}
                              </Label>
                              {hasBeenCopied && !isCurrentlyActive && (
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                  Đã chép
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground/80 line-clamp-1">
                              {criterion.description}
                            </p>
                          </div>
                        </div>

                        {/* Cột phải: Segmented 1..5 + Badge Level + Nút Copy đặt cạnh nhau */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Badge Level động duy nhất (không render thừa 3 cái) */}
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-semibold border-0 px-2 py-0.5 ${
                              evalItem.score === 5
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                : evalItem.score === 4
                                ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                                : evalItem.score === 3
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                            }`}
                          >
                            {evalItem.score >= 5
                              ? "Giỏi"
                              : evalItem.score === 4
                              ? "Khá"
                              : evalItem.score === 3
                              ? "TB"
                              : "Cần cố gắng"}
                          </Badge>

                          {/* Segmented Pill chọn điểm 1..5 liền khối, không viền rườm rà */}
                          <div className="inline-flex items-center rounded-lg bg-background/80 dark:bg-background/40 p-0.5 shadow-xs">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() =>
                                  handleDnlScoreChange(criterion.key, num)
                                }
                                className={`size-6 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                  evalItem.score === num
                                    ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                }`}
                                title={`Chọn mức ${num}/5 điểm`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>

                          {/* NÚT COPY ĐẶT NGAY TRÊN HEADER: Tránh hoàn toàn việc click nhầm sang tiêu chí khác */}
                          <Button
                            type="button"
                            variant={isCurrentlyActive ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              handleCopyText(criterion.key, evalItem.comment)
                            }
                            disabled={!hasComment}
                            className={`h-7 px-2.5 text-xs font-medium cursor-pointer transition-all shadow-xs ${
                              isCurrentlyActive
                                ? "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent"
                                : hasBeenCopied
                                ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
                                : "hover:bg-primary/10 hover:text-primary hover:border-primary/40 text-muted-foreground"
                            }`}
                            title={
                              !hasComment
                                ? "Chưa có nội dung để copy"
                                : `Sao chép nhận xét tiêu chí ${formattedIndex}`
                            }
                          >
                            {isCurrentlyActive ? (
                              <span className="flex items-center gap-1 font-semibold">
                                <span>✓</span> Đã copy
                              </span>
                            ) : hasBeenCopied ? (
                              <span className="flex items-center gap-1 font-medium">
                                <span>✓</span> Chép lại
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <span>📋</span> Copy
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Textarea comment: Đường nét phẳng, focus mềm mại, không viền hộp thô */}
                      <div className="relative">
                        <Textarea
                          rows={2}
                          value={evalItem.comment}
                          onChange={(e) =>
                            handleDnlCommentChange(criterion.key, e.target.value)
                          }
                          placeholder={`Nhập hoặc tạo nhận xét cho tiêu chí ${formattedIndex}: ${criterion.description.toLowerCase()}...`}
                          className="text-xs sm:text-sm bg-background/90 focus-visible:ring-1 focus-visible:ring-primary/50 resize-y rounded-lg border-muted-foreground/20 leading-relaxed"
                        />
                        {hasComment && (
                          <span className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground/50 pointer-events-none">
                            {evalItem.comment.length} ký tự
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- PHẦN 2: TỔNG ĐIỂM KIẾN THỨC + DEMO SẢN PHẨM (Clean, Minimalist Border) --- */}
      {!hideDemoScore && (
        <div className="space-y-4 rounded-xl bg-muted/20 p-4 sm:p-5">
          {/* Header tổng điểm */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold text-primary">
                Demo Score: {grandTotal} / 10.0
              </span>
              <Badge variant="secondary" className="text-xs border-0 bg-primary/10 text-primary font-medium">
                Kiến thức: {knowledgeScore}/5.0
              </Badge>
              <Badge variant="secondary" className="text-xs border-0 bg-primary/10 text-primary font-medium">
                Demo SP: {demoTotal}/5.0
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">Thang điểm 10.0</span>
          </div>

          {/* Cảnh báo nếu tổng điểm dưới 6.0 */}
          {grandTotal < 6.0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <span>
                ⚠️ Điểm tổng kết hiện tại ({grandTotal}/10.0) đang dưới 6.0 điểm. Theo quy chế điểm tổng kết không dưới 6.0.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleAutoDistribute(6.0)}
                className="h-6 text-[11px] font-semibold border-amber-500/40 hover:bg-amber-500/20 cursor-pointer text-amber-800 dark:text-amber-200"
              >
                🎯 Chia đều 6.0đ
              </Button>
            </div>
          )}

          {/* Thanh chia đều điểm nhanh: Dạng Segmented Pills mượt mà */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-background/60 dark:bg-background/40 p-2 text-xs">
            <span className="font-semibold text-foreground mr-1">🎯 Chia đều điểm:</span>
            {[6.0, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0].map((pts) => (
              <Button
                key={pts}
                type="button"
                variant={grandTotal === pts ? "default" : "ghost"}
                size="sm"
                onClick={() => handleAutoDistribute(pts)}
                className={`h-6 px-2 text-[11px] cursor-pointer rounded-md transition-all ${
                  grandTotal === pts
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {pts.toFixed(1)}đ
              </Button>
            ))}
          </div>

          {/* Bảng nhập điểm chi tiết chuẩn Denise LMS */}
          <div className="space-y-1.5 pt-1">
            {/* Hàng 1: Demo2024 | CSI -> Điểm kiến thức */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm bg-primary/5 rounded-lg p-2 sm:px-3">
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
                  className="h-8 w-20 text-center font-bold text-primary bg-background border-primary/30"
                />
                <span className="font-semibold text-foreground text-xs sm:text-sm">
                  Điểm kiến thức lý thuyết / trên lớp (tối đa 5.0đ)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyText("knowledge_score", String(knowledgeScore))
                }
                className={`h-7 px-2.5 text-xs cursor-pointer transition-all ${
                  activeCopiedKey === "knowledge_score"
                    ? "bg-emerald-600 text-white hover:bg-emerald-600 font-semibold"
                    : copiedHistory["knowledge_score"]
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {activeCopiedKey === "knowledge_score"
                  ? "✓ Đã chép"
                  : copiedHistory["knowledge_score"]
                  ? "✓ Chép lại"
                  : "📋 Copy điểm"}
              </Button>
            </div>

            {/* 5 Hàng Demo sản phẩm */}
            {DEMO_SCORE_CRITERIA.map((criterion, idx) => {
              const scoreVal =
                data.demo_score[
                  criterion.key as keyof typeof data.demo_score
                ] ?? 0;
              const isCopied = activeCopiedKey === criterion.key;
              const wasCopied = Boolean(copiedHistory[criterion.key]);

              return (
                <div
                  key={criterion.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-2 sm:px-3 text-sm hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-28 text-xs text-muted-foreground hidden sm:inline-block">
                      Demo tiêu chí {idx + 1}
                    </span>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max={criterion.maxScore}
                      value={scoreVal}
                      onChange={(e) =>
                        handleDemoScoreChange(criterion.key, e.target.value)
                      }
                      className="h-8 w-20 text-center font-semibold text-foreground bg-background border-muted-foreground/20"
                    />
                    <span className="font-medium text-foreground text-xs sm:text-sm">
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
                    className={`h-7 px-2.5 text-xs cursor-pointer transition-all ${
                      isCopied
                        ? "bg-emerald-600 text-white hover:bg-emerald-600 font-semibold"
                        : wasCopied
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isCopied
                      ? "✓ Đã chép"
                      : wasCopied
                      ? "✓ Chép lại"
                      : "📋 Copy điểm"}
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
