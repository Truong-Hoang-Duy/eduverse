"use client";

import { useEffect, useState, useTransition } from "react";

import { GraduationSeal } from "@/components/showcase/emblem";
import { rateShowcaseProject } from "@/lib/actions/showcase-public";
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
        setError(res.error ?? "Không gửi được nhận xét.");
        return;
      }
      onSaved(res.rating);
      setMessage(
        existing ? "Đã cập nhật nhận xét của bạn." : "Cảm ơn quý phụ huynh!"
      );
    });
  }

  return (
    <section className="rounded-2xl border border-sc-brass/30 bg-sc-raised p-4">
      <header className="flex items-start gap-3 border-b border-sc-line pb-3">
        <GraduationSeal size={34} className="mt-0.5 shrink-0 text-sc-brass" />
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight">
            Gửi em {studentName} đôi lời
          </h3>
          <p className="text-xs text-sc-ink-soft">
            Hoàn toàn ẩn danh — không ai biết ai chấm. Tiêu chí nào không theo
            dõi được thì cứ bỏ trống.
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
        <span className="sr-only">Lời nhận xét cho em {studentName}</span>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={SHOWCASE_COMMENT_MAX}
          placeholder={`Điều gì ở sản phẩm của em ${studentName} làm bạn ấn tượng nhất?`}
          className="sc-ruled w-full resize-none rounded-xl border border-sc-line bg-transparent px-3 py-1 text-sm leading-7 text-sc-ink placeholder:text-sc-ink-soft/70 focus:border-sc-brass focus:outline-none"
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
              ? "Cập nhật nhận xét"
              : "Gửi nhận xét"}
        </button>
        {message && <p className="text-sm font-medium text-sc-brass">{message}</p>}
        {error && <p className="text-sm font-medium text-sc-terracotta">{error}</p>}
      </div>
    </section>
  );
}
