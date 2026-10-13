"use client";

import { useEffect, useMemo, useState } from "react";

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

/** Thời gian mỗi cảnh màn hình chờ hiển thị trước khi chuyển em tiếp theo (8 giây) */
const IDLE_SCENE_MS = 8000;

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
    <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-b border-sc-line px-6 py-4.5 sm:px-10">
      <GraduationSeal size={36} className="shrink-0 text-sc-brass" />
      <h2 className="font-display text-2xl font-bold text-sc-ink sm:text-3xl">
        {title}
      </h2>
      {progress && (
        <span className="font-display text-lg font-semibold text-sc-ink-soft sm:text-xl">
          {progress}
        </span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2.5">{children}</div>
    </div>
  );
}

/** Cảnh Màn hình chờ hiển thị từng học sinh:
 *  - Cột trái: Tên học viên, Tên dự án, Mô tả chi tiết, Danh sách chức năng bo tròn (không link).
 *  - Cột phải: 1 hình ảnh tiêu biểu đẹp nhất hiển thị rõ đầy đủ (Cinema Showcase Frame). */
function IdleSlide({ project }: { project: ProjectView }) {
  const featuredImage = project.image_urls[0] ?? null;

  const sortedFeatures = useMemo(() => {
    return [...project.features].sort(
      (a, b) => a.trim().length - b.trim().length
    );
  }, [project.features]);

  return (
    <div
      key={project.id}
      className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-10 lg:p-12 animate-in fade-in duration-500 overflow-hidden"
    >
      {/* CỘT TRÁI (THÔNG TIN TÁC GIẢ, MÔ TẢ & CHỨC NĂNG - 5/12 CỘT) */}
      <div className="lg:col-span-5 flex min-h-0 flex-col justify-center gap-5 sm:gap-6 overflow-hidden">
        {/* Tác giả & Tên dự án */}
        <div className="flex items-center gap-5 shrink-0">
          <SealAvatar name={project.authorName} size={84} />
          <div className="min-w-0">
            <p className="truncate font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-sc-ink tracking-tight">
              {project.authorName}
            </p>
            <p className="truncate text-xl sm:text-2xl lg:text-3xl font-bold text-sc-brass mt-1 sm:mt-1.5">
              {project.name}
            </p>
          </div>
        </div>

        {/* Mô tả dự án */}
        {project.description ? (
          <div className="shrink-0 space-y-2">
            <span className="text-xs sm:text-sm lg:text-base font-bold uppercase tracking-wider text-sc-brass">
              Mô tả dự án
            </span>
            <div className="rounded-2xl border border-sc-line bg-sc-raised/80 p-4 sm:p-5 text-base sm:text-lg lg:text-xl leading-relaxed text-sc-ink font-normal max-h-44 sm:max-h-56 overflow-y-auto scrollbar-slim shadow-2xs">
              <p className="whitespace-pre-wrap">{project.description}</p>
            </div>
          </div>
        ) : (
          <div className="shrink-0 rounded-2xl border border-sc-line/70 bg-sc-raised/50 p-4 text-sm sm:text-base lg:text-lg text-sc-ink-soft italic">
            Sản phẩm cuối khóa do học viên {project.authorName} tự tay thiết kế và phát triển.
          </div>
        )}

        {/* Các chức năng sản phẩm (Sắp xếp từ ngắn đến dài, bo tròn trên cùng hàng, không link) */}
        {sortedFeatures.length > 0 && (
          <div className="min-h-0 flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-xs sm:text-sm lg:text-base font-bold uppercase tracking-wider text-sc-brass">
                Các chức năng nổi bật ({sortedFeatures.length})
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim pr-1">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {sortedFeatures.map((f) => (
                  <div
                    key={f}
                    className="inline-flex items-center gap-2 rounded-full border border-sc-brass/45 bg-sc-raised px-4 py-2 sm:px-4.5 sm:py-2.5 text-sm sm:text-base lg:text-lg font-medium text-sc-ink shadow-2xs transition-colors"
                  >
                    <CheckMark className="size-4 sm:size-5 shrink-0 text-sc-brass" />
                    <span className="leading-snug">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CỘT PHẢI (ẢNH TIÊU BIỂU HIỂN THỊ RÕ ĐẦY ĐỦ - 7/12 CỘT) */}
      <div className="lg:col-span-7 flex min-h-0 items-center justify-center overflow-hidden">
        {featuredImage ? (
          <div className="group relative size-full overflow-hidden rounded-2xl border border-sc-line bg-zinc-950 flex items-center justify-center p-2 sm:p-3 shadow-xl">
            {/* Lớp nền mờ Ambient Backdrop tạo chiều sâu và vầng hào quang theo màu ảnh */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <SafeImage
                src={featuredImage}
                alt=""
                className="size-full scale-125 object-cover blur-2xl opacity-35 saturate-150"
              />
              <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs" />
            </div>

            {/* Ảnh chính hiển thị 100% trọn vẹn, không crop, sắc nét tối đa */}
            <div className="relative z-1 flex size-full items-center justify-center p-1 sm:p-2">
              <SafeImage
                src={featuredImage}
                alt={`Ảnh tiêu biểu sản phẩm của ${project.authorName}`}
                className="max-h-full max-w-full object-contain drop-shadow-2xl rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
              />
            </div>
          </div>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-sc-brass/35 bg-sc-raised/30 p-8 text-center text-sc-ink-soft">
            <GraduationSeal size={130} withRibbon className="text-sc-brass/60" />
            <p className="text-xl sm:text-2xl font-bold text-sc-ink">
              Sản phẩm của {project.authorName}
            </p>
            <p className="text-sm sm:text-base text-sc-ink-soft max-w-sm">
              Chưa có ảnh tải lên — hãy chúc mừng bài làm của em!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Màn hình tổng kết cả lớp (Overview) — có thể mở từ màn hình chờ để ngắm toàn bộ sản phẩm */
function OverviewSlide({
  slides,
  onJump,
}: {
  slides: ProjectView[];
  onJump: (index: number) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden p-6 sm:gap-6 sm:p-10">
      <p className="shrink-0 text-center text-lg text-sc-ink-soft sm:text-xl lg:text-2xl font-medium">
        Cả lớp đã hoàn thành{" "}
        <span className="font-display text-xl font-bold text-sc-brass sm:text-2xl lg:text-3xl">
          {slides.length} sản phẩm
        </span>{" "}
        — chúc mừng tất cả các em! 💐
      </p>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        <div
          className="grid gap-5 sm:gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        >
          {slides.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onJump(i)}
              className="sc-rule group rounded-2xl bg-sc-raised p-5 text-left transition-transform hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-2 cursor-pointer shadow-xs"
              style={{ animationDelay: `${Math.min(i, 14) * 40}ms` }}
            >
              {p.image_urls.length > 0 && (
                <div className="relative mb-3.5">
                  <SafeImage
                    src={p.image_urls[0]}
                    alt={`Ảnh sản phẩm của ${p.authorName}`}
                    className="h-32 w-full rounded-xl bg-sc-paper object-cover sm:h-36"
                  />
                  <span className="sc-tape absolute -top-1.5 left-4 h-3.5 w-12 rounded-[2px]" />
                </div>
              )}
              <div className="flex items-center gap-3.5">
                <SealAvatar name={p.authorName} size={48} />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-sc-ink sm:text-xl">
                    {p.authorName}
                  </p>
                  <p className="truncate text-base font-semibold text-sc-brass mt-0.5">{p.name}</p>
                </div>
              </div>
              {p.features.length > 0 && (
                <p className="mt-2.5 truncate text-xs sm:text-sm text-sc-ink-soft">
                  {p.features.slice(0, 3).join(" · ")}
                  {p.features.length > 3 && ` +${p.features.length - 3}`}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="shrink-0 text-center text-sm sm:text-base font-medium text-sc-ink-soft">
        Bấm vào từng em để chuyển tới màn hình của em đó
      </p>
    </div>
  );
}

/** Chức năng Màn hình chờ (TV Slideshow) cho sản phẩm cuối khóa của lớp:
 *  Tự động chạy tuần tự từng học sinh sau mỗi 8s, hiển thị mô tả, chức năng bo tròn và 1 ảnh tiêu biểu. */
export function ProjectShowcase({
  classCode,
  projects,
}: {
  classCode: string;
  projects: ProjectView[];
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [view, setView] = useState<"idle" | "overview">("idle");

  const slides = useMemo(() => {
    return [...projects].sort((a, b) =>
      a.authorName.localeCompare(b.authorName, "vi")
    );
  }, [projects]);

  const current = slides[Math.min(index, slides.length - 1)];

  // Màn hình chờ tự động chuyển sang em tiếp theo theo chu kỳ lặp vô tận
  useEffect(() => {
    if (!open || !isPlaying || view !== "idle" || slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, IDLE_SCENE_MS);
    return () => clearInterval(timer);
  }, [open, isPlaying, view, slides.length]);

  // Phím tắt bàn phím tiện lợi
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setIndex((i) => (i + 1) % slides.length);
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => (i - 1 + slides.length) % slides.length);
      } else if (e.key === " " && view === "idle") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, view, slides.length]);

  if (projects.length === 0) return null;

  function enter() {
    setIndex(0);
    setIsPlaying(true);
    setView("idle");
    setOpen(true);
    enterBrowserFullscreen();
  }

  function exit() {
    setOpen(false);
    exitBrowserFullscreen();
  }

  function jumpToSlide(i: number) {
    setIndex(i);
    setView("idle");
  }

  return (
    <>
      {/* Chỉ giữ lại 1 nút chức năng: Màn hình chờ */}
      <Button variant="outline" onClick={enter} className="cursor-pointer">
        🖼️ Màn hình chờ
      </Button>

      {open && current && (
        <TvOverlay onClose={exit} fullBleed>
          <div className={`${showcaseFontClass} showcase-theme relative h-full w-full`}>
            <div className="showcase-surface flex h-full w-full flex-col overflow-hidden">
              <TvChrome
                title={
                  view === "idle"
                    ? `🖼️ Màn hình chờ sản phẩm cuối khóa · Lớp ${classCode}`
                    : `🎉 Tổng kết sản phẩm cuối khóa · Lớp ${classCode}`
                }
                progress={view === "idle" ? `${index + 1}/${slides.length}` : undefined}
              >
                {view === "idle" ? (
                  <>
                    <TvNavButton
                      onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
                      ariaLabel="Xem học viên trước (Phím ←)"
                    >
                      ← Trước
                    </TvNavButton>
                    <TvNavButton
                      onClick={() => setIndex((i) => (i + 1) % slides.length)}
                      ariaLabel="Xem học viên tiếp theo (Phím →)"
                    >
                      Tiếp →
                    </TvNavButton>
                    <TvNavButton
                      variant={isPlaying ? "solid" : "outline"}
                      onClick={() => setIsPlaying((p) => !p)}
                      ariaLabel={isPlaying ? "Tạm dừng tự chạy (Phím Space)" : "Tiếp tục tự chạy (Phím Space)"}
                    >
                      {isPlaying ? "⏸️ Tạm dừng" : "▶️ Tự chạy"}
                    </TvNavButton>
                    <TvNavButton
                      variant="outline"
                      onClick={() => setView("overview")}
                    >
                      🎉 Xem tất cả
                    </TvNavButton>
                  </>
                ) : (
                  <TvNavButton onClick={() => setView("idle")}>
                    🖼️ Quay lại màn hình chờ
                  </TvNavButton>
                )}

                <TvNavButton variant="ghost" onClick={exit} ariaLabel="Thoát chế độ chiếu">
                  ✕ Thoát
                </TvNavButton>
              </TvChrome>

              <div className="min-h-0 flex-1 overflow-hidden">
                {view === "idle" ? (
                  <IdleSlide project={current} />
                ) : (
                  <OverviewSlide slides={slides} onJump={jumpToSlide} />
                )}
              </div>
            </div>
          </div>
        </TvOverlay>
      )}
    </>
  );
}
