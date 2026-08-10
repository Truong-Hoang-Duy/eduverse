"use client";

import {
  startTransition,
  useActionState,
  useRef,
  useState,
  useTransition,
} from "react";

import { FormMessage } from "@/components/forms/form-message";
import { MultiSelect } from "@/components/multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  ACADEMIC_LEVELS,
  academicLevelLabel,
} from "@/lib/academic-levels";
import { generateAiReview, saveReview } from "@/lib/actions/reviews";
import type { ReviewCombo } from "@/lib/actions/review-combos";
import { addReviewOption, deleteReviewOption } from "@/lib/actions/settings";
import { SKILL_GROUPS } from "@/lib/skill-groups";
import type { ActionResult } from "@/lib/types";

import { ComboBar } from "./combo-bar";
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
  studentId,
  studentName,
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
  studentId: string;
  studentName: string;
  options: ReviewOptionItem[];
  existing: ExistingReview | null;
  /** Nhận xét các buổi trước của học viên này — cho AI tránh lặp lời văn. */
  priorComments?: string[];
  /** Nguồn copy nhanh: bạn cùng buổi + buổi trước của chính em. */
  copySources?: CopySource[];
  /** Bộ combo lưu sẵn của GV — áp cả bộ điểm mạnh/cải thiện 1 chạm. */
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
  const [academicLevel, setAcademicLevel] = useState(
    existing?.academic_level ?? ""
  );
  const [isAbsent, setIsAbsent] = useState(existing?.is_absent ?? false);
  // KHÔNG lưu vào student_reviews (user chốt 2026-08-05) — chỉ dùng ngay khi
  // bấm "AI tạo nhận xét", mất khi tải lại trang, giống session_context cũ.
  const [testProcessNotes, setTestProcessNotes] = useState<string[]>([]);
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

  function applyCombo(strengthsToAdd: string[], improvementsToAdd: string[]) {
    setStrengths((prev) => mergeUnique(prev, strengthsToAdd));
    setImprovements((prev) => mergeUnique(prev, improvementsToAdd));
  }

  // Gom nguồn copy theo nhóm, GIỮ thứ tự xuất hiện (bạn cùng buổi trước, rồi
  // các buổi trước của em) để SelectGroup hiển thị đúng thứ tự.
  const copyGroups: { group: string; items: CopySource[] }[] = [];
  for (const source of copySources ?? []) {
    const bucket = copyGroups.find((g) => g.group === source.group);
    if (bucket) bucket.items.push(source);
    else copyGroups.push({ group: source.group, items: [source] });
  }

  // Bộ lọc nhóm kỹ năng của từng combo box — mặc định "all" (không lọc).
  const [strengthGroup, setStrengthGroup] = useState("all");
  const [improvementGroup, setImprovementGroup] = useState("all");

  // Gõ tự do NGAY TRONG ô tick (MultiSelect onCreate): thêm vào review + lưu vào
  // danh mục dùng chung (review_options) để lần sau chọn lại được. Không còn ô
  // nhập riêng bên dưới (user 2026-07-27 thấy để dưới khó nhìn).
  function persistCustomOption(
    category: "strength" | "improvement" | "test_process",
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

  // Xóa khỏi danh mục dùng chung (review_options) — KHÔNG đụng tới các lựa
  // chọn đã tick sẵn trong review này (state `strengths`/`improvements`/
  // `testProcessNotes` lưu theo NHÃN chữ, độc lập với id của danh mục).
  function deleteCustomOption(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    deleteReviewOption(fd).catch(() => {});
  }

  function addCustomStrength(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setStrengths((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistCustomOption("strength", value, strengthGroup === "all" ? "other" : strengthGroup);
  }

  function addCustomImprovement(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setImprovements((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistCustomOption(
      "improvement",
      value,
      improvementGroup === "all" ? "other" : improvementGroup
    );
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
  const testProcessOptions = options.filter((o) => o.category === "test_process");

  function addCustomTestProcessNote(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setTestProcessNotes((prev) =>
      prev.some((s) => s.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
    );
    persistCustomOption("test_process", value, "other");
  }

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
        sessionContext: sessionContext || undefined,
        isPeriodicTest,
        testProcessNotes: isPeriodicTest ? testProcessNotes : undefined,
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

      <form ref={formRef} action={formAction} className="space-y-4 border-t p-4">
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

        {/* Combo/copy nhanh + xếp loại + bối cảnh KT — gộp vào 1 accordion phụ
            để thẻ HV gọn lại, phần chính (điểm mạnh/cải thiện + nhận xét AI)
            nổi bật hơn (yêu cầu user 2026-08-05). Mở sẵn nếu đã có xếp loại
            từ trước, để GV không mất dấu thứ đã chọn. */}
        <details
          className="group/extra rounded-md border bg-muted/30"
          open={Boolean(existing?.academic_level)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
            ⚙️ Tùy chọn thêm — combo nhanh, xếp loại học lực
            {isPeriodicTest ? ", quá trình làm bài" : ""}
            <span className="text-xs transition-transform group-open/extra:rotate-180">
              ▼
            </span>
          </summary>
          <div className="space-y-3 border-t p-3">
            {/* Nhận xét nhanh: áp bộ combo lưu sẵn + copy từ bạn/buổi trước. */}
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

            <div className={isPeriodicTest ? "grid gap-4 sm:grid-cols-2" : undefined}>
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
                  AI dựa vào mức này để viết nhận xét vừa trình độ của em —
                  không nêu thẳng xếp loại cho phụ huynh.
                </p>
              </div>

              {isPeriodicTest && (
                <div className="space-y-1.5">
                  <Label>📝 Quá trình làm bài kiểm tra</Label>
                  <MultiSelect
                    options={testProcessOptions}
                    selected={testProcessNotes}
                    onChange={setTestProcessNotes}
                    onCreate={addCustomTestProcessNote}
                    onDelete={deleteCustomOption}
                    placeholder="Chọn hoặc gõ quan sát về bài kiểm tra..."
                    emptyText="Chưa có lựa chọn — thêm trong trang Cài đặt."
                  />
                  <p className="text-xs text-muted-foreground">
                    Chỉ để AI tham khảo khi viết phần &quot;kết quả kiểm tra
                    định kỳ&quot; — không lưu lại, gõ lại nếu tải lại trang.
                  </p>
                </div>
              )}
            </div>
          </div>
        </details>

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
              onCreate={addCustomStrength}
              onDelete={deleteCustomOption}
              placeholder="Chọn hoặc gõ điểm mạnh..."
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
              onCreate={addCustomImprovement}
              onDelete={deleteCustomOption}
              placeholder="Chọn hoặc gõ điểm cần cải thiện..."
              emptyText={
                improvementGroup === "all"
                  ? "Chưa có lựa chọn — thêm trong trang Cài đặt."
                  : "Nhóm này chưa có lựa chọn nào."
              }
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          💡 Gõ câu mới ngay trong ô chọn rồi Enter — câu đó vừa thêm vào nhận
          xét, vừa lưu vào danh mục (nhóm đang lọc, hoặc &quot;Khác&quot;).
        </p>

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
