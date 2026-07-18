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

/** Màn hình chiếu thuyết trình sản phẩm cuối khóa: mỗi slide một em,
 *  chuyển bằng nút hoặc phím ← →. Thứ tự theo tên để em nào cũng biết lượt mình. */
export function ProjectShowcase({
  classCode,
  projects,
}: {
  classCode: string;
  projects: ProjectView[];
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const slides = [...projects].sort((a, b) =>
    a.authorName.localeCompare(b.authorName, "vi")
  );
  const current = slides[Math.min(index, slides.length - 1)];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, slides.length]);

  if (projects.length === 0) return null;

  function enter() {
    setIndex(0);
    setOpen(true);
    enterBrowserFullscreen();
  }

  function exit() {
    setOpen(false);
    exitBrowserFullscreen();
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
              🎤 Thuyết trình sản phẩm · Lớp {classCode}
            </h2>
            <span className="text-xl text-muted-foreground">
              {index + 1}/{slides.length}
            </span>
            <div className="ml-auto flex items-center gap-3">
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
                onClick={() => setIndex((i) => Math.min(i + 1, slides.length - 1))}
                disabled={index === slides.length - 1}
              >
                Tiếp →
              </Button>
              <Button size="lg" variant="ghost" onClick={exit} aria-label="Thoát chế độ chiếu">
                ✕ Thoát
              </Button>
            </div>
          </div>

          {/* key = id để mỗi lần chuyển slide chạy lại animation vào. */}
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
        </TvOverlay>
      )}
    </>
  );
}
