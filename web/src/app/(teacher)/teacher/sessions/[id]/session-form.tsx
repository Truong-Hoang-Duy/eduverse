"use client";

import { useActionState, useEffect, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
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
import { updateSession } from "@/lib/actions/sessions";
import {
  formatToFlags,
  resolveSessionFormat,
  SESSION_FORMATS,
  type SessionFormat,
} from "@/lib/session-format";
import type { ActionResult } from "@/lib/types";

import { SessionContentReferenceDialog } from "./session-content-reference-dialog";
import { SessionContentSuggestDialog } from "./session-content-suggest-dialog";

const FORMAT_CARDS: {
  id: SessionFormat;
  icon: string;
  title: string;
  tagline: string;
  badge?: string;
  highlightForB14?: string;
}[] = [
  {
    id: "standard",
    icon: "📘",
    title: "Buổi học tiêu chuẩn",
    tagline: "Lý thuyết & bài tập thực hành",
    badge: "Mặc định",
  },
  {
    id: "periodic_test",
    icon: "📝",
    title: "Bài kiểm tra",
    tagline: "Định kỳ hoặc thi cuối khóa",
    badge: "Đánh giá kiến thức",
    highlightForB14: "Dành cho khóa chỉ làm bài thi",
  },
  {
    id: "project_period",
    icon: "💻",
    title: "Làm đồ án (SPCK)",
    tagline: "Giai đoạn thực hiện sản phẩm",
    badge: "Buổi 9–13",
  },
  {
    id: "final_presentation",
    icon: "🎤",
    title: "Thuyết trình (Demo Day)",
    tagline: "Báo cáo sản phẩm & Denise LMS",
    badge: "Buổi 14",
    highlightForB14: "Dành cho khóa có đồ án SPCK",
  },
];

function SessionFormatSelector({
  format,
  onChange,
  sessionNumber,
}: {
  format: SessionFormat;
  onChange: (format: SessionFormat) => void;
  sessionNumber: number;
}) {
  const isB14 = sessionNumber === 14;

  return (
    <div className="space-y-3 rounded-xl border bg-card/60 p-4 shadow-sm">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            🎯 Hình thức buổi học
          </Label>
          {isB14 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              ⭐ Buổi 14 (Buổi tổng kết khóa)
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Chọn hình thức để Eduverse tối ưu giao diện nhận xét và trợ lý AI phù hợp:
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {FORMAT_CARDS.map((card) => {
          const isSelected = format === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onChange(card.id)}
              className={`group relative flex flex-col items-start justify-between rounded-lg border p-3 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <div className="w-full">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg select-none">{card.icon}</span>
                    <span
                      className={`text-sm font-semibold transition-colors ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {card.title}
                    </span>
                  </div>
                  <div
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 group-hover:border-primary/50"
                    }`}
                  >
                    {isSelected && (
                      <span className="size-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.tagline}
                </p>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {isB14 && card.highlightForB14 ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                      isSelected
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    {card.highlightForB14}
                  </span>
                ) : (
                  card.badge && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                        isSelected
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {card.badge}
                    </span>
                  )
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
        <span className="text-base select-none shrink-0">
          {format === "periodic_test"
            ? "📝"
            : format === "final_presentation"
            ? "🎤"
            : format === "project_period"
            ? "💻"
            : "📘"}
        </span>
        <div className="space-y-0.5">
          <p className="font-semibold text-primary">
            {SESSION_FORMATS[format].label}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {SESSION_FORMATS[format].detailHint}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Buổi mới chưa có ngày học thường là buổi ĐÃ dạy hôm qua (GV hay điền nhận
 *  xét sau buổi một ngày) — điền sẵn hôm nay trừ 1 để đỡ phải gõ tay mỗi lần,
 *  vẫn sửa được bình thường (yêu cầu user 2026-08-05). */
function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export interface SessionData {
  id: string;
  session_number: number;
  title: string | null;
  content: string | null;
  review_context: string | null;
  is_periodic_test: boolean;
  is_project_period: boolean;
  is_final_presentation?: boolean;
  session_date: string | null;
}

/** Một buổi TRƯỚC có thể áp tích chọn sang cả lớp (chỉ buổi đã nhận xét). */
export interface CopyFromSession {
  id: string;
  sessionNumber: number;
  /** Số em có tích chọn ở buổi đó — cho GV biết áp sang được bao nhiêu. */
  students: number;
}

export function SessionForm({
  session,
  copyFromSessions = [],
}: {
  session: SessionData;
  copyFromSessions?: CopyFromSession[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateSession,
    {}
  );
  const [content, setContent] = useState(session.content ?? "");
  const [reviewContext, setReviewContext] = useState(
    session.review_context ?? ""
  );
  const [format, setFormat] = useState<SessionFormat>(() =>
    resolveSessionFormat(session)
  );
  const flags = formatToFlags(format);
  // "" = không áp nhận xét từ buổi nào. Reset sau mỗi lần lưu để bấm Lưu lần
  // sau (VD sửa lại nội dung) không vô tình áp lại lần nữa.
  const [copyFrom, setCopyFrom] = useState("");
  useEffect(() => {
    if (state.success) setCopyFrom("");
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={session.id} />
      <input
        type="hidden"
        name="is_periodic_test"
        value={String(flags.isPeriodicTest)}
      />
      <input
        type="hidden"
        name="is_project_period"
        value={String(flags.isProjectPeriod)}
      />
      <input
        type="hidden"
        name="is_final_presentation"
        value={String(flags.isFinalPresentation)}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="title">Tiêu đề buổi học</Label>
          <Input
            id="title"
            name="title"
            defaultValue={session.title ?? ""}
            placeholder={`Buổi ${session.session_number}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session_date">Ngày học</Label>
          <Input
            id="session_date"
            name="session_date"
            type="date"
            defaultValue={session.session_date ?? yesterdayIso()}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="content">Nội dung buổi học</Label>
          <div className="flex flex-wrap items-center gap-2">
            <SessionContentReferenceDialog
              sessionId={session.id}
              onApply={setContent}
            />
            <SessionContentSuggestDialog
              sessionId={session.id}
              onApply={setContent}
            />
          </div>
        </div>
        <Textarea
          id="content"
          name="content"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="VD: Học về biến let/const, kiểu số và chuỗi. Bài tập: chương trình đổi đơn vị tiền tệ..."
        />
        <p className="text-xs text-muted-foreground">
          Nội dung này là ngữ cảnh để AI viết nhận xét học viên và tin Zalo — càng
          cụ thể nhận xét càng hay.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review_context">Bối cảnh buổi học (tùy chọn)</Label>
        <Textarea
          id="review_context"
          name="review_context"
          rows={2}
          value={reviewContext}
          onChange={(e) => setReviewContext(e.target.value)}
          placeholder="VD: Buổi này có bài kiểm tra 15 phút đầu giờ, các em còn lại ôn tập vòng lặp..."
        />
        <p className="text-xs text-muted-foreground">
          Mô tả bối cảnh lớp học/việc học viên sẽ làm buổi này — CHỈ để AI tham
          khảo khi viết nhận xét từng em bên dưới, không hiện cho phụ huynh.
        </p>
      </div>
      <SessionFormatSelector
        format={format}
        onChange={setFormat}
        sessionNumber={session.session_number}
      />
      {copyFromSessions.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-dashed p-3">
          <Label htmlFor="copy_from_session_id">
            Áp nhận xét giống buổi trước cho CẢ LỚP (tùy chọn)
          </Label>
          <input
            type="hidden"
            name="copy_from_session_id"
            value={copyFrom}
          />
          <Select
            value={copyFrom || "none"}
            onValueChange={(v) => setCopyFrom(v === "none" ? "" : v)}
          >
            <SelectTrigger id="copy_from_session_id" size="sm" className="w-[280px]">
              <SelectValue placeholder="Không áp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không áp</SelectItem>
              {copyFromSessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Buổi {s.sessionNumber} ({s.students} em đã nhận xét)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Bấm &quot;Lưu nội dung&quot; sẽ GỘP điểm mạnh / cần cải thiện / xếp
            loại của buổi đó vào mọi em ở buổi này (không xóa thứ đã tích), rồi
            gọi AI viết nhận xét cho từng em. Bỏ qua em đã đánh vắng và em đã có
            sẵn nhận xét. ⚠️ Mỗi em tốn 1 lượt Gemini — hết lượt thì em đó để
            trống, đổi key rồi bấm &quot;AI tạo nhận xét&quot; ở từng em.
          </p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending
            ? copyFrom
              ? "Đang lưu + gọi AI..."
              : "Đang lưu..."
            : "Lưu nội dung"}
        </Button>
        <FormMessage result={state} />
      </div>
    </form>
  );
}
