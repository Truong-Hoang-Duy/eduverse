"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { QrCode } from "@/components/qr-code";
import { GraduationSeal } from "@/components/showcase/emblem";
import { showcaseFontClass } from "@/components/showcase/fonts";
import { TvNavButton } from "@/components/showcase/tv-nav-button";
import {
  TvOverlay,
  enterBrowserFullscreen,
  exitBrowserFullscreen,
} from "@/components/tv-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteShowcaseRating,
  disableShowcase,
  enableShowcase,
  rotateShowcaseToken,
  saveShowcaseSettings,
} from "@/lib/actions/showcase";
import {
  DEFAULT_EXPIRY_PRESET,
  EXPIRY_PRESETS,
  RATING_CRITERIA,
  SHOWCASE_INTRO_MAX,
  formatRemaining,
  showcasePath,
  showcaseStatus,
  type ExpiryPreset,
} from "@/lib/showcase";
import type { ActionResult } from "@/lib/types";

export interface ShowcaseRow {
  token: string;
  is_enabled: boolean;
  expires_at: string | null;
  intro: string | null;
  allow_ratings: boolean;
  allow_reactions: boolean;
  show_rating_results: boolean;
  hidden_student_ids: string[];
  view_count: number;
}

/** Một lượt phụ huynh chấm — ẨN DANH, không có tên người gửi và sẽ không bao giờ có. */
export interface ShowcaseRatingRow {
  id: string;
  /** Tên EM ĐƯỢC CHẤM (không phải người chấm). */
  studentName: string;
  score_product: number | null;
  score_presentation: number | null;
  score_creativity: number | null;
  comment: string | null;
  created_at: string;
}

function average(values: (number | null)[]): number | null {
  const scores = values.filter((v): v is number => typeof v === "number");
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

/**
 * Khối "Link cho phụ huynh" trong trang lớp.
 *
 * Link công khai nghĩa là ai cầm được link cũng xem được HỌ TÊN các em, nên khối
 * này luôn phải nói rõ trạng thái (bật/tắt/còn bao lâu) và luôn có đường thu hồi
 * ngay tầm tay: tắt, đổi link, hoặc để hết hạn. Mặc định 7 ngày.
 */
export function ShowcasePanel({
  classId,
  classCode,
  showcase,
  loadError,
  students,
  ratings,
}: {
  classId: string;
  classCode: string;
  showcase: ShowcaseRow | null;
  /** Truy vấn đọc cấu hình bị lỗi — KHÁC hẳn với 'chưa bật link'. */
  loadError?: string | null;
  students: { id: string; fullName: string }[];
  ratings: ShowcaseRatingRow[];
  /** @deprecated Đã bỏ tính năng thả tim */
  heartCount?: number;
}) {
  const [enableState, enableAction, enablePending] = useActionState<
    ActionResult,
    FormData
  >(enableShowcase, {});
  const [settingsState, settingsAction, settingsPending] = useActionState<
    ActionResult,
    FormData
  >(saveShowcaseSettings, {});

  const [expiry, setExpiry] = useState<ExpiryPreset>(DEFAULT_EXPIRY_PRESET);
  const [copied, setCopied] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);
  // Server không biết domain đang chạy (localhost / vercel / tên miền riêng) nên
  // link đầy đủ chỉ dựng được ở trình duyệt.
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const status = showcaseStatus(showcase);
  const fullUrl = showcase ? `${origin}${showcasePath(showcase.token)}` : "";

  // Bảng tổng hợp theo từng em — gom ở client cho gọn, dữ liệu chỉ vài chục dòng.
  const summary = useMemo(() => {
    const byStudent = new Map<string, ShowcaseRatingRow[]>();
    for (const r of ratings) {
      byStudent.set(r.studentName, [...(byStudent.get(r.studentName) ?? []), r]);
    }
    return [...byStudent.entries()]
      .map(([studentName, rows]) => ({
        studentName,
        count: rows.length,
        product: average(rows.map((r) => r.score_product)),
        presentation: average(rows.map((r) => r.score_presentation)),
        creativity: average(rows.map((r) => r.score_creativity)),
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "vi"));
  }, [ratings]);

  const withComment = ratings.filter((r) => r.comment);

  async function copyLink() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard: ô link vẫn chọn tay copy được.
      setCopied(false);
    }
  }

  function openTv() {
    setTvOpen(true);
    enterBrowserFullscreen();
  }

  function closeTv() {
    setTvOpen(false);
    exitBrowserFullscreen();
  }

  return (
    <div className="space-y-5">
      {loadError && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          ⚠️ {loadError}
          <span className="mt-1 block text-xs">
            Link CÓ THỂ vẫn đang bật — đây là lỗi đọc dữ liệu, không phải trạng
            thái thật. Thường gặp nhất là migration mới chưa được dán lên Supabase.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {status === "live" && (
          <Badge className="rounded-md bg-green-600 hover:bg-green-600">
            🟢 Đang bật · {formatRemaining(showcase?.expires_at ?? null)}
          </Badge>
        )}
        {status === "expired" && (
          <Badge variant="secondary" className="rounded-md">
            ⏰ Đã hết hạn — bật lại để dùng tiếp
          </Badge>
        )}
        {status === "off" && (
          <Badge variant="secondary" className="rounded-md">
            ⚪ Chưa bật
          </Badge>
        )}
        {showcase && (
          <span className="text-sm text-muted-foreground">
            {showcase.view_count} lượt xem · {ratings.length} lượt chấm
          </span>
        )}
      </div>

      {/* Bật / gia hạn */}
      <form action={enableAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="class_id" value={classId} />
        <input type="hidden" name="expiry" value={expiry} />
        <div className="space-y-1.5">
          <Label htmlFor={`expiry-${classId}`}>Hạn dùng của link</Label>
          <Select
            value={expiry}
            onValueChange={(v) => setExpiry(v as ExpiryPreset)}
          >
            <SelectTrigger id={`expiry-${classId}`} className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={enablePending}>
          {enablePending
            ? "Đang xử lý..."
            : status === "live"
              ? "Gia hạn link"
              : "🔗 Bật link cho phụ huynh"}
        </Button>
        <FormMessage result={enableState} />
      </form>

      {showcase && (
        <>
          <div className="space-y-2 rounded-xl border p-3">
            <Label htmlFor={`link-${classId}`}>Link gửi phụ huynh</Label>
            <div className="flex flex-wrap gap-2">
              <input
                id={`link-${classId}`}
                readOnly
                value={fullUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={copyLink}>
                {copied ? "✓ Đã copy" : "📋 Copy"}
              </Button>
              <Button type="button" variant="outline" onClick={openTv}>
                QR Code
              </Button>
            </div>
            {status !== "live" && (
              <p className="text-xs text-muted-foreground">
                Link đang KHÔNG mở được — bấm nút bật ở trên để phụ huynh xem được.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline">
                  🔄 Đổi link
                </Button>
              }
              title="Đổi sang link mới?"
              description="Link cũ sẽ chết ngay lập tức — ai đã nhận link cũ sẽ không xem được nữa. Bài chấm vẫn giữ nguyên. Dùng khi link bị chia sẻ ra ngoài phạm vi mong muốn."
              confirmLabel="Đổi link"
              action={rotateShowcaseToken}
              fields={{ class_id: classId }}
            />
            {showcase.is_enabled && (
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    ⏹ Tắt link
                  </Button>
                }
                title="Tắt link cho phụ huynh?"
                description="Phụ huynh mở link sẽ thấy thông báo hết hiệu lực. Bài chấm vẫn được giữ, bật lại là hiện đủ như cũ."
                confirmLabel="Tắt link"
                action={disableShowcase}
                fields={{ class_id: classId }}
              />
            )}
          </div>

          {/* Thiết lập nội dung trang */}
          <form action={settingsAction} className="space-y-4 rounded-xl border p-3">
            <input type="hidden" name="class_id" value={classId} />

            <div className="space-y-1.5">
              <Label htmlFor={`intro-${classId}`}>
                Lời ngỏ hiện đầu trang (tùy chọn)
              </Label>
              <Textarea
                id={`intro-${classId}`}
                name="intro"
                rows={3}
                defaultValue={showcase.intro ?? ""}
                maxLength={SHOWCASE_INTRO_MAX}
                placeholder="VD: Kính chào quý phụ huynh! Đây là toàn bộ sản phẩm các con đã hoàn thành sau 14 buổi học..."
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="allow_ratings"
                  defaultChecked={showcase.allow_ratings}
                  className="size-4"
                />
                Cho phụ huynh chấm điểm + nhận xét (ẩn danh)
              </label>
              <input type="hidden" name="allow_reactions" value="false" />
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="show_rating_results"
                  defaultChecked={showcase.show_rating_results}
                  className="mt-0.5 size-4"
                />
                <span>
                  Hiện điểm trung bình cho phụ huynh xem
                  <span className="block text-xs text-muted-foreground">
                    Mặc định TẮT: bảng điểm công khai giữa buổi lễ biến trang này
                    thành bảng xếp hạng các con trước mặt phụ huynh. Nhận xét chữ
                    vẫn hiện bình thường dù tắt.
                  </span>
                </span>
              </label>
            </div>

            {students.length > 0 && (
              <div className="space-y-1.5">
                <Label>Ẩn khỏi trang phụ huynh</Label>
                <p className="text-xs text-muted-foreground">
                  Tick tên em nào thì sản phẩm em đó KHÔNG hiện trên link công khai
                  (em chưa xong, hoặc gia đình không muốn công khai).
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="hidden_student_ids"
                        value={s.id}
                        defaultChecked={showcase.hidden_student_ids.includes(s.id)}
                        className="size-4"
                      />
                      <span className="truncate">{s.fullName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="outline" disabled={settingsPending}>
                {settingsPending ? "Đang lưu..." : "Lưu thiết lập"}
              </Button>
              <FormMessage result={settingsState} />
            </div>
          </form>

          {/* Bảng tổng hợp điểm — chỉ giáo viên thấy, kể cả khi tắt hiện công khai */}
          {summary.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                ⭐ Điểm phụ huynh chấm (chỉ bạn thấy bảng này)
              </p>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-2 font-medium">Học viên</th>
                      {RATING_CRITERIA.map((c) => (
                        <th key={c.key} className="p-2 font-medium">
                          {c.label}
                        </th>
                      ))}
                      <th className="p-2 font-medium">Lượt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row) => (
                      <tr key={row.studentName} className="border-t">
                        <td className="p-2">{row.studentName}</td>
                        <td className="p-2">{row.product ?? "—"}</td>
                        <td className="p-2">{row.presentation ?? "—"}</td>
                        <td className="p-2">{row.creativity ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Nhận xét chữ — hiện ngay trên trang phụ huynh, giáo viên gỡ được ở đây */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              💬 Nhận xét của phụ huynh ({withComment.length})
            </p>
            {withComment.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có nhận xét nào.
              </p>
            ) : (
              <ul className="space-y-2">
                {withComment.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">Gửi em {r.studentName}</span>
                      <span className="text-xs text-muted-foreground">
                        {" · "}
                        {new Date(r.created_at).toLocaleString("vi-VN")}
                        {" · phụ huynh ẩn danh"}
                      </span>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {r.comment}
                      </p>
                    </div>
                    <ConfirmDialog
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          Gỡ
                        </Button>
                      }
                      title="Gỡ lượt chấm này?"
                      description="Cả nhận xét lẫn điểm của lượt này sẽ biến mất khỏi trang phụ huynh ngay lập tức và không khôi phục được."
                      confirmLabel="Gỡ"
                      action={deleteShowcaseRating}
                      fields={{ id: r.id, class_id: classId }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {tvOpen && showcase && (
        <TvOverlay onClose={closeTv} fullBleed>
          <div
            className={`${showcaseFontClass} showcase-theme showcase-surface relative flex h-full w-full flex-col items-center justify-center gap-[min(3.5vh,1.75rem)] overflow-hidden px-8 py-8 text-center`}
          >
            <div className="absolute top-6 right-6">
              <TvNavButton onClick={closeTv} variant="ghost" ariaLabel="Thoát chế độ chiếu">
                ✕ Thoát
              </TvNavButton>
            </div>

            <GraduationSeal size={76} withRibbon className="text-sc-brass" />

            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-sc-brass uppercase">
                Lễ tổng kết khóa học
              </p>
              <h2 className="max-w-4xl font-display text-[clamp(1.75rem,4.2vh,3rem)] leading-tight font-semibold text-sc-ink">
                📱 Quý phụ huynh quét mã để xem sản phẩm các con
              </h2>
              <p className="font-display text-[clamp(1.25rem,3vh,1.75rem)] text-sc-brass">
                Lớp {classCode}
              </p>
            </div>

            <div className="sc-rule rounded-3xl bg-white p-6 shadow-lg">
              <QrCode
                value={fullUrl}
                size={420}
                className="block h-[clamp(190px,32vh,420px)] w-[clamp(190px,32vh,420px)]"
              />
            </div>

            <p className="max-w-3xl truncate rounded-full border border-sc-line bg-sc-raised px-5 py-2 font-mono text-sm text-sc-ink-soft">
              {fullUrl}
            </p>
          </div>
        </TvOverlay>
      )}
    </div>
  );
}
