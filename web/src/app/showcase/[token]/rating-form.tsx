"use client";

import { useEffect, useState, useTransition } from "react";

import { GraduationSeal } from "@/components/showcase/emblem";
import { EducationalToast, useEducationalToast } from "@/components/ui/educational-toast";
import { rateShowcaseProject } from "@/lib/actions/showcase-public";
import {
  EDUCATIONAL_MODERATION_WARNING,
  checkEducationalContent,
} from "@/lib/content-moderation";
import {
  RATING_CRITERIA,
  SHOWCASE_COMMENT_MAX,
  type MyRating,
} from "@/lib/showcase";

import { StarRating } from "./star-rating";

/**
 * Ô chấm điểm + nhận xét ẨN DANH cho MỘT em — dựng như một TRANG LƯU BÚT: giấy
 * kẻ dòng, lời mời thân mật, nút gửi hình con dấu.
 *
 * Ẩn danh là có chủ đích: không có ô tên. Phụ huynh nói thật hơn khi không phải
 * ký tên, và không ai so được "bố mẹ bạn A chấm con mình mấy điểm".
 *
 * Gửi lại là SỬA bài chấm cũ của chính máy đó (upsert ở DB), nên form luôn mở
 * sẵn với điểm đã chấm lần trước.
 */
export function RatingForm({
  token,
  projectId,
  studentName,
  visitorId,
  existing,
  onSaved,
}: {
  token: string;
  projectId: string;
  studentName: string;
  visitorId: string;
  existing: MyRating | undefined;
  onSaved: (rating: MyRating) => void;
}) {
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startSaving] = useTransition();
  const { toastMessage, showToast, hideToast } = useEducationalToast();

  // Đổi sang em khác (hoặc nạp được bài chấm cũ) thì form phải theo — cùng một
  // component được dùng lại cho mọi em trong popup.
  useEffect(() => {
    setScores({
      product: existing?.score_product ?? null,
      presentation: existing?.score_presentation ?? null,
      creativity: existing?.score_creativity ?? null,
    });
    setComment(existing?.comment ?? "");
    setMessage("");
    setError("");
  }, [existing, projectId]);

  function save() {
    setMessage("");
    setError("");

    if (comment.trim()) {
      const check = checkEducationalContent(comment);
      if (!check.isAppropriate) {
        showToast(check.message ?? EDUCATIONAL_MODERATION_WARNING);
        return;
      }
    }

    startSaving(async () => {
      const res = await rateShowcaseProject({
        token,
        projectId,
        visitorId,
        product: scores.product ?? null,
        presentation: scores.presentation ?? null,
        creativity: scores.creativity ?? null,
        comment,
      });
      if (res.error || !res.rating) {
        setError(res.error ?? "Không gửi được cảm nghĩ & góp ý.");
        return;
      }
      onSaved(res.rating);
      setMessage(
        existing
          ? "Đã cập nhật cảm nghĩ & góp ý của bạn."
          : "Cảm ơn bạn đã gửi cảm nghĩ & góp ý!"
      );
    });
  }

  return (
    <section className="rounded-2xl border border-sc-brass/30 bg-sc-raised p-4">
      {/* Thông báo nổi chuẩn mực sư phạm (Educational Toast) */}
      <EducationalToast message={toastMessage} onClose={hideToast} />

      <header className="flex items-start gap-3 border-b border-sc-line pb-3">
        <GraduationSeal size={34} className="mt-0.5 shrink-0 text-sc-brass" />
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight">
            Gửi cảm nghĩ và góp ý cho em {studentName}
          </h3>
          <p className="text-xs text-sc-ink-soft">
            Ẩn danh — Cùng gửi cảm nghĩ, góp ý & động viên cho bài thuyết trình hôm nay.
          </p>
        </div>
      </header>

      <div className="divide-y divide-sc-line">
        {RATING_CRITERIA.map((c) => (
          <StarRating
            key={c.key}
            label={c.label}
            hint={c.hint}
            value={scores[c.key] ?? null}
            onChange={(next) => setScores((prev) => ({ ...prev, [c.key]: next }))}
          />
        ))}
      </div>

      {/* Giấy kẻ dòng: `leading-7` = 28px, khớp đúng nhịp kẻ của `.sc-ruled` nên
          chữ nằm TRÊN dòng kẻ chứ không cắt ngang. */}
      <label className="mt-3 block">
        <span className="sr-only">Cảm nghĩ & góp ý cho em {studentName}</span>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
          }}
          maxLength={SHOWCASE_COMMENT_MAX}
          placeholder={`Viết cảm nghĩ & góp ý hoặc điều bạn ấn tượng nhất về sản phẩm của em ${studentName}... (bấm Enter để gửi)`}
          className="sc-ruled w-full resize-none rounded-xl border border-sc-line bg-transparent px-3 py-1 text-base sm:text-sm leading-7 text-sc-ink placeholder:text-sc-ink-soft/70 focus:border-sc-brass focus:outline-none"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-sc-brass px-5 py-2 text-sm font-semibold text-sc-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending
            ? "Đang gửi..."
            : existing
              ? "Cập nhật cảm nghĩ & góp ý"
              : "Gửi cảm nghĩ & góp ý"}
        </button>
        {message && <p className="text-sm font-medium text-sc-brass">{message}</p>}
        {error && (
          <p className="flex items-center gap-1.5 rounded-xl border border-sc-terracotta/40 bg-sc-terracotta/10 px-3 py-1.5 text-xs sm:text-sm font-medium text-sc-terracotta animate-in fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </p>
        )}
      </div>
    </section>
  );
}
