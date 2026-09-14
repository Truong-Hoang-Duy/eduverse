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
import type { FinalPresentationEvaluation } from "@/lib/presentation-evaluation";
import type { ActionResult } from "@/lib/types";

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
  const [presentationNotes, setPresentationNotes] = useState("");
  const [finalEvaluation, setFinalEvaluation] =
    useState<FinalPresentationEvaluation | null>(null);

  useEffect(() => {
    if (isFinalPresentation) {
      try {
        const cached = localStorage.getItem(
          `eduverse_rubric_${sessionId}_${studentId}`
        );
        if (cached) {
          setFinalEvaluation(JSON.parse(cached));
        }
      } catch {}
    }
  }, [isFinalPresentation, sessionId, studentId]);

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
      if (isFinalPresentation) {
        const res = await generateFinalPresentationReview({
          studentName,
          classCode: classCode ?? "",
          courseName: courseName ?? "",
          academicLevel: academicLevelLabel(academicLevel) ?? undefined,
          projectName: project?.name,
          projectDescription: project?.description ?? undefined,
          projectFeatures: project?.features ?? undefined,
          presentationNotes: presentationNotes.trim() || undefined,
          priorReviews: allPriorReviews ?? [],
          currentStrengths: strengths,
          currentImprovements: improvements,
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
        {strengths.map((s) => (
          <input key={s} type="hidden" name="strengths" value={s} />
        ))}
        {improvements.map((s) => (
          <input key={s} type="hidden" name="improvements" value={s} />
        ))}

        {isFinalPresentation && (
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-primary flex items-center gap-1.5">
                🎓 {sessionTitle}: Thuyết trình sản phẩm cuối khóa &amp; Tổng kết
              </span>
              {project ? (
                <Badge variant="outline" className="text-xs bg-background">
                  💻 Đề tài: {project.name}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Chưa nộp đề tài trên hệ thống
                </Badge>
              )}
            </div>

            {project && (
              <div className="text-xs text-muted-foreground space-y-1 bg-background/80 rounded p-2.5 border border-border/50">
                {project.description && (
                  <p><strong className="text-foreground">Mô tả:</strong> {project.description}</p>
                )}
                {project.features && project.features.length > 0 && (
                  <p><strong className="text-foreground">Tính năng:</strong> {project.features.join(" • ")}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <Label htmlFor={`pres-notes-${studentId}`} className="text-xs font-semibold text-foreground">
                🎤 Ghi chú buổi thuyết trình của em (tùy chọn — làm ngữ cảnh cho AI chấm Demo &amp; ĐNL)
              </Label>
              <Input
                id={`pres-notes-${studentId}`}
                value={presentationNotes}
                onChange={(e) => setPresentationNotes(e.target.value)}
                placeholder="VD: Thuyết trình tự tin, demo mượt mà, trả lời tốt câu hỏi phản biện của thầy cô..."
                className="h-8 text-xs bg-background"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "Thuyết trình tự tin, lưu loát",
                  "Demo sản phẩm chạy mượt",
                  "Slide trình bày đẹp, rõ ràng",
                  "Trả lời tốt câu hỏi phản biện",
                  "Cần nói to, rõ ràng hơn",
                  "Ý tưởng sáng tạo, nổi bật",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setPresentationNotes((prev) =>
                        prev ? `${prev}, ${chip.toLowerCase()}` : chip
                      );
                    }}
                    className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground cursor-pointer transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Combo/copy — LUÔN hiện thẳng, không giấu trong accordion: đây là
            thao tác áp nhanh GV dùng thường xuyên (user chốt 2026-08-05).
            Xếp loại học lực giờ CHỈ ĐỌC (badge trên tiêu đề), không còn Select
            ở đây (user chốt 2026-08-28 — tích 1 lần ở Danh sách học viên). */}
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
                {aiPending
                  ? "AI đang viết..."
                  : isFinalPresentation
                    ? "✨ AI tổng kết Buổi 14 & Đánh giá năng lực"
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
              isFinalPresentation
                ? "Bấm 'AI tổng kết Buổi 14' để sinh nhận xét toàn khóa và bảng ĐNL / Demo Score..."
                : "Bấm 'AI tạo nhận xét' rồi chỉnh sửa lại theo ý bạn..."
            }
          />
          {aiError && <p className="text-sm text-destructive">{aiError}</p>}

          {isFinalPresentation && finalEvaluation && (
            <div className="pt-2">
              <PresentationEvaluationCard
                studentName={studentName}
                data={finalEvaluation}
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
