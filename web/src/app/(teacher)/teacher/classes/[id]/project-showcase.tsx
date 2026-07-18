"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProjectView } from "@/components/project-card";
import {
  TvOverlay,
  enterBrowserFullscreen,
  exitBrowserFullscreen,
} from "@/components/tv-overlay";

/** Bộ màu xoay vòng cho thẻ ở màn tổng quan — literal đầy đủ cho Tailwind JIT. */
const CARD_THEMES = [
  { card: "border-indigo-500/40 bg-indigo-500/10", avatar: "bg-indigo-600" },
  { card: "border-emerald-500/40 bg-emerald-500/10", avatar: "bg-emerald-600" },
  { card: "border-amber-500/40 bg-amber-500/10", avatar: "bg-amber-600" },
  { card: "border-rose-500/40 bg-rose-500/10", avatar: "bg-rose-600" },
  { card: "border-sky-500/40 bg-sky-500/10", avatar: "bg-sky-600" },
  { card: "border-violet-500/40 bg-violet-500/10", avatar: "bg-violet-600" },
] as const;

function BigLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border-2 border-primary/40 px-4 py-2 text-xl font-medium text-primary transition-colors hover:bg-primary/10"
    >
      {label} ↗
    </a>
  );
}

/** Màn hình chiếu thuyết trình sản phẩm cuối khóa:
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

  const slides = [...projects].sort((a, b) =>
    a.authorName.localeCompare(b.authorName, "vi")
  );
  const current = slides[Math.min(index, slides.length - 1)];
  const isLast = index === slides.length - 1;

  useEffect(() => {
    if (!open || view !== "slides") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, view, slides.length]);

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
      <Button variant="outline" onClick={enter}>
        🎤 Thuyết trình sản phẩm
      </Button>

      {open && current && (
        <TvOverlay onClose={exit}>
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-3xl font-bold">
              {view === "slides"
                ? `🎤 Thuyết trình sản phẩm · Lớp ${classCode}`
                : `🎉 Sản phẩm cuối khóa · Lớp ${classCode}`}
            </h2>
            {view === "slides" && (
              <span className="text-xl text-muted-foreground">
                {index + 1}/{slides.length}
              </span>
            )}
            <div className="ml-auto flex items-center gap-3">
              {view === "slides" ? (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                    disabled={index === 0}
                  >
                    ← Trước
                  </Button>
                  <Button
                    size="lg"
                    onClick={() =>
                      isLast
                        ? setView("overview")
                        : setIndex((i) => Math.min(i + 1, slides.length - 1))
                    }
                  >
                    {isLast ? "🎉 Tổng kết lớp" : "Tiếp →"}
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setView("overview")}>
                    🖼️ Cả lớp
                  </Button>
                </>
              ) : (
                <Button size="lg" variant="outline" onClick={() => setView("slides")}>
                  ▶️ Từng em
                </Button>
              )}
              <Button size="lg" variant="ghost" onClick={exit} aria-label="Thoát chế độ chiếu">
                ✕ Thoát
              </Button>
            </div>
          </div>

          {view === "slides" ? (
            /* key = id để mỗi lần chuyển slide chạy lại animation vào. */
            <div
              key={current.id}
              className="mx-auto max-w-5xl space-y-8 py-8 animate-in fade-in slide-in-from-right-4"
            >
              <div className="flex items-center gap-5">
                <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary text-4xl font-bold text-primary-foreground">
                  {current.authorName.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <div>
                  <p className="text-4xl font-bold">{current.authorName}</p>
                  <p className="mt-1 text-2xl text-muted-foreground">
                    {current.name}
                  </p>
                </div>
              </div>

              {current.description && (
                <p className="text-2xl leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {current.description}
                </p>
              )}

              {current.features.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {current.features.map((f) => (
                    <Badge
                      key={f}
                      variant="secondary"
                      className="rounded-lg px-4 py-2 text-xl font-normal"
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <BigLink href={current.repo_url} label="GitHub" />
                <BigLink href={current.drive_url} label="Google Drive" />
                <BigLink href={current.demo_url} label="Demo" />
              </div>
            </div>
          ) : (
            <div className="space-y-8 py-4 animate-in fade-in">
              <p className="text-center text-2xl text-muted-foreground">
                Cả lớp đã hoàn thành{" "}
                <span className="font-bold text-primary">{slides.length} sản phẩm</span>{" "}
                — cảm ơn quý phụ huynh đã đồng hành cùng các em! 💐
              </p>

              <div
                className="grid gap-5"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
              >
                {slides.map((p, i) => {
                  const theme = CARD_THEMES[i % CARD_THEMES.length];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => jumpToSlide(i)}
                      className={`rounded-2xl border-2 p-5 text-left transition-all hover:-translate-y-1 hover:shadow-lg ${theme.card} animate-in fade-in slide-in-from-bottom-2`}
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${theme.avatar}`}
                        >
                          {p.authorName.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xl font-bold">{p.authorName}</p>
                          <p className="truncate text-base text-muted-foreground">
                            {p.name}
                          </p>
                        </div>
                      </div>
                      {p.features.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.features.slice(0, 3).map((f) => (
                            <Badge
                              key={f}
                              variant="secondary"
                              className="rounded-md text-sm font-normal"
                            >
                              {f}
                            </Badge>
                          ))}
                          {p.features.length > 3 && (
                            <Badge variant="secondary" className="rounded-md text-sm font-normal">
                              +{p.features.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-lg text-muted-foreground">
                Bấm vào từng em để xem lại chi tiết sản phẩm
              </p>
            </div>
          )}
        </TvOverlay>
      )}
    </>
  );
}
