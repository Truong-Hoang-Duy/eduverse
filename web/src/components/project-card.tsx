"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Code2,
  ExternalLink,
  Folder,
  Globe,
  Images,
  Layout,
  Laptop,
} from "lucide-react";

import { ImageLightbox } from "@/components/gallery/image-lightbox";
import { SafeImage } from "@/components/safe-image";
import { isSafeHttpUrl } from "@/lib/drive-url";

export interface ProjectView {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  image_urls: string[];
  repo_url: string | null;
  drive_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
  authorName: string;
  updatedAt?: string;
}

function cleanDomain(url: string | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
  } catch {
    return url;
  }
}

function LinkCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string | null;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  if (!href) return null;
  if (!isSafeHttpUrl(href)) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-2 shadow-2xs hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
          <span className="truncate">{title}</span>
          <ExternalLink className="size-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">
          {subtitle}
        </div>
      </div>
    </a>
  );
}

/** Hiển thị chi tiết một sản phẩm cuối khóa (read-only). */
export function ProjectCard({
  project,
  hideHeading = false,
}: {
  project: ProjectView;
  hideHeading?: boolean;
  twoColumn?: boolean;
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const hasLinks = Boolean(
    project.repo_url ||
      project.drive_url ||
      project.demo_url ||
      (project.extra_notes && project.extra_notes.startsWith("http"))
  );

  // Ảnh đầu tiên (Hero banner ngang to đẹp nhất) và các ảnh phụ
  const heroImage = project.image_urls[0] ?? null;
  const extraImages = project.image_urls.slice(1);

  return (
    <div className="space-y-3.5">
      {/* 1. Tên dự án (dành cho nơi không ẩn tiêu đề như trang chi tiết lớp GV) */}
      {!hideHeading && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tên dự án
            </span>
            <span className="text-xs text-muted-foreground">
              {project.authorName}
              {project.updatedAt &&
                ` · Cập nhật ${new Date(project.updatedAt).toLocaleDateString("vi-VN")}`}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-base sm:text-lg font-bold text-primary shadow-xs">
            <Laptop className="size-5 shrink-0 text-primary" />
            <span>{project.name}</span>
          </div>
        </div>
      )}

      {/* 2. Mô tả dự án - Trải dài sang trọng */}
      {project.description && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Mô tả dự án
          </span>
          <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 text-xs sm:text-sm text-foreground/95 leading-relaxed shadow-xs">
            <p className="whitespace-pre-wrap">{project.description}</p>
          </div>
        </div>
      )}

      {/* 3. Ảnh sản phẩm - Fix 1 ảnh ngang to đẹp nhất, các ảnh khác thu nhỏ hoặc mở popup xem tất cả */}
      {heroImage && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Ảnh sản phẩm</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border/60">
                {project.image_urls.length}
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              Bấm vào ảnh để phóng to
            </span>
          </div>

          <div className="space-y-2">
            {/* Ảnh ngang to đẹp nhất (Hero Banner) */}
            <button
              type="button"
              onClick={() => setPreviewIndex(0)}
              className="group relative w-full h-32 sm:h-38 cursor-zoom-in overflow-hidden rounded-xl border border-border/80 bg-muted transition-all duration-200 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-left cursor-pointer"
              aria-label={`Bấm để xem ảnh sản phẩm của ${project.authorName}`}
            >
              <SafeImage
                src={heroImage}
                alt={`Ảnh sản phẩm chính của ${project.authorName}`}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-103"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25 flex items-end justify-between p-2.5">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md bg-black/80 px-2 py-1 text-[11px] font-semibold text-white shadow-xs backdrop-blur-xs flex items-center gap-1.5">
                  🔍 Phóng to
                </span>
                {project.image_urls.length > 1 && (
                  <span className="rounded-md bg-black/75 px-2 py-1 text-[11px] font-semibold text-white shadow-xs backdrop-blur-xs flex items-center gap-1">
                    <Images className="size-3.5" />
                    <span>+{extraImages.length} ảnh khác</span>
                  </span>
                )}
              </div>
            </button>

            {/* Dải thumbnail phụ nhỏ gọn bên dưới (tối đa 4 ảnh nhỏ, không tốn chiều cao) */}
            {extraImages.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {extraImages.slice(0, 4).map((url, i) => {
                  const actualIndex = i + 1;
                  const isLastVisible = i === 3 && extraImages.length > 4;
                  return (
                    <button
                      type="button"
                      key={url}
                      onClick={() => setPreviewIndex(actualIndex)}
                      className="group relative size-12 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-border/80 bg-muted transition-all hover:scale-105 hover:border-primary/50 cursor-pointer"
                      aria-label={`Xem ảnh ${actualIndex + 1}`}
                    >
                      <SafeImage
                        src={url}
                        alt={`Ảnh phụ ${actualIndex + 1}`}
                        className="size-full object-cover"
                      />
                      {isLastVisible && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-[10px] font-bold">
                          +{extraImages.length - 3}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <ImageLightbox
            images={project.image_urls}
            currentIndex={previewIndex}
            onClose={() => setPreviewIndex(null)}
            onNavigate={setPreviewIndex}
          />
        </div>
      )}

      {/* 4. Các chức năng & Liên kết dự án - Chia 2 bên cân xứng, 100% hiển thị đầy đủ không bị tràn */}
      {(project.features.length > 0 || hasLinks) && (
        <div
          className={
            project.features.length > 0 && hasLinks
              ? "grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start"
              : "space-y-3"
          }
        >
          {/* Cột 1: Các chức năng sản phẩm (Khung cuộn nội bộ scrollbar-slim) */}
          {project.features.length > 0 && (
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Các chức năng</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border/60">
                    {project.features.length}
                  </span>
                </span>
              </div>

              <div className="max-h-32 sm:max-h-36 overflow-y-auto space-y-1.5 pr-1.5 scrollbar-slim">
                {project.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-2 rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500 mt-0.5" />
                    <span className="flex-1 leading-snug">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cột 2: Liên kết dự án & Nộp bài */}
          {hasLinks && (
            <div className="space-y-1.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Liên kết dự án & Nộp bài
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.drive_url && (
                  <LinkCard
                    href={project.drive_url}
                    title="Thư mục nộp bài"
                    subtitle="Google Drive"
                    icon={<Folder className="size-4 text-amber-500" />}
                  />
                )}
                {project.repo_url && (
                  <LinkCard
                    href={project.repo_url}
                    title="GitHub"
                    subtitle={cleanDomain(project.repo_url)}
                    icon={<Code2 className="size-4 text-foreground" />}
                  />
                )}
                {project.demo_url && (
                  <LinkCard
                    href={project.demo_url}
                    title="Demo trực tiếp"
                    subtitle={cleanDomain(project.demo_url)}
                    icon={<Globe className="size-4 text-primary" />}
                  />
                )}
                {project.extra_notes && project.extra_notes.startsWith("http") && (
                  <LinkCard
                    href={project.extra_notes}
                    title="Canvas"
                    subtitle={cleanDomain(project.extra_notes)}
                    icon={<Layout className="size-4 text-indigo-500" />}
                  />
                )}
              </div>

              {/* Ghi chú thêm nếu không phải link http */}
              {project.extra_notes && !project.extra_notes.startsWith("http") && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Ghi chú thêm
                  </span>
                  <p className="rounded-xl border border-border/80 bg-card p-2 text-xs text-muted-foreground leading-relaxed shadow-xs">
                    📝 {project.extra_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ghi chú khác nếu không có liên kết nào nhưng có extra_notes không phải http */}
      {!hasLinks && project.extra_notes && !project.extra_notes.startsWith("http") && (
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ghi chú thêm
          </span>
          <p className="rounded-xl border border-border/80 bg-card p-2.5 text-xs text-muted-foreground leading-relaxed shadow-xs">
            📝 {project.extra_notes}
          </p>
        </div>
      )}
    </div>
  );
}



