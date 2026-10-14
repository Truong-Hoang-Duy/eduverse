"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import type { ProjectView } from "@/components/project-card";
import { ShowcaseTvScreen } from "@/components/showcase/showcase-tv-screen";
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
  setSpotlightProject,
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

import { ProjectShowcase } from "./project-showcase";

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
  spotlight_project_id?: string | null;
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
 * Khối "Tổng kết khóa học / Link xem sản phẩm" trong trang lớp.
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
  projects = [],
}: {
  classId: string;
  classCode: string;
  showcase: ShowcaseRow | null;
  /** Truy vấn đọc cấu hình bị lỗi — KHÁC hẳn với 'chưa bật link'. */
  loadError?: string | null;
  students: { id: string; fullName: string }[];
  ratings: ShowcaseRatingRow[];
  projects?: ProjectView[];
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

  const [currentSpotlight, setCurrentSpotlight] = useState<string | null>(
    showcase?.spotlight_project_id ?? null
  );
  const [spotlightPending, setSpotlightPending] = useState(false);

  useEffect(() => {
    setCurrentSpotlight(showcase?.spotlight_project_id ?? null);
  }, [showcase?.spotlight_project_id]);

  async function handleSelectSpotlight(projectId: string | null) {
    const prev = currentSpotlight;
    setCurrentSpotlight(projectId);
    setSpotlightPending(true);
    const res = await setSpotlightProject(classId, projectId);
    setSpotlightPending(false);
    if (res.error) {
      setCurrentSpotlight(prev);
      alert(res.error ?? "Không thể cập nhật thuyết trình");
    }
  }

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

      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {!showcase && projects.length > 0 && (
          <div className="flex items-center gap-2">
            <ProjectShowcase classCode={classCode} projects={projects} />
          </div>
        )}
      </div>

      {/* Bật / gia hạn */}
      <form action={enableAction} className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <input type="hidden" name="class_id" value={classId} />
        <input type="hidden" name="expiry" value={expiry} />
        <div className="flex items-center gap-2">
          <Label htmlFor={`expiry-${classId}`} className="whitespace-nowrap text-sm font-medium">
            Hạn dùng:
          </Label>
          <Select
            value={expiry}
            onValueChange={(v) => setExpiry(v as ExpiryPreset)}
          >
            <SelectTrigger id={`expiry-${classId}`} className="w-[140px] sm:w-[155px]">
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
        <Button type="submit" disabled={enablePending} className="whitespace-nowrap cursor-pointer">
          {enablePending
            ? "Đang xử lý..."
            : status === "live"
              ? "Gia hạn link"
              : "🔗 Bật link"}
        </Button>
        <FormMessage result={enableState} />
      </form>

      {showcase && (
        <>
          <div className="space-y-2 rounded-xl border p-3">
            <Label htmlFor={`link-${classId}`}>Đường dẫn sản phẩm cuối khóa</Label>
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
              <Button type="button" variant="outline" onClick={openTv} className="gap-1.5 font-medium cursor-pointer">
                📱 QR sản phẩm
              </Button>
              {projects.length > 0 && (
                <ProjectShowcase classCode={classCode} projects={projects} />
              )}
            </div>
            {status !== "live" && (
              <p className="text-xs text-muted-foreground">
                Link đang tắt — bật ở trên để mở quyền truy cập.
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
                title="Tắt link công khai?"
                description="Người xem mở link sẽ thấy thông báo hết hiệu lực. Đánh giá vẫn được giữ khi bật lại."
                confirmLabel="Tắt link"
                action={disableShowcase}
                fields={{ class_id: classId }}
              />
            )}
          </div>

          {/* Chế độ Live: Đang thuyết trình */}
          <div className="space-y-3 rounded-xl border-2 border-red-500/20 bg-red-500/5 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex size-3 rounded-full bg-red-500" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Chế độ Live: Học viên đang thuyết trình
                </span>
              </div>
              {currentSpotlight && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={spotlightPending}
                  onClick={() => handleSelectSpotlight(null)}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  ✕ Dừng thuyết trình
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Bấm chọn em đang thuyết trình trên sân khấu. Màn hình người xem sẽ tự động hiện thông báo nổi:{" "}
              <strong className="text-foreground">🔴 Đang thuyết trình: Em [Tên] — Bấm để xem</strong> để mở ngay sản phẩm của em đó.
            </p>

            {projects.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                Chưa có sản phẩm nào được khai báo trong lớp.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {projects.map((p) => {
                  const isSpotlight = currentSpotlight === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={spotlightPending}
                      onClick={() => handleSelectSpotlight(isSpotlight ? null : p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        isSpotlight
                          ? "bg-red-600 text-white shadow-md ring-2 ring-red-600/30 scale-105"
                          : "border border-border bg-background text-foreground hover:border-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                      }`}
                    >
                      {isSpotlight && <span className="text-[10px]">🔴</span>}
                      <span>{p.authorName}</span>
                      <span className="opacity-75 font-normal">({p.name})</span>
                    </button>
                  );
                })}
              </div>
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
                placeholder="VD: Chào mừng mọi người! Đây là toàn bộ sản phẩm các bạn đã hoàn thành sau khóa học..."
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
                Cho phép người xem đánh giá + nhận xét (ẩn danh)
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
                  Hiện điểm trung bình công khai
                  <span className="block text-xs text-muted-foreground">
                    Mặc định TẮT: tránh so sánh xếp hạng điểm số công khai. Nhận xét
                    chữ vẫn hiện bình thường dù tắt.
                  </span>
                </span>
              </label>
            </div>

            {students.length > 0 && (
              <div className="space-y-1.5">
                <Label>Ẩn khỏi trang công khai</Label>
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
                ⭐ Điểm đánh giá (chỉ bạn thấy bảng này)
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

          {/* Cảm nghĩ & Góp ý — hiện trên trang công khai, giáo viên gỡ được ở đây */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              💬 Cảm nghĩ & Góp ý ({withComment.length})
            </p>
            {withComment.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có cảm nghĩ & góp ý nào.
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
                        {" · cảm nghĩ & góp ý ẩn danh"}
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
                      description="Cả cảm nghĩ & góp ý lẫn điểm của lượt này sẽ biến mất khỏi trang công khai ngay lập tức và không khôi phục được."
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
          <ShowcaseTvScreen
            classId={classId}
            classCode={classCode}
            fullUrl={fullUrl}
            viewCount={showcase.view_count}
            projects={projects.map((p) => ({
              id: p.id,
              name: p.name,
              authorName: p.authorName,
              imageUrls: p.image_urls,
              features: p.features,
              description: p.description,
            }))}
            onClose={closeTv}
          />
        </TvOverlay>
      )}
    </div>
  );
}
