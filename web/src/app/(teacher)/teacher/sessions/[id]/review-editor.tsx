"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { FormMessage } from "@/components/forms/form-message";
import { MultiSelect } from "@/components/multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
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
  isImprovementObservation,
  type ObservationLevel,
  PRESENTATION_OBSERVATION_GROUPS,
} from "@/lib/presentation-evaluation";
import {
  getSpckLevel,
  getSpckSkillGroup,
  isSpckImprovement,
  resolveDefaultSpckLevel,
  SPCK_LEVEL_CONFIGS,
  SPCK_OBSERVATION_BANK,
  SPCK_SKILL_GROUPS,
  type SpckLevel,
  type SpckObservationItem,
} from "@/lib/spck-evaluation";
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

const EXAM_LEVEL_CONFIG: {
  level: ObservationLevel;
  label: string;
  icon: string;
  activeClass: string;
}[] = [
  {
    level: "Giỏi",
    label: "Giỏi",
    icon: "🌟",
    activeClass:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-semibold shadow-2xs",
  },
  {
    level: "Khá",
    label: "Khá",
    icon: "👍",
    activeClass:
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/40 font-semibold shadow-2xs",
  },
  {
    level: "Trung bình",
    label: "Trung bình",
    icon: "⚖️",
    activeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold shadow-2xs",
  },
  {
    level: "Cần cố gắng",
    label: "Cần cố gắng",
    icon: "⚠️",
    activeClass:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 font-semibold shadow-2xs",
  },
];

export function ReviewEditor({
  index,
  sessionId,
  sessionNumber,
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
  index?: number;
  sessionId: string;
  sessionNumber?: number;
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
    Boolean(isFinalPresentation) || Boolean(isPeriodicTest);
  const isExam = Boolean(isPeriodicTest && !isFinalPresentation);
  const isPeriodicExam = Boolean(
    isPeriodicTest && !isFinalSession && !isFinalPresentation
  );
  const hideDemoScore = isExam;

  const defaultExamLevel: ObservationLevel | "all" =
    academicLevelLabel(academicLevel) === "Giỏi"
      ? "Giỏi"
      : academicLevelLabel(academicLevel) === "Trung bình"
        ? "Trung bình"
        : academicLevelLabel(academicLevel) === "Cần cố gắng"
          ? "Cần cố gắng"
          : "Khá";

  const [selectedExamLevel, setSelectedExamLevel] = useState<
    ObservationLevel | "all"
  >(defaultExamLevel);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  function toggleObservation(item: string) {
    setSelectedObservations((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }

  function getExamLevelSelectedCount(level: ObservationLevel): number {
    return FINAL_EXAM_OBSERVATION_GROUPS.reduce((sum, grp) => {
      const sec = grp.sections?.find((s) => s.level === level);
      if (!sec) return sum;
      return sum + sec.items.filter((it) => selectedObservations.includes(it)).length;
    }, 0);
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
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [aiError, setAiError] = useState("");
  const [aiPending, startAi] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state?.error && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [state?.error]);

  useEffect(() => {
    if (state?.success && detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [state?.success]);

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

  const strengthOptions = options.filter((o) => o.category === "strength");
  const improvementOptions = options.filter((o) => o.category === "improvement");
  const testProcessOptions = options.filter((o) => o.category === "test_process");
  const projectProgressOptions = options.filter(
    (o) => o.category === "project_progress"
  );

  const [selectedSpckLevel, setSelectedSpckLevel] = useState<SpckLevel | "all">(
    () => resolveDefaultSpckLevel(academicLevel)
  );
  const [customSpckInput, setCustomSpckInput] = useState("");

  // Tổng hợp danh sách quan sát SPCK (từ DB kết hợp ngân hàng chuẩn 44 mục)
  const spckBankItems: SpckObservationItem[] = useMemo(() => {
    const seen = new Set<string>();
    const items: SpckObservationItem[] = [];

    // Ưu tiên items trong DB (đã được giáo viên tùy biến hoặc seed)
    for (const opt of projectProgressOptions) {
      const label = opt.label.trim();
      const lower = label.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        items.push({
          label,
          level: getSpckLevel(label) ?? "trung_binh",
          skillGroup: getSpckSkillGroup(label, opt.skill_group),
        });
      }
    }

    // Bổ sung các items từ ngân hàng chuẩn nếu DB chưa có
    for (const item of SPCK_OBSERVATION_BANK) {
      const lower = item.label.trim().toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        items.push(item);
      }
    }

    return items;
  }, [projectProgressOptions]);

  function toggleProjectProgressNote(note: string) {
    setProjectProgressNotes((prev) =>
      prev.includes(note) ? prev.filter((i) => i !== note) : [...prev, note]
    );
  }

  function handleAddCustomSpckNote() {
    const val = customSpckInput.trim();
    if (!val) return;
    if (!projectProgressNotes.includes(val)) {
      setProjectProgressNotes((prev) => [...prev, val]);
    }
    persistFreeOption("project_progress", val);
    setCustomSpckInput("");
  }

  // Danh sách nhận xét các buổi trước của học viên này
  const priorSessionsWithComment = useMemo(() => {
    return (allPriorReviews ?? [])
      .filter((r) => Boolean(r.comment?.trim()))
      .sort((a, b) => b.session_number - a.session_number);
  }, [allPriorReviews]);

  const priorCommentsList = useMemo(() => {
    if (priorSessionsWithComment.length > 0) {
      return priorSessionsWithComment.map((r) => ({
        key: `prior_session_${r.session_number}`,
        label: `Buổi ${r.session_number}`,
        preview: r.comment?.slice(0, 50) ?? "",
        fullComment: r.comment ?? "",
      }));
    }
    return (priorComments ?? []).map((c, idx) => {
      const parts = c.split(":");
      const sessionLabel = parts[0]?.trim() || `Buổi trước`;
      const commentText = (parts.length > 1 ? parts.slice(1).join(":") : c).trim();
      return {
        key: `prior_cmt_${idx}`,
        label: sessionLabel,
        preview: commentText.slice(0, 50),
        fullComment: commentText,
      };
    });
  }, [priorSessionsWithComment, priorComments]);

  function applyPriorComment(key: string) {
    if (!key) return;
    const item = priorCommentsList.find((p) => p.key === key);
    if (item?.fullComment) {
      setComment(item.fullComment);
      setCopied(false);
    }
  }

  function persistFreeOption(
    category: "test_process" | "project_progress" | "strength" | "improvement",
    label: string
  ) {
    const alreadyInCatalog = options.some(
      (o) => o.category === category && o.label.toLowerCase() === label.toLowerCase()
    );
    if (alreadyInCatalog) return;
    const fd = new FormData();
    fd.set("category", category);
    fd.set("label", label);
    fd.set(
      "skill_group",
      category === "project_progress" ? getSpckSkillGroup(label) : "other"
    );
    addReviewOption({}, fd).catch(() => {});
  }

  function addCustomStrength(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setStrengths((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistFreeOption("strength", value);
  }

  function addCustomImprovement(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setImprovements((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistFreeOption("improvement", value);
  }

  function addCustomTestProcessNote(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setTestProcessNotes((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistFreeOption("test_process", value);
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
          isPeriodicExam,
          sessionNumber,
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
        strengths: isProjectPeriod ? [] : strengths,
        improvements: isProjectPeriod ? [] : improvements,
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

  const formattedIndex =
    typeof index === "number"
      ? index < 10
        ? `0${index}`
        : String(index)
      : undefined;

  // Số cột grid Điểm mạnh/Cải thiện/Quá trình làm bài/SPCK — tùy 2 cờ buổi.
  const extraCols = (isPeriodicTest ? 1 : 0) + (isProjectPeriod ? 1 : 0);
  const gridColsClass =
    extraCols === 0
      ? "grid gap-4 sm:grid-cols-2"
      : extraCols === 1
        ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <details
      ref={detailsRef}
      className={cn(
        "review-editor-item group rounded-xl border-2 transition-all duration-200 shadow-xs overflow-hidden open:overflow-visible",
        isAbsent
          ? "border-amber-500/70 dark:border-amber-500/60 bg-card"
          : state?.success || reviewed
          ? "border-emerald-600/70 dark:border-emerald-500/70 bg-card hover:border-emerald-600 dark:hover:border-emerald-400"
          : "border-slate-300 dark:border-slate-700 bg-card hover:border-primary/80 hover:shadow-sm"
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 sm:p-4 [&::-webkit-details-marker]:hidden select-none hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold shadow-xs transition-colors",
              isAbsent
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                : state?.success || reviewed
                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                : "bg-muted text-muted-foreground"
            )}
            title={`Học viên số ${formattedIndex ?? ""}`}
          >
            {isAbsent ? "🚫" : state?.success || reviewed ? "✓" : formattedIndex ?? "•"}
          </span>

          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-sm font-bold tracking-tight text-foreground">
              {studentName}
            </span>

            {levelLabel && (
              <Badge
                variant="secondary"
                className="text-[10px] font-medium border border-border/60 bg-muted/80 text-foreground/80 px-1.5 py-0.5"
              >
                🏷️ {levelLabel}
              </Badge>
            )}

            {isAbsent ? (
              <Badge
                variant="secondary"
                className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium border border-amber-500/30 px-2"
              >
                Vắng mặt
              </Badge>
            ) : state?.success ? (
              <Badge className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/40 px-2">
                ✓ {state.success}
              </Badge>
            ) : reviewed ? (
              <Badge
                variant="secondary"
                className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/40 px-2"
              >
                ✓ Đã nhận xét
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] text-muted-foreground border-slate-300 dark:border-slate-700 border-dashed px-1.5"
              >
                ⏳ Chưa xong
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {comment.trim() && !isAbsent && (
            <Button
              type="button"
              variant={copied ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleCopyComment();
              }}
              className={cn(
                "h-7 px-2.5 text-xs font-medium cursor-pointer transition-all shadow-2xs",
                copied
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent"
                  : "border-slate-300 dark:border-slate-700 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              title="Copy nhanh nhận xét của em này"
            >
              {copied ? (
                <span className="flex items-center gap-1 font-semibold">
                  <span>✓</span> Đã copy
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span>📋</span> Copy
                </span>
              )}
            </Button>
          )}

          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
        </div>
      </summary>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={() => {
          if (detailsRef.current) {
            detailsRef.current.open = false;
          }
        }}
        className="space-y-4 border-t-2 border-slate-200 dark:border-slate-800 bg-muted/5 p-4 sm:p-5"
      >
        <input type="hidden" name="session_id" value={sessionId} />
        <input type="hidden" name="student_id" value={studentId} />
        <input type="hidden" name="is_absent" value={String(isAbsent)} />

        {/* Đánh vắng — dạng toggle card thanh lịch */}
        <label
          className={cn(
            "flex cursor-pointer items-center justify-between rounded-lg p-2.5 sm:px-3 text-xs sm:text-sm font-medium transition-all shadow-2xs",
            isAbsent
              ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/60"
              : "bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground border border-slate-300 dark:border-slate-700"
          )}
        >
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isAbsent}
              onChange={(e) => toggleAbsent(e.target.checked)}
              disabled={pending}
              className="size-4 rounded accent-primary cursor-pointer"
            />
            <span>🚫 Vắng mặt buổi này (không cần nhận xét)</span>
          </div>
          {isAbsent && (
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
              ✓ Đã tự động lưu
            </span>
          )}
        </label>

        {isAbsent && (
          <p className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
            Đã đánh dấu vắng và LƯU luôn — em được tính là xử lý xong, không còn
            trong bộ lọc &quot;Chưa hoàn thành&quot;, và được bỏ qua khi tổng hợp
            tin Zalo cho phụ huynh. Bỏ tick nếu đánh nhầm.
          </p>
        )}

        {!isAbsent && (
          <>
            {!hasFinalEvaluation && !isProjectPeriod && (
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
                {/* Tiêu đề & Thông tin Buổi kiểm tra / Buổi 14 */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2.5">
                  <span className="text-sm font-bold text-primary flex items-center gap-2">
                    {isFinalPresentation ? "🎓" : "📝"} {sessionTitle}:{" "}
                    {isFinalPresentation
                      ? "Thuyết trình sản phẩm cuối khóa & Tổng kết"
                      : isPeriodicExam
                        ? "Bài kiểm tra định kỳ & Đánh giá năng lực"
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
                  ) : isPeriodicExam ? (
                    <Badge
                      variant="outline"
                      className="text-xs bg-background text-primary border-primary/30"
                    >
                      Kiểm tra định kỳ
                    </Badge>
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
                {/* Khối tích chọn quan sát (Thuyết trình hoặc Bài kiểm tra) */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>{isFinalPresentation ? "🎤" : "📝"}</span>
                      <span>
                        {isFinalPresentation
                          ? "Tích chọn quan sát buổi thuyết trình & sản phẩm của em:"
                          : isPeriodicExam
                            ? "Tích chọn quan sát bài kiểm tra định kỳ của em:"
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

                  {/* Thanh lọc theo cấp bậc học lực cho Bài kiểm tra */}
                  {!isFinalPresentation && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-lg bg-muted/40 border border-border/50">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[11px] font-medium text-muted-foreground px-1 hidden sm:inline">
                          Mức đánh giá:
                        </span>
                        {EXAM_LEVEL_CONFIG.map((lvl) => {
                          const count = getExamLevelSelectedCount(lvl.level);
                          const isActive = selectedExamLevel === lvl.level;
                          return (
                            <button
                              key={lvl.level}
                              type="button"
                              onClick={() => setSelectedExamLevel(lvl.level)}
                              className={cn(
                                "px-2.5 py-1 text-xs rounded-md border transition-all flex items-center gap-1.5 cursor-pointer select-none",
                                isActive
                                  ? lvl.activeClass
                                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/80"
                              )}
                            >
                              <span>{lvl.icon}</span>
                              <span>{lvl.label}</span>
                              {count > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/20 text-primary">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setSelectedExamLevel("all")}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-md border transition-all flex items-center gap-1 cursor-pointer select-none",
                            selectedExamLevel === "all"
                              ? "bg-background text-foreground border-border shadow-2xs font-semibold"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/80"
                          )}
                        >
                          <span>📋 Xem tất cả</span>
                        </button>
                      </div>

                      {academicLevel && (
                        <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded bg-background/70 border border-border/40">
                          Xếp loại học lực:{" "}
                          <strong className="text-foreground font-medium">
                            {academicLevelLabel(academicLevel)}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Danh sách các nhóm quan sát dạng DROPDOWN độc lập */}
                  <div
                    className={cn(
                      "grid gap-2.5",
                      isFinalPresentation
                        ? "grid-cols-1 md:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2"
                    )}
                  >
                    {observationGroups.map((grp, grpIdx) => {
                      const groupSelectedItems = grp.items.filter((it) =>
                        selectedObservations.includes(it)
                      );
                      const groupSelectedCount = groupSelectedItems.length;
                      const isOpen = activeDropdown === grp.group;

                      return (
                        <div key={grp.group} className="relative">
                          {/* Thanh Header Dropdown Trigger - Chiều cao CỐ ĐỊNH h-11, KHÔNG hiển thị ra ngoài làm giật giao diện */}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDropdown((prev) =>
                                prev === grp.group ? null : grp.group
                              )
                            }
                            className={cn(
                              "w-full h-11 px-3 flex items-center justify-between rounded-lg border transition-all cursor-pointer select-none bg-background",
                              isOpen
                                ? "border-primary shadow-xs ring-1 ring-primary/25"
                                : groupSelectedCount > 0
                                  ? "border-primary/50 bg-primary/5 hover:border-primary"
                                  : "border-border/70 hover:border-border hover:bg-muted/20"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm shrink-0">{grp.icon}</span>
                              <span className="text-xs font-semibold text-foreground truncate">
                                {grp.group}
                              </span>
                              {groupSelectedCount > 0 ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0.5 h-4.5 bg-primary/15 text-primary border border-primary/30 font-semibold shrink-0"
                                >
                                  ✓ Đã chọn {groupSelectedCount}
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
                                  (Chưa chọn)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-muted-foreground shrink-0 ml-2">
                              <span className="text-[11px] font-medium text-primary">
                                {isOpen ? "Thu lại" : "Xổ xuống"}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "size-3.5 text-primary transition-transform duration-200",
                                  isOpen && "rotate-180"
                                )}
                              />
                            </div>
                          </button>

                          {/* DROPDOWN NỔI LÊN BỀ MẶT (FLOATING OVERLAY) - Không chiếm vị trí, không đẩy các phần tử khác */}
                          {isOpen && (
                            <>
                              {/* Lớp phủ vô hình bắt click bên ngoài để đóng dropdown */}
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveDropdown(null)}
                              />

                              {/* Menu nổi có bóng đổ & viền sắc nét */}
                              <div
                                className={cn(
                                  "absolute top-full mt-1.5 z-50 rounded-xl border border-border bg-popover/95 backdrop-blur-md text-popover-foreground shadow-2xl ring-1 ring-black/10 dark:ring-white/10 p-3 space-y-2.5 animate-in fade-in-0 zoom-in-95 duration-150",
                                  "w-[calc(100vw-3rem)] sm:w-[450px] md:w-[480px] max-w-[520px]",
                                  grpIdx === 0
                                    ? "left-0"
                                    : grpIdx === observationGroups.length - 1
                                      ? "right-0"
                                      : "left-0 sm:left-1/2 sm:-translate-x-1/2"
                                )}
                              >
                                {/* Header của Menu nổi */}
                                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm shrink-0">{grp.icon}</span>
                                    <span className="text-xs font-semibold text-foreground truncate">
                                      {grp.group}
                                    </span>
                                    {groupSelectedCount > 0 && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0 h-4 bg-primary/15 text-primary border-0 font-medium shrink-0"
                                      >
                                        Đã chọn {groupSelectedCount}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {groupSelectedCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedObservations((prev) =>
                                            prev.filter((it) => !grp.items.includes(it))
                                          );
                                        }}
                                        className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                      >
                                        ✕ Bỏ chọn nhóm
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setActiveDropdown(null)}
                                      className="text-xs font-medium text-primary hover:text-primary/90 px-2.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/15 transition-colors cursor-pointer"
                                    >
                                      ✓ Xong
                                    </button>
                                  </div>
                                </div>

                                {/* Nội dung danh sách tiêu chí quan sát cuộn mượt */}
                                <div className="space-y-2">
                                  {grp.sections && grp.sections.length > 0 ? (
                                    selectedExamLevel === "all" ? (
                                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                                        {grp.sections.map((sec) => {
                                          const levelColorClass =
                                            sec.level === "Giỏi"
                                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                              : sec.level === "Khá"
                                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                                : sec.level === "Trung bình"
                                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";

                                          const strengths = sec.items.filter(
                                            (it) => !isImprovementObservation(it)
                                          );
                                          const improvements = sec.items.filter(
                                            isImprovementObservation
                                          );

                                          return (
                                            <div key={sec.level} className="space-y-1.5">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-xs">{sec.icon}</span>
                                                <span
                                                  className={cn(
                                                    "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                                    levelColorClass
                                                  )}
                                                >
                                                  {sec.level}
                                                </span>
                                              </div>

                                              {/* Ưu điểm */}
                                              {strengths.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                  {strengths.map((item) => {
                                                    const isSelected =
                                                      selectedObservations.includes(item);
                                                    return (
                                                      <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() => toggleObservation(item)}
                                                        className={cn(
                                                          "text-[11px] px-2 py-0.5 rounded-full border transition-all text-left flex items-center gap-1 cursor-pointer select-none leading-tight",
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
                                              )}

                                              {/* Cải thiện */}
                                              {improvements.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-0.5">
                                                  {improvements.map((item) => {
                                                    const isSelected =
                                                      selectedObservations.includes(item);
                                                    return (
                                                      <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() => toggleObservation(item)}
                                                        className={cn(
                                                          "text-[11px] px-2 py-0.5 rounded-full border transition-all text-left flex items-center gap-1 cursor-pointer select-none leading-tight",
                                                          isSelected
                                                            ? "border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-200 font-medium shadow-2xs ring-1 ring-amber-500/30"
                                                            : "border-amber-500/30 bg-amber-500/5 text-muted-foreground hover:border-amber-500/50 hover:text-foreground hover:bg-amber-500/10"
                                                        )}
                                                      >
                                                        <span className="text-[10px] font-bold">
                                                          {isSelected ? "✓" : "💡"}
                                                        </span>
                                                        <span>{item}</span>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                        {(() => {
                                          const activeSec = grp.sections.find(
                                            (s) => s.level === selectedExamLevel
                                          );
                                          if (!activeSec) return null;

                                          const strengths = activeSec.items.filter(
                                            (it) => !isImprovementObservation(it)
                                          );
                                          const improvements = activeSec.items.filter(
                                            isImprovementObservation
                                          );

                                          return (
                                            <>
                                              {/* Ưu điểm / Điểm làm tốt */}
                                              {strengths.length > 0 && (
                                                <div className="space-y-1">
                                                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                    <span>✨</span> Điểm làm tốt ({strengths.length})
                                                  </span>
                                                  <div className="flex flex-wrap gap-1">
                                                    {strengths.map((item) => {
                                                      const isSelected =
                                                        selectedObservations.includes(item);
                                                      return (
                                                        <button
                                                          key={item}
                                                          type="button"
                                                          onClick={() => toggleObservation(item)}
                                                          className={cn(
                                                            "text-[11px] px-2 py-0.5 rounded-full border transition-all text-left flex items-center gap-1 cursor-pointer select-none leading-tight",
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
                                              )}

                                              {/* Cần cải thiện / Lưu ý */}
                                              {improvements.length > 0 && (
                                                <div className="space-y-1 pt-1.5 border-t border-border/30">
                                                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                    <span>💡</span> Cần lưu ý & cải thiện ({improvements.length})
                                                  </span>
                                                  <div className="flex flex-wrap gap-1">
                                                    {improvements.map((item) => {
                                                      const isSelected =
                                                        selectedObservations.includes(item);
                                                      return (
                                                        <button
                                                          key={item}
                                                          type="button"
                                                          onClick={() => toggleObservation(item)}
                                                          className={cn(
                                                            "text-[11px] px-2 py-0.5 rounded-full border transition-all text-left flex items-center gap-1 cursor-pointer select-none leading-tight",
                                                            isSelected
                                                              ? "border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-200 font-medium shadow-2xs ring-1 ring-amber-500/30"
                                                              : "border-amber-500/30 bg-amber-500/5 text-muted-foreground hover:border-amber-500/50 hover:text-foreground hover:bg-amber-500/10"
                                                          )}
                                                        >
                                                          <span className="text-[10px] font-bold">
                                                            {isSelected ? "✓" : "💡"}
                                                          </span>
                                                          <span>{item}</span>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                    )
                                  ) : (
                                    <div className="flex flex-wrap gap-1 max-h-[220px] overflow-y-auto pr-1">
                                      {grp.items.map((item) => {
                                        const isSelected =
                                          selectedObservations.includes(item);
                                        const isImprovement = isImprovementObservation(item);
                                        return (
                                          <button
                                            key={item}
                                            type="button"
                                            onClick={() => toggleObservation(item)}
                                            className={cn(
                                              "text-[11px] px-2 py-0.5 rounded-full border transition-all text-left flex items-center gap-1 cursor-pointer select-none leading-tight",
                                              isSelected
                                                ? isImprovement
                                                  ? "border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-200 font-medium shadow-2xs ring-1 ring-amber-500/30"
                                                  : "border-primary bg-primary/10 text-primary font-medium shadow-2xs ring-1 ring-primary/25"
                                                : isImprovement
                                                  ? "border-amber-500/30 bg-amber-500/5 text-muted-foreground hover:border-amber-500/50 hover:text-foreground hover:bg-amber-500/10"
                                                  : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/30"
                                            )}
                                          >
                                            <span className="text-[10px] font-bold">
                                              {isSelected ? "✓" : isImprovement ? "💡" : "+"}
                                            </span>
                                            <span>{item}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                        {isPeriodicExam
                          ? "Điểm mạnh & điểm cần cải thiện được AI phân tích từ quá trình học và bài kiểm tra định kỳ để đưa vào nhận xét."
                          : "Điểm mạnh & điểm cần cải thiện được AI tự động phân tích và tổng hợp đa chiều từ lịch sử 13 buổi học trước để đưa vào nhận xét toàn khóa."}
                      </span>
                    </p>
                  </div>
                </div>
              )}

            {/* --- CÁC BUỔI THƯỜNG (BUỔI 1 - 13): COMBO, ĐIỂM MẠNH, CẦN CẢI THIỆN --- */}
            {/* --- CÁC BUỔI THƯỜNG (BUỔI 1 - 13): COMBO, ĐIỂM MẠNH, CẦN CẢI THIỆN HOẶC SPCK --- */}
            {!hasFinalEvaluation && (
              <>
                {/* Thanh công cụ: Nếu là buổi làm đồ án (SPCK), ẩn combo và đổi copy điểm mạnh thành copy nhận xét buổi trước */}
                {isProjectPeriod ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {priorCommentsList.length > 0 && (
                      <Select value="" onValueChange={applyPriorComment}>
                        <SelectTrigger
                          size="sm"
                          className="h-7 w-[230px] text-xs"
                          aria-label="Xem và copy nhận xét buổi trước"
                        >
                          <SelectValue placeholder="📋 Nhận xét buổi trước..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>📅 Nhận xét các buổi trước của em</SelectLabel>
                            {priorCommentsList.map((item) => (
                              <SelectItem key={item.key} value={item.key}>
                                <span className="font-semibold text-foreground">{item.label}:</span>{" "}
                                <span className="text-muted-foreground truncate max-w-[280px]">
                                  {item.preview}...
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ) : (
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
                )}

                {/* Khung quan sát: Buổi SPCK thì ẩn Điểm mạnh / Cần cải thiện, hiển thị Quan sát SPCK chia theo kỹ năng & cấp độ */}
                {isProjectPeriod ? (
                  <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-card p-4 space-y-3.5 shadow-2xs">
                    {/* Header & Bộ lọc cấp độ học lực */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <span>🎓</span> Quan sát quá trình làm đồ án (SPCK)
                        </span>
                        {projectProgressNotes.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-primary/15 text-primary border border-primary/25 font-semibold"
                          >
                            ✓ Đã chọn {projectProgressNotes.length}
                          </Badge>
                        )}
                      </div>

                      {/* Filter cấp độ */}
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedSpckLevel("all")}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer",
                            selectedSpckLevel === "all"
                              ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                              : "bg-background text-muted-foreground hover:text-foreground border-border/70"
                          )}
                        >
                          Tất cả
                        </button>
                        {SPCK_LEVEL_CONFIGS.map((cfg) => {
                          const isMatch = cfg.academicLevelMatch.includes(
                            academicLevel ?? ""
                          );
                          const isSelected = selectedSpckLevel === cfg.level;
                          return (
                            <button
                              key={cfg.level}
                              type="button"
                              onClick={() => setSelectedSpckLevel(cfg.level)}
                              className={cn(
                                "text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1",
                                isSelected
                                  ? `${cfg.badgeClass} font-semibold shadow-2xs ring-1 ring-primary/25`
                                  : "bg-background text-muted-foreground hover:text-foreground border-border/70"
                              )}
                            >
                              <span>{cfg.icon}</span>
                              <span>{cfg.label}</span>
                              {isMatch && (
                                <span className="text-[10px] ml-0.5 opacity-85 font-normal">
                                  (khớp học lực)
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Danh sách các nhóm kỹ năng */}
                    <div className="space-y-3">
                      {SPCK_SKILL_GROUPS.map((skill) => {
                        const items = spckBankItems.filter(
                          (item) =>
                            item.skillGroup === skill.value &&
                            (selectedSpckLevel === "all" ||
                              item.level === selectedSpckLevel)
                        );
                        if (items.length === 0) return null;

                        return (
                          <div key={skill.value} className="space-y-1.5">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <span>{skill.icon}</span>
                              <span>{skill.label}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ({items.length})
                              </span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {items.map((item) => {
                                const isSelected = projectProgressNotes.includes(
                                  item.label
                                );
                                const isImprovement = isSpckImprovement(
                                  item.label
                                );
                                return (
                                  <button
                                    key={item.label}
                                    type="button"
                                    onClick={() =>
                                      toggleProjectProgressNote(item.label)
                                    }
                                    className={cn(
                                      "text-xs px-2.5 py-1 rounded-full border transition-all text-left flex items-center gap-1.5 cursor-pointer select-none leading-tight",
                                      isSelected
                                        ? "border-primary bg-primary/10 text-primary font-medium shadow-2xs ring-1 ring-primary/25"
                                        : isImprovement
                                        ? "border-amber-500/30 bg-amber-500/5 text-muted-foreground hover:border-amber-500/50 hover:text-foreground hover:bg-amber-500/10"
                                        : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/30"
                                    )}
                                  >
                                    <span className="text-[10px] font-bold">
                                      {isSelected
                                        ? "✓"
                                        : isImprovement
                                        ? "💡"
                                        : "+"}
                                    </span>
                                    <span>{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Danh sách đã chọn tóm tắt (nếu có) */}
                    {projectProgressNotes.length > 0 && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                            <span>✓</span> Đã chọn {projectProgressNotes.length} quan sát SPCK:
                          </span>
                          <button
                            type="button"
                            onClick={() => setProjectProgressNotes([])}
                            className="text-[11px] text-muted-foreground hover:text-destructive underline cursor-pointer"
                          >
                            Xóa tất cả
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {projectProgressNotes.map((note) => (
                            <span
                              key={note}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                            >
                              <span>{note}</span>
                              <button
                                type="button"
                                onClick={() => toggleProjectProgressNote(note)}
                                className="hover:text-destructive cursor-pointer ml-0.5 font-bold"
                                aria-label={`Bỏ chọn ${note}`}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gõ thêm quan sát tự do */}
                    <div className="pt-1 flex gap-2">
                      <Input
                        value={customSpckInput}
                        onChange={(e) => setCustomSpckInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomSpckNote();
                          }
                        }}
                        placeholder="Gõ thêm quan sát khác về đồ án của em rồi nhấn Thêm hoặc Enter..."
                        className="h-8 text-xs bg-background flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomSpckNote}
                        disabled={!customSpckInput.trim()}
                        className="h-8 text-xs cursor-pointer"
                      >
                        Thêm
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Giao diện chuẩn cho các buổi khác: Điểm mạnh & Cần cải thiện */
                  <div className={gridColsClass}>
                    <div className="space-y-1.5">
                      <p className="flex h-7 items-center text-sm font-medium">💪 Điểm mạnh</p>
                      <MultiSelect
                        options={strengthOptions}
                        selected={strengths}
                        onChange={setStrengths}
                        onCreate={addCustomStrength}
                        onDelete={deleteCustomOption}
                        placeholder="Chọn hoặc gõ điểm mạnh..."
                        emptyText="Chưa có lựa chọn — thêm trong trang Cài đặt."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="flex h-7 items-center text-sm font-medium">🎯 Cần cải thiện</p>
                      <MultiSelect
                        options={improvementOptions}
                        selected={improvements}
                        onChange={setImprovements}
                        onCreate={addCustomImprovement}
                        onDelete={deleteCustomOption}
                        placeholder="Chọn hoặc gõ điểm cần cải thiện..."
                        emptyText="Chưa có lựa chọn — thêm trong trang Cài đặt."
                      />
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
                  </div>
                )}
              </>
            )}

            {/* --- NHẬN XÉT GỬI PHỤ HUYNH --- */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label
                  htmlFor={`comment-${studentId}`}
                  className="text-sm font-bold text-foreground flex items-center gap-1.5"
                >
                  <span>💬</span> Nhận xét gửi phụ huynh
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={copied ? "default" : "outline"}
                    size="sm"
                    onClick={handleCopyComment}
                    disabled={!comment}
                    className={cn(
                      "h-8 px-2.5 text-xs font-medium cursor-pointer transition-all shadow-2xs",
                      copied
                        ? "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent"
                        : "border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {copied ? "✓ Đã copy" : "📋 Copy"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={aiPending}
                    className="h-8 px-3 text-xs font-semibold cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {aiPending ? (
                      <span className="flex items-center gap-1.5">
                        <span className="animate-spin">⏳</span> AI đang viết...
                      </span>
                    ) : isFinalPresentation ? (
                      "✨ AI tổng kết Buổi 14 & Đánh giá năng lực"
                    ) : isPeriodicExam ? (
                      "✨ AI đánh giá bài kiểm tra & Năng lực"
                    ) : (
                      "✨ AI tạo nhận xét"
                    )}
                  </Button>
                </div>
              </div>
              <div className="relative">
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
                        ? isPeriodicExam
                          ? "Bấm 'AI đánh giá bài kiểm tra' để sinh nhận xét bài kiểm tra định kỳ và bảng Đánh Giá Năng Lực..."
                          : "Bấm 'AI tổng kết bài thi' để sinh nhận xét toàn khóa và bảng Đánh Giá Năng Lực..."
                        : "Bấm 'AI tổng kết Buổi 14' để sinh nhận xét toàn khóa và bảng ĐNL / Demo Score..."
                      : "Bấm 'AI tạo nhận xét' rồi chỉnh sửa lại theo ý bạn..."
                  }
                  className="text-sm leading-relaxed text-foreground bg-background border border-slate-300 dark:border-slate-700 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary rounded-lg p-3 min-h-[110px] shadow-2xs resize-y"
                />
                {comment.trim() && (
                  <span className="absolute bottom-2 right-2.5 text-[10px] text-muted-foreground/60 pointer-events-none">
                    {comment.length} ký tự
                  </span>
                )}
              </div>
              {aiError && <p className="text-sm text-destructive">{aiError}</p>}

              {/* Banner & Popup Modal Bảng Đánh Giá Năng Lực & Tổng Điểm */}
              {hasFinalEvaluation && (
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-card p-3.5 shadow-2xs space-y-2">
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
                              ? isPeriodicExam
                                ? "Đã đánh giá 9 tiêu chí ĐNL bài kiểm tra định kỳ. Bấm để xem hoặc chỉnh sửa chi tiết."
                                : "Đã đánh giá 9 tiêu chí ĐNL chuẩn Denise LMS. Bấm để xem hoặc chỉnh sửa chi tiết."
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
                              ? isPeriodicExam
                                ? "Khung 9 tiêu chí Đánh Giá Năng Lực (chuẩn Denise LMS) áp dụng cho bài kiểm tra định kỳ."
                                : "Khung 9 tiêu chí Đánh Giá Năng Lực (chuẩn Denise LMS) áp dụng cho bài kiểm tra cuối khóa."
                              : "Khung 9 tiêu chí Đánh Giá Năng Lực và Điểm Demo Thuyết Trình chuẩn Denise LMS."}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                          {finalEvaluation && (
                            <PresentationEvaluationCard
                              studentName={studentName}
                              data={finalEvaluation}
                              hideDemoScore={hideDemoScore}
                              isPeriodicExam={isPeriodicExam}
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

                        <DialogFooter className="m-0 mx-0 mb-0 px-4 py-3 border-t bg-muted/30 flex flex-row items-center justify-between sm:justify-between gap-3 shrink-0 rounded-b-xl">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>💾</span>
                            <span>Dữ liệu được tự động lưu tạm trên trình duyệt của bạn.</span>
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setRubricModalOpen(false)}
                            className="text-xs cursor-pointer shrink-0"
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
        <div className="flex items-center gap-3 pt-1">
          {!isAbsent && (
            <Button
              type="submit"
              size="sm"
              disabled={pending}
              className="h-9 px-4 text-xs font-semibold cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex items-center gap-1.5"
            >
              {pending ? (
                <span className="flex items-center gap-1.5">
                  <span className="animate-spin">⏳</span> Đang lưu...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span>💾</span> Lưu nhận xét
                </span>
              )}
            </Button>
          )}
          <FormMessage result={state} />
        </div>
      </form>
    </details>
  );
}
