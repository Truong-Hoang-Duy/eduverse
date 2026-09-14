"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { FormMessage } from "@/components/forms/form-message";
import { MultiSelect } from "@/components/multi-select";
import { SelectedBadges } from "@/components/selected-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { academicLevelLabel } from "@/lib/academic-levels";
import {
  generateAiReview,
  generateFinalPresentationReview,
  type PriorReviewHistoryItem,
  saveReview,
} from "@/lib/actions/reviews";
import type { ReviewCombo } from "@/lib/actions/review-combos";
import { addReviewOption, deleteReviewOption } from "@/lib/actions/settings";
import {
  createDefaultFinalEvaluation,
  FINAL_EXAM_OBSERVATION_GROUPS,
  type FinalPresentationEvaluation,
  PRESENTATION_OBSERVATION_GROUPS,
} from "@/lib/presentation-evaluation";
import type { ActionResult } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ComboBar } from "./combo-bar";
import { PresentationEvaluationCard } from "./presentation-evaluation-card";
import { type ExistingReview, isReviewed } from "./review-status";

export interface ReviewOptionItem {
  id: string;
  category: string;
  label: string;
  skill_group: string;
}

/** Một nguồn để copy nhanh điểm mạnh/cần cải thiện sang em đang nhận xét:
 *  bạn cùng buổi (dữ liệu đã lưu) HOẶC một buổi trước của chính em. */
export interface CopySource {
  key: string; // value duy nhất cho Select
  group: string; // nhóm hiển thị (SelectGroup)
  label: string; // nhãn hiển thị
  strengths: string[];
  improvements: string[];
}

export function ReviewEditor({
  sessionId,
  sessionTitle,
  sessionContent,
  sessionContext,
  isPeriodicTest,
  isProjectPeriod,
  isFinalPresentation,
  isFinalSession,
  classCode,
  courseName,
  project,
  allPriorReviews,
  studentId,
  studentName,
  academicLevel,
  options,
  existing,
  priorComments,
  copySources,
  combos,
}: {
  sessionId: string;
  sessionTitle: string;
  sessionContent: string;
  /** Bối cảnh buổi học GV gõ 1 lần (VD: hôm nay kiểm tra) — dùng chung cho
   *  mọi học viên, chỉ để AI tham khảo khi viết nhận xét. */
  sessionContext: string;
  /** Buổi có kiểm tra định kỳ — bật ô "quá trình làm bài" + tách nhận xét AI
   *  thành 2 phần (học tập / kiểm tra). */
  isPeriodicTest: boolean;
  /** Buổi có làm sản phẩm cuối khóa (SPCK) — bật ô "quan sát SPCK", quan sát
   *  được hòa vào đoạn nhận xét chung (không tách phần riêng như kiểm tra). */
  isProjectPeriod: boolean;
  /** Buổi thuyết trình sản phẩm cuối khóa & Tổng kết (Demo Day / Buổi 14). */
  isFinalPresentation?: boolean;
  /** Buổi 14 hoặc buổi cuối khóa học (dù là bài kiểm tra hay thuyết trình). */
  isFinalSession?: boolean;
  classCode?: string;
  courseName?: string;
  project?: {
    id: string;
    name: string;
    description: string | null;
    features: string[] | null;
  } | null;
  allPriorReviews?: PriorReviewHistoryItem[];
  studentId: string;
  studentName: string;
  /** Xếp loại học lực CỦA LỚP NÀY — tích 1 lần ở bảng "Danh sách học viên",
   *  CHỈ ĐỌC ở đây (yêu cầu user 2026-08-28, thay vì chọn lại mỗi buổi). */
  academicLevel: string | null;
  options: ReviewOptionItem[];
  existing: ExistingReview | null;
  /** Nhận xét các buổi trước của học viên này — cho AI tránh lặp lời văn. */
  priorComments?: string[];
  /** Nguồn copy nhanh: bạn cùng buổi + buổi trước của chính em. */
  copySources?: CopySource[];
  /** Bộ combo lưu sẵn của GV — áp cả bộ điểm mạnh/cải thiện/SPCK 1 chạm. */
  combos?: ReviewCombo[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveReview,
    {}
  );
  const [strengths, setStrengths] = useState<string[]>(existing?.strengths ?? []);
  const [improvements, setImprovements] = useState<string[]>(
    existing?.improvements ?? []
  );
  const [comment, setComment] = useState(existing?.ai_generated_comment ?? "");
  const [isAbsent, setIsAbsent] = useState(existing?.is_absent ?? false);
  // KHÔNG lưu vào student_reviews (user chốt 2026-08-05) — chỉ dùng ngay khi
  // bấm "AI tạo nhận xét", mất khi tải lại trang, giống session_context cũ.
  const [testProcessNotes, setTestProcessNotes] = useState<string[]>([]);
  // Cùng cơ chế với testProcessNotes — quan sát SPCK cũng KHÔNG lưu DB.
  const [projectProgressNotes, setProjectProgressNotes] = useState<string[]>([]);
  const [selectedObservations, setSelectedObservations] = useState<string[]>([]);
  const [customObservationNotes, setCustomObservationNotes] = useState("");
  const [rubricModalOpen, setRubricModalOpen] = useState(false);
  const [finalEvaluation, setFinalEvaluation] =
    useState<FinalPresentationEvaluation | null>(null);

  const hasFinalEvaluation =
    Boolean(isFinalPresentation) || Boolean(isPeriodicTest && isFinalSession);
  const hideDemoScore = Boolean(isPeriodicTest && !isFinalPresentation);

  function toggleObservation(item: string) {
    setSelectedObservations((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  const observationGroups = isFinalPresentation
    ? PRESENTATION_OBSERVATION_GROUPS
    : FINAL_EXAM_OBSERVATION_GROUPS;

  useEffect(() => {
    if (hasFinalEvaluation) {
      try {
        const cached = localStorage.getItem(
          `eduverse_rubric_${sessionId}_${studentId}`
        );
        if (cached) {
          setFinalEvaluation(JSON.parse(cached));
        }
      } catch {}
    }
  }, [hasFinalEvaluation, sessionId, studentId]);

  const formRef = useRef<HTMLFormElement>(null);
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

  function copyFromSource(key: string) {
    const source = copySources?.find((s) => s.key === key);
    if (!source) return;
    setStrengths((prev) => mergeUnique(prev, source.strengths));
    setImprovements((prev) => mergeUnique(prev, source.improvements));
  }

  function applyCombo(
    strengthsToAdd: string[],
    improvementsToAdd: string[],
    projectNotesToAdd: string[]
  ) {
    setStrengths((prev) => mergeUnique(prev, strengthsToAdd));
    setImprovements((prev) => mergeUnique(prev, improvementsToAdd));
    setProjectProgressNotes((prev) => mergeUnique(prev, projectNotesToAdd));
  }

  // Gom nguồn copy theo nhóm, GIỮ thứ tự xuất hiện (bạn cùng buổi trước, rồi
  // các buổi trước của em) để SelectGroup hiển thị đúng thứ tự.
  const copyGroups: { group: string; items: CopySource[] }[] = [];
  for (const source of copySources ?? []) {
    const bucket = copyGroups.find((g) => g.group === source.group);
    if (bucket) bucket.items.push(source);
    else copyGroups.push({ group: source.group, items: [source] });
  }

  // Xóa khỏi danh mục dùng chung (review_options) — KHÔNG đụng tới các lựa
  // chọn đã tick sẵn trong review này.
  function deleteCustomOption(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    deleteReviewOption(fd).catch(() => {});
  }

  const testProcessOptions = options.filter((o) => o.category === "test_process");
  const projectProgressOptions = options.filter(
    (o) => o.category === "project_progress"
  );

  function persistFreeOption(category: "test_process" | "project_progress", label: string) {
    const alreadyInCatalog = options.some(
      (o) => o.category === category && o.label.toLowerCase() === label.toLowerCase()
    );
    if (alreadyInCatalog) return;
    const fd = new FormData();
    fd.set("category", category);
    fd.set("label", label);
    fd.set("skill_group", "other");
    addReviewOption({}, fd).catch(() => {});
  }

  function addCustomTestProcessNote(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setTestProcessNotes((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistFreeOption("test_process", value);
  }

  function addCustomProjectProgressNote(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setProjectProgressNotes((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistFreeOption("project_progress", value);
  }

  function handleGenerate() {
    setAiError("");
    setCopied(false);
    startAi(async () => {
      if (hasFinalEvaluation) {
        const combinedNotes = [
          ...selectedObservations,
          ...(customObservationNotes.trim() ? [customObservationNotes.trim()] : []),
        ].join(". ");

        const res = await generateFinalPresentationReview({
          studentName,
          classCode: classCode ?? "",
          courseName: courseName ?? "",
          academicLevel: academicLevelLabel(academicLevel) ?? undefined,
          projectName: isFinalPresentation ? project?.name : undefined,
          projectDescription: isFinalPresentation
            ? (project?.description ?? undefined)
            : undefined,
          projectFeatures: isFinalPresentation
            ? (project?.features ?? undefined)
            : undefined,
          presentationNotes: combinedNotes || undefined,
          priorReviews: allPriorReviews ?? [],
          currentStrengths: [],
          currentImprovements: [],
          isExam: !isFinalPresentation && Boolean(isPeriodicTest),
        });
        if (res.error) {
          setAiError(res.error);
        } else if (res.evaluation) {
          setComment(res.evaluation.comment);
          setFinalEvaluation(res.evaluation);
          try {
            localStorage.setItem(
              `eduverse_rubric_${sessionId}_${studentId}`,
              JSON.stringify(res.evaluation)
            );
          } catch {}
          setRubricModalOpen(true);
        }
        return;
      }

      const res = await generateAiReview({
        studentName,
        sessionTitle,
        sessionContent,
        strengths,
        improvements,
        sessionContext: sessionContext || undefined,
        isPeriodicTest,
        testProcessNotes: isPeriodicTest ? testProcessNotes : undefined,
        isProjectPeriod,
        projectProgressNotes: isProjectPeriod ? projectProgressNotes : undefined,
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

  /**
   * Tick "Vắng" là LƯU LUÔN, không đợi bấm nút Lưu (user chốt 2026-08-03).
   *
   * Vì sao: tick xong thì form ẩn sạch phần nhận xét, trông như đã xong việc nên
   * rất dễ bỏ qua nút Lưu — em ở lại trong bộ lọc "Chưa hoàn thành" mà GV không
   * hiểu vì sao. Bỏ tick cũng lưu lại ngay, để hai chiều đối xứng.
   *
   * Dựng FormData từ CHÍNH form (không tự ghép tay) để mọi thứ GV đang chọn dở
   * đi theo, rồi ghi đè `is_absent` — state React cập nhật bất đồng bộ nên input
   * ẩn chưa kịp mang giá trị mới.
   */
  function toggleAbsent(next: boolean) {
    setIsAbsent(next);
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    data.set("is_absent", String(next));
    // PHẢI bọc trong transition: React 19 chỉ cho gọi thẳng hàm của
    // `useActionState` bên trong một transition (ngoài ra thì chỉ được truyền
    // qua prop `action`). Thiếu chỗ này là lỗi đỏ ngay khi bấm, và `pending`
    // cũng không cập nhật đúng.
    startTransition(() => formAction(data));
  }

  async function handleCopyComment() {
    await navigator.clipboard.writeText(comment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const reviewed = isReviewed(existing);
  const levelLabel = academicLevelLabel(academicLevel);

  // Số cột grid Điểm mạnh/Cải thiện/Quá trình làm bài/SPCK — tùy 2 cờ buổi.
  const extraCols = (isPeriodicTest ? 1 : 0) + (isProjectPeriod ? 1 : 0);
  const gridColsClass =
    extraCols === 0
      ? "grid gap-4 sm:grid-cols-2"
      : extraCols === 1
        ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <details className="group rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-medium">
          {studentName}
          {levelLabel && (
            <Badge variant="outline" className="text-xs font-normal">
              🏷️ {levelLabel}
            </Badge>
          )}
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

      <form ref={formRef} action={formAction} className="space-y-4 border-t p-4">
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="student_id" value={studentId} />
        <input type="hidden" name="is_absent" value={String(isAbsent)} />

        {/* Đánh vắng — mặc định có đi học. Bật lên thì ẩn toàn bộ phần nhận xét
            vì em không học buổi này. */}
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={isAbsent}
            onChange={(e) => toggleAbsent(e.target.checked)}
            disabled={pending}
            className="size-4"
          />
          🚫 Vắng mặt buổi này (không cần nhận xét)
        </label>

        {isAbsent && (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Đã đánh dấu vắng và LƯU luôn — em được tính là xử lý xong, không còn
            trong bộ lọc &quot;Chưa hoàn thành&quot;, và được bỏ qua khi tổng hợp
            tin Zalo cho phụ huynh. Bỏ tick nếu đánh nhầm.
          </p>
        )}

        {!isAbsent && (
          <>
            {!hasFinalEvaluation && (
              <>
                {strengths.map((s) => (
                  <input key={s} type="hidden" name="strengths" value={s} />
                ))}
                {improvements.map((s) => (
                  <input key={s} type="hidden" name="improvements" value={s} />
                ))}
              </>
            )}

            {/* --- BUỔI 14 (TỔNG KẾT): THUYẾT TRÌNH HOẶC BÀI KIỂM TRA CUỐI KHÓA --- */}
            {hasFinalEvaluation && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3.5">
                {/* Tiêu đề & Thông tin Buổi 14 */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2.5">
                  <span className="text-sm font-bold text-primary flex items-center gap-2">
                    {isFinalPresentation ? "🎓" : "📝"} {sessionTitle}:{" "}
                    {isFinalPresentation
                      ? "Thuyết trình sản phẩm cuối khóa & Tổng kết"
                      : "Bài kiểm tra cuối khóa & Đánh giá năng lực"}
                  </span>
                  {isFinalPresentation ? (
                    project ? (
                      <Badge variant="outline" className="text-xs bg-background">
                        💻 Đề tài: {project.name}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground bg-background"
                      >
                        Chưa nộp đề tài trên hệ thống
                      </Badge>
                    )
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs bg-background text-primary border-primary/30"
                    >
                      Tổng kết toàn khóa
                    </Badge>
                  )}
                </div>

                {isFinalPresentation && project && (
                  <div className="text-xs text-muted-foreground space-y-1 bg-background/80 rounded-lg p-2.5 border border-border/50">
                    {project.description && (
                      <p>
                        <strong className="text-foreground">Mô tả:</strong>{" "}
                        {project.description}
                      </p>
                    )}
                    {project.features && project.features.length > 0 && (
                      <p>
                        <strong className="text-foreground">Tính năng:</strong>{" "}
                        {project.features.join(" • ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Khối tích chọn quan sát Buổi 14 (Thuyết trình hoặc Bài kiểm tra) */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>{isFinalPresentation ? "🎤" : "📝"}</span>
                      <span>
                        {isFinalPresentation
                          ? "Tích chọn quan sát buổi thuyết trình & sản phẩm của em:"
                          : "Tích chọn quan sát bài kiểm tra cuối khóa của em:"}
                      </span>
                    </Label>
                    {selectedObservations.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          Đã chọn:{" "}
                          <strong className="text-primary font-medium">
                            {selectedObservations.length}
                          </strong>{" "}
                          mục
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedObservations([])}
                          className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                        >
                          ✕ Bỏ chọn tất cả
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      "grid gap-2.5",
                      isFinalPresentation
                        ? "grid-cols-1 md:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2"
                    )}
                  >
                    {observationGroups.map((grp) => {
                      const groupSelectedCount = grp.items.filter((it) =>
                        selectedObservations.includes(it)
                      ).length;

                      return (
                        <div
                          key={grp.group}
                          className="rounded-lg border border-border/60 bg-background/70 p-2.5 space-y-2 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                              <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <span>{grp.icon}</span> {grp.group}
                              </span>
                              {groupSelectedCount > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-0 font-medium"
                                >
                                  {groupSelectedCount}
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {grp.items.map((item) => {
                                const isSelected =
                                  selectedObservations.includes(item);
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => toggleObservation(item)}
                                    className={cn(
                                      "text-[11px] px-2.5 py-1 rounded-full border transition-all text-left flex items-center gap-1 cursor-pointer select-none",
                                      isSelected
                                        ? "border-primary bg-primary/10 text-primary font-medium shadow-2xs ring-1 ring-primary/25"
                                        : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/30"
                                    )}
                                  >
                                    <span className="text-[10px] font-bold">
                                      {isSelected ? "✓" : "+"}
                                    </span>
                                    <span>{item}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ghi chú thêm */}
                  <div className="pt-1 space-y-1">
                    <Input
                      id={`pres-notes-${studentId}`}
                      value={customObservationNotes}
                      onChange={(e) => setCustomObservationNotes(e.target.value)}
                      placeholder={
                        isFinalPresentation
                          ? "Ghi chú thêm về buổi thuyết trình / sản phẩm của em (tùy chọn)..."
                          : "Ghi chú thêm về bài làm hoặc tác phong kiểm tra của em (tùy chọn)..."
                      }
                      className="h-8 text-xs bg-background"
                    />
                    <p className="text-[11px] text-muted-foreground/80 italic flex items-center gap-1">
                      <span>💡</span>
                      <span>
                        Điểm mạnh &amp; điểm cần cải thiện được AI tự động phân tích và tổng hợp đa chiều từ lịch sử 13 buổi học trước để đưa vào nhận xét toàn khóa.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* --- CÁC BUỔI THƯỜNG (BUỔI 1 - 13): COMBO, ĐIỂM MẠNH, CẦN CẢI THIỆN --- */}
            {!hasFinalEvaluation && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <ComboBar combos={combos ?? []} onApply={applyCombo} />
                  {(copySources?.length ?? 0) > 0 && (
                    <Select value="" onValueChange={copyFromSource}>
                      <SelectTrigger
                        size="sm"
                        className="h-7 w-[190px] text-xs"
                        aria-label="Copy lựa chọn từ bạn khác hoặc buổi trước"
                      >
                        <SelectValue placeholder="📋 Copy điểm mạnh/cải thiện từ..." />
                      </SelectTrigger>
                      <SelectContent>
                        {copyGroups.map(({ group, items }) => (
                          <SelectGroup key={group}>
                            <SelectLabel>{group}</SelectLabel>
                            {items.map((s) => (
                              <SelectItem key={s.key} value={s.key}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className={gridColsClass}>
                  <div className="space-y-1.5">
                    <p className="flex h-7 items-center text-sm font-medium">💪 Điểm mạnh</p>
                    <SelectedBadges selected={strengths} onChange={setStrengths} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="flex h-7 items-center text-sm font-medium">🎯 Cần cải thiện</p>
                    <SelectedBadges selected={improvements} onChange={setImprovements} />
                  </div>
                  {isPeriodicTest && (
                    <div className="space-y-1.5">
                      <div className="flex h-7 items-center">
                        <Label>📝 Quá trình làm bài kiểm tra</Label>
                      </div>
                      <MultiSelect
                        options={testProcessOptions}
                        selected={testProcessNotes}
                        onChange={setTestProcessNotes}
                        onCreate={addCustomTestProcessNote}
                        onDelete={deleteCustomOption}
                        placeholder="Chọn hoặc gõ quan sát về bài kiểm tra..."
                        emptyText="Chưa có lựa chọn — thêm trong trang Cài đặt."
                      />
                    </div>
                  )}
                  {isProjectPeriod && (
                    <div className="space-y-1.5">
                      <div className="flex h-7 items-center">
                        <Label>🎓 Quan sát SPCK</Label>
                      </div>
                      <MultiSelect
                        options={projectProgressOptions}
                        selected={projectProgressNotes}
                        onChange={setProjectProgressNotes}
                        onCreate={addCustomProjectProgressNote}
                        onDelete={deleteCustomOption}
                        placeholder="Chọn hoặc gõ quan sát về SPCK..."
                        emptyText="Chưa có lựa chọn — thêm trong trang Cài đặt."
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* --- NHẬN XÉT GỬI PHỤ HUYNH --- */}
            <div className="space-y-2">
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
                    {aiPending
                      ? "AI đang viết..."
                      : isFinalPresentation
                        ? "✨ AI tổng kết Buổi 14 & Đánh giá năng lực"
                        : isPeriodicTest && isFinalSession
                          ? "✨ AI tổng kết bài thi & Đánh giá năng lực"
                          : "✨ AI tạo nhận xét"}
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
                placeholder={
                  hasFinalEvaluation
                    ? hideDemoScore
                      ? "Bấm 'AI tổng kết bài thi' để sinh nhận xét toàn khóa và bảng Đánh Giá Năng Lực..."
                      : "Bấm 'AI tổng kết Buổi 14' để sinh nhận xét toàn khóa và bảng ĐNL / Demo Score..."
                    : "Bấm 'AI tạo nhận xét' rồi chỉnh sửa lại theo ý bạn..."
                }
              />
              {aiError && <p className="text-sm text-destructive">{aiError}</p>}

              {/* Banner & Popup Modal Bảng Đánh Giá Năng Lực & Tổng Điểm */}
              {hasFinalEvaluation && (
                <div className="rounded-lg border border-border/80 bg-card p-3 shadow-2xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl leading-none pt-0.5">📊</span>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            Bảng Đánh Giá Năng Lực {hideDemoScore ? "(9 tiêu chí)" : "& Điểm Tổng Kết"}
                          </span>
                          {finalEvaluation ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] h-4.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium"
                            >
                              ✓ Đã có dữ liệu
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4.5 text-muted-foreground">
                              Chưa khởi tạo
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {finalEvaluation
                            ? hideDemoScore
                              ? "Đã đánh giá 9 tiêu chí ĐNL chuẩn Denise LMS. Bấm để xem hoặc chỉnh sửa chi tiết."
                              : `Tổng điểm: ${finalEvaluation.demo_score.total.toFixed(1)}/10 (Demo: ${finalEvaluation.demo_score.demo_total.toFixed(1)}, Kiến thức: ${finalEvaluation.demo_score.knowledge_score.toFixed(1)}). Bấm để xem hoặc chỉnh sửa.`
                            : "Khung điểm và 9 tiêu chí ĐNL sẽ được AI tự động tạo khi sinh nhận xét, hoặc bạn có thể mở popup để chấm thủ công."}
                        </p>
                      </div>
                    </div>

                    <Dialog open={rubricModalOpen} onOpenChange={setRubricModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!finalEvaluation) {
                              const initial = createDefaultFinalEvaluation(comment);
                              setFinalEvaluation(initial);
                              try {
                                localStorage.setItem(
                                  `eduverse_rubric_${sessionId}_${studentId}`,
                                  JSON.stringify(initial)
                                );
                              } catch {}
                            }
                            setRubricModalOpen(true);
                          }}
                          className="text-xs font-medium cursor-pointer border-primary/30 text-primary hover:bg-primary/10 hover:text-primary shrink-0"
                        >
                          {finalEvaluation ? "📝 Mở Bảng Đánh Giá (Popup)" : "📊 Khởi tạo & Mở Bảng Đánh Giá"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="p-4 border-b bg-muted/30">
                          <DialogTitle className="text-base font-semibold flex items-center gap-2">
                            <span>📊</span> Bảng Đánh Giá Năng Lực {hideDemoScore ? "" : "& Tổng Điểm"} — {studentName}
                          </DialogTitle>
                          <DialogDescription className="text-xs">
                            {hideDemoScore
                              ? "Khung 9 tiêu chí Đánh Giá Năng Lực (chuẩn Denise LMS) áp dụng cho bài kiểm tra cuối khóa."
                              : "Khung 9 tiêu chí Đánh Giá Năng Lực và Điểm Demo Thuyết Trình chuẩn Denise LMS."}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                          {finalEvaluation && (
                            <PresentationEvaluationCard
                              studentName={studentName}
                              data={finalEvaluation}
                              hideDemoScore={hideDemoScore}
                              onChange={(updated) => {
                                setFinalEvaluation(updated);
                                try {
                                  localStorage.setItem(
                                    `eduverse_rubric_${sessionId}_${studentId}`,
                                    JSON.stringify(updated)
                                  );
                                } catch {}
                              }}
                            />
                          )}
                        </div>

                        <DialogFooter className="p-3 border-t bg-muted/20 sm:justify-between flex items-center">
                          <span className="text-xs text-muted-foreground">
                            Dữ liệu được tự động lưu tạm trên trình duyệt của bạn.
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setRubricModalOpen(false)}
                            className="text-xs"
                          >
                            Đóng
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Đánh vắng đã tự lưu lúc tick nên không còn gì để bấm — giấu nút đi
            thay vì để một nút không có việc gì làm. */}
        <div className="flex items-center gap-3">
          {!isAbsent && (
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Đang lưu..." : "Lưu nhận xét"}
            </Button>
          )}
          <FormMessage result={state} />
        </div>
      </form>
    </details>
  );
}
