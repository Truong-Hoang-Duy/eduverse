"use client";

import { useEffect, useState } from "react";

import { SafeImage } from "@/components/safe-image";
import { CheckMark, GraduationSeal } from "@/components/showcase/emblem";
import { showcaseFontClass } from "@/components/showcase/fonts";
import { SealAvatar } from "@/components/showcase/seal-avatar";
import { TvNavButton } from "@/components/showcase/tv-nav-button";
import {
  TvOverlay,
  enterBrowserFullscreen,
  exitBrowserFullscreen,
} from "@/components/tv-overlay";
import { Button } from "@/components/ui/button";
import type { ProjectView } from "@/components/project-card";
import { isSafeHttpUrl } from "@/lib/drive-url";

/** Ảnh hiển thị tối đa trên lưới của slide từng em — ảnh dư gộp vào ô "+N ảnh"
 *  mở lightbox xem hết, để lưới luôn đều và không tràn khung. */
const MAX_GRID_IMAGES = 4;

function BigLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  // Cùng lý do như LinkChip: URL do học viên dán, chặn ở chỗ render.
  if (!isSafeHttpUrl(href)) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full border border-sc-brass/45 px-4 py-2 text-base font-medium text-sc-brass transition-colors hover:bg-sc-brass-soft"
    >
      {label} ↗
    </a>
  );
}

/** Lớp lưới ảnh theo số lượng — luôn lấp đầy chiều cao còn lại, không phụ
 *  thuộc tỉ lệ ảnh gốc (khác object-contain cũ vốn gây cao thấp lệch → tràn). */
function imageGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  return "grid-cols-2 grid-rows-2";
}

function imageCellClass(count: number, i: number): string {
  // 3 ảnh: ảnh đầu chiếm trọn cột trái (2 hàng), hai ảnh sau xếp cột phải.
  if (count === 3 && i === 0) return "row-span-2";
  return "";
}

function TvChrome({
  title,
  progress,
  children,
}: {
  title: string;
  progress?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-b border-sc-line px-6 py-4 sm:px-8">
      <GraduationSeal size={30} className="shrink-0 text-sc-brass" />
      <h2 className="font-display text-xl font-semibold text-sc-ink sm:text-2xl">
        {title}
      </h2>
      {progress && (
        <span className="font-display text-base text-sc-ink-soft sm:text-lg">
          {progress}
        </span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function StudentSlide({
  project,
  onOpenLightbox,
}: {
  project: ProjectView;
  onOpenLightbox: (index: number) => void;
}) {
  const images = project.image_urls;
  const shown = images.slice(0, MAX_GRID_IMAGES);
  const extra = images.length - shown.length;

  return (
    <div
      key={project.id}
      className="grid h-full min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-5 overflow-y-auto p-6 sm:gap-6 sm:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-1 lg:overflow-hidden lg:p-10 animate-in fade-in slide-in-from-right-4"
    >
      {/* Trái: danh tính + mô tả — CỐ ĐỊNH, luôn thấy khi đổi slide. */}
      <div className="flex min-h-0 flex-col justify-center gap-4 overflow-hidden">
        <div className="flex items-center gap-4">
          <SealAvatar name={project.authorName} size={72} />
          <div className="min-w-0">
            <p className="truncate font-display text-2xl font-semibold text-sc-ink sm:text-3xl">
              {project.authorName}
            </p>
            <p className="truncate text-lg text-sc-brass sm:text-xl">{project.name}</p>
          </div>
        </div>

        {project.description && (
          <p className="line-clamp-5 text-base leading-relaxed text-sc-ink-soft sm:text-lg">
            {project.description}
          </p>
        )}

        {project.features.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-sc-brass uppercase">
              Em đã làm được
            </p>
            <ul className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              {project.features.slice(0, 8).map((f) => (
                <li key={f} className="flex items-start gap-2 py-0.5 text-sm sm:text-base">
                  <CheckMark className="mt-1 size-4 shrink-0 text-sc-brass" />
                  <span className="truncate">{f}</span>
                </li>
              ))}
            </ul>
            {project.features.length > 8 && (
              <p className="mt-1 text-xs text-sc-ink-soft">
                +{project.features.length - 8} chức năng nữa
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <BigLink href={project.repo_url} label="GitHub" />
          <BigLink href={project.drive_url} label="Google Drive" />
          <BigLink href={project.demo_url} label="Demo" />
        </div>
      </div>

      {/* Phải: lưới ảnh — cắt object-cover đều tỉ lệ, ảnh dư gộp "+N ảnh". */}
      {shown.length > 0 ? (
        <div className={`grid min-h-[32vh] gap-3 sm:gap-4 lg:min-h-0 ${imageGridClass(shown.length)}`}>
          {shown.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => onOpenLightbox(i)}
              className={`group relative min-h-0 overflow-hidden rounded-2xl border border-sc-line bg-sc-raised ${imageCellClass(shown.length, i)}`}
            >
              <SafeImage
                src={url}
                alt={`Ảnh ${i + 1} sản phẩm của ${project.authorName}`}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="sc-tape absolute -top-1 left-4 h-3.5 w-12 rounded-[2px]" />
              {i === shown.length - 1 && extra > 0 && (
                <span className="absolute inset-0 flex items-center justify-center bg-sc-ink/60 font-display text-2xl font-semibold text-sc-paper">
                  +{extra} ảnh
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[20vh] items-center justify-center rounded-2xl border border-dashed border-sc-brass/30 text-sc-ink-soft lg:min-h-0">
          Chưa có ảnh sản phẩm
        </div>
      )}
    </div>
  );
}

function OverviewSlide({
  slides,
  onJump,
}: {
  slides: ProjectView[];
  onJump: (index: number) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-6 sm:gap-5 sm:p-8">
      <p className="shrink-0 text-center text-base text-sc-ink-soft sm:text-lg">
        Cả lớp đã hoàn thành{" "}
        <span className="font-display text-lg font-semibold text-sc-brass sm:text-xl">
          {slides.length} sản phẩm
        </span>{" "}
        — cảm ơn quý phụ huynh đã đồng hành cùng các em! 💐
      </p>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        <div
          className="grid gap-4 sm:gap-5"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
        >
          {slides.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onJump(i)}
              className="sc-rule group rounded-2xl bg-sc-raised p-4 text-left transition-transform hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${Math.min(i, 14) * 40}ms` }}
            >
              {p.image_urls.length > 0 && (
                <div className="relative mb-3">
                  <SafeImage
                    src={p.image_urls[0]}
                    alt={`Ảnh sản phẩm của ${p.authorName}`}
                    className="h-28 w-full rounded-lg bg-sc-paper object-cover sm:h-32"
                  />
                  <span className="sc-tape absolute -top-1.5 left-4 h-3.5 w-12 rounded-[2px]" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <SealAvatar name={p.authorName} size={42} />
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold text-sc-ink">
                    {p.authorName}
                  </p>
                  <p className="truncate text-sm text-sc-ink-soft">{p.name}</p>
                </div>
              </div>
              {p.features.length > 0 && (
                <p className="mt-2 truncate text-xs text-sc-ink-soft">
                  {p.features.slice(0, 3).join(" · ")}
                  {p.features.length > 3 && ` +${p.features.length - 3}`}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="shrink-0 text-center text-sm text-sc-ink-soft">
        Bấm vào từng em để xem lại chi tiết sản phẩm
      </p>
    </div>
  );
}

function Lightbox({
  images,
  index,
  authorName,
  onClose,
  onIndex,
}: {
  images: string[];
  index: number;
  authorName: string;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex(Math.min(index + 1, images.length - 1));
      if (e.key === "ArrowLeft") onIndex(Math.max(index - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onIndex, index, images.length]);

  return (
    <div
      className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-sc-ink/90 p-6"
      onClick={onClose}
    >
      <div className="absolute top-6 right-6">
        <TvNavButton onClick={onClose} variant="ghost" ariaLabel="Đóng xem ảnh lớn">
          <span className="text-sc-paper">✕ Đóng</span>
        </TvNavButton>
      </div>

      <div className="max-h-[75vh] max-w-[85vw]" onClick={(e) => e.stopPropagation()}>
        <SafeImage
          src={images[index]}
          alt={`Ảnh ${index + 1} sản phẩm của ${authorName}`}
          className="max-h-[75vh] max-w-[85vw] rounded-2xl object-contain"
        />
      </div>

      <div
        className="flex items-center gap-4 text-sc-paper"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onIndex(index - 1)}
          className="rounded-full border border-sc-paper/30 px-4 py-2 text-sm transition-colors hover:bg-sc-paper/10 disabled:opacity-30"
        >
          ← Trước
        </button>
        <span className="font-display text-sm">
          {index + 1}/{images.length}
        </span>
        <button
          type="button"
          disabled={index === images.length - 1}
          onClick={() => onIndex(index + 1)}
          className="rounded-full border border-sc-paper/30 px-4 py-2 text-sm transition-colors hover:bg-sc-paper/10 disabled:opacity-30"
        >
          Tiếp →
        </button>
      </div>
    </div>
  );
}

/** Màn hình chiếu thuyết trình sản phẩm cuối khóa, thiết kế theo tư duy SLIDE
 *  (concept "Bảng vàng" đồng bộ với trang phụ huynh `/showcase`) — mỗi cảnh
 *  khít khung `100dvh`, hạn chế cuộn tối đa:
 *  - "slides": mỗi em một slide, chuyển bằng nút hoặc phím ← →, thứ tự theo tên.
 *  - "overview": tổng kết CẢ LỚP một màn — chiếu khi nói chuyện với phụ huynh
 *    sau khi các em thuyết trình xong; bấm thẻ để nhảy về slide của em đó. */
export function ProjectShowcase({
  classCode,
  projects,
}: {
  classCode: string;
  projects: ProjectView[];
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"slides" | "overview">("slides");
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const slides = [...projects].sort((a, b) =>
    a.authorName.localeCompare(b.authorName, "vi")
  );
  const current = slides[Math.min(index, slides.length - 1)];
  const isLast = index === slides.length - 1;

  useEffect(() => {
    if (!open || view !== "slides" || lightbox !== null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, view, slides.length, lightbox]);

  // Đổi slide/đổi màn thì đóng lightbox đang mở của slide trước, tránh lệch ảnh.
  useEffect(() => {
    setLightbox(null);
  }, [index, view]);

  if (projects.length === 0) return null;

  function enter() {
    setIndex(0);
    setView("slides");
    setOpen(true);
    enterBrowserFullscreen();
  }

  function exit() {
    setOpen(false);
    exitBrowserFullscreen();
  }

  function jumpToSlide(i: number) {
    setIndex(i);
    setView("slides");
  }

  return (
    <>
      {/* Đặt song song với nút "📺 Chiếu QR lên TV" ở khối bên cạnh: cùng động
          từ "chiếu ... lên TV" để giáo viên đọc lướt là biết cả hai đều mở màn
          trình chiếu, không phải một trang quản lý nào khác. */}
      <Button variant="outline" onClick={enter}>
        🎬 Chiếu sản phẩm
      </Button>

      {open && current && (
        <TvOverlay onClose={exit} fullBleed>
          <div className={`${showcaseFontClass} showcase-theme relative h-full w-full`}>
            <div className="showcase-surface flex h-full w-full flex-col overflow-hidden">
              <TvChrome
                title={
                  view === "slides"
                    ? `🎤 Sản phẩm cuối khóa · Lớp ${classCode}`
                    : `🎉 Sản phẩm cuối khóa · Lớp ${classCode}`
                }
                progress={view === "slides" ? `${index + 1}/${slides.length}` : undefined}
              >
                {view === "slides" ? (
                  <>
                    <TvNavButton
                      onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                      disabled={index === 0}
                    >
                      ← Trước
                    </TvNavButton>
                    <TvNavButton
                      variant={isLast ? "outline" : "solid"}
                      onClick={() => setIndex((i) => Math.min(i + 1, slides.length - 1))}
                      disabled={isLast}
                    >
                      Tiếp →
                    </TvNavButton>
                    {/* MỘT đường sang màn tổng kết duy nhất. Đến em cuối thì nó
                        thành nút chính — vừa là "xem cả lớp", vừa là bước tiếp
                        theo tự nhiên của buổi lễ, không cần nút thứ hai. */}
                    <TvNavButton
                      variant={isLast ? "solid" : "outline"}
                      onClick={() => setView("overview")}
                    >
                      🎉 Tất cả
                    </TvNavButton>
                  </>
                ) : (
                  <TvNavButton onClick={() => setView("slides")}>
                    ▶️ Xem lần lượt
                  </TvNavButton>
                )}
                <TvNavButton variant="ghost" onClick={exit} ariaLabel="Thoát chế độ chiếu">
                  ✕ Thoát
                </TvNavButton>
              </TvChrome>

              <div className="min-h-0 flex-1">
                {view === "slides" ? (
                  <StudentSlide project={current} onOpenLightbox={setLightbox} />
                ) : (
                  <OverviewSlide slides={slides} onJump={jumpToSlide} />
                )}
              </div>
            </div>

            {lightbox !== null && current.image_urls.length > 0 && (
              <Lightbox
                images={current.image_urls}
                index={lightbox}
                authorName={current.authorName}
                onClose={() => setLightbox(null)}
                onIndex={setLightbox}
              />
            )}
          </div>
        </TvOverlay>
      )}
    </>
  );
}
