"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  Folder,
  Globe,
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
  twoColumn = false,
}: {
  project: ProjectView;
  hideHeading?: boolean;
  twoColumn?: boolean;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Khi chuyển sang sản phẩm khác, reset về ảnh đầu tiên
  useEffect(() => {
    setActiveImageIndex(0);
  }, [project.id]);

  const hasLinks = Boolean(
    project.repo_url ||
      project.drive_url ||
      project.demo_url ||
      (project.extra_notes && project.extra_notes.startsWith("http"))
  );

  const totalImages = project.image_urls.length;
  const safeIndex =
    totalImages > 0 ? Math.min(Math.max(0, activeImageIndex), totalImages - 1) : 0;
  const currentImage = totalImages > 0 ? project.image_urls[safeIndex] : null;

  const lastNavTime = useRef<number>(0);

  const handlePrevImage = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    e?.nativeEvent?.stopImmediatePropagation?.();
    if (totalImages <= 1) return;
    const now = Date.now();
    if (now - lastNavTime.current < 200) return;
    lastNavTime.current = now;
    setActiveImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleNextImage = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    e?.nativeEvent?.stopImmediatePropagation?.();
    if (totalImages <= 1) return;
    const now = Date.now();
    if (now - lastNavTime.current < 200) return;
    lastNavTime.current = now;
    setActiveImageIndex((prev) => (prev + 1) % totalImages);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || totalImages <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
    touchStartX.current = null;
  };

  return (
    <div
      className={
        twoColumn
          ? "flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-3"
          : "space-y-3.5"
      }
    >
      {/* 1. Tên dự án (dành cho nơi không ẩn tiêu đề như trang chi tiết lớp GV) */}
      {!hideHeading && (
        <div className="space-y-1.5 shrink-0">
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
        <div className="shrink-0 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Mô tả dự án
          </span>
          <div
            className={`rounded-xl border border-border/80 bg-card text-foreground/95 leading-relaxed shadow-xs ${
              twoColumn
                ? "p-2.5 sm:p-3 text-xs sm:text-[13px] max-h-24 overflow-y-auto scrollbar-slim"
                : "p-3 sm:p-3.5 text-xs sm:text-sm"
            }`}
          >
            <p className="whitespace-pre-wrap">{project.description}</p>
          </div>
        </div>
      )}

      {/* 3. Ảnh sản phẩm - Có nút chuyển ảnh qua lại ◀ ▶, chọn thumbnail, và mở phóng to */}
      {currentImage && (
        <div
          className={
            twoColumn
              ? "flex-1 min-h-0 flex flex-col gap-1.5"
              : "shrink-0 space-y-1.5"
          }
        >
          <div className="shrink-0 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Ảnh sản phẩm</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border/60">
                {totalImages}
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {totalImages > 1
                ? "Dùng ◀ ▶ hoặc bấm thumbnail để chuyển ảnh"
                : "Bấm vào ảnh để phóng to"}
            </span>
          </div>

          <div
            className={
              twoColumn
                ? "flex-1 min-h-0 flex flex-col gap-1.5"
                : "space-y-1.5"
            }
          >
            {/* Khung ảnh chính (Hero Banner) - Có nút chuyển ◀ ▶ và bấm để phóng to */}
            <div
              className={`group relative w-full overflow-hidden rounded-xl border border-border/80 bg-zinc-950 select-none transition-all duration-200 hover:border-primary/50 hover:shadow-md ${
                twoColumn
                  ? "flex-1 min-h-[220px] max-h-[340px]"
                  : "h-52 sm:h-60"
              }`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Nút bấm vào ảnh để phóng to */}
              <button
                type="button"
                onClick={() => setPreviewIndex(safeIndex)}
                className="relative size-full cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer overflow-hidden"
                aria-label={`Bấm để phóng to ảnh ${safeIndex + 1} của ${project.authorName}`}
              >
                {/* Lớp 1: Nền làm mờ nghệ thuật (Ambient Backdrop) tạo chiều sâu và khử khoảng trống */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <SafeImage
                    src={currentImage}
                    alt=""
                    className="size-full scale-125 object-cover blur-2xl opacity-40 saturate-150 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs" />
                </div>

                {/* Lớp 2: Ảnh chính hiển thị 100% trọn vẹn, cân đối đều 4 phía */}
                <div className="relative z-1 flex size-full items-center justify-center p-2 sm:p-2.5">
                  <SafeImage
                    src={currentImage}
                    alt={`Ảnh sản phẩm ${safeIndex + 1} của ${project.authorName}`}
                    className="max-h-full max-w-full object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                </div>

                <div className="absolute inset-0 z-2 bg-black/0 transition-colors group-hover:bg-black/10 pointer-events-none" />
              </button>

              {/* Nút phóng to ở góc dưới bên trái */}
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none z-10">
                <span className="rounded-md bg-black/75 px-2 py-1 text-[11px] font-semibold text-white shadow-xs backdrop-blur-xs flex items-center gap-1">
                  🔍 Phóng to
                </span>
              </div>

              {/* Chỉ số thứ tự ảnh ở góc dưới bên phải */}
              {totalImages > 1 && (
                <div className="absolute bottom-2.5 right-2.5 pointer-events-none z-10">
                  <span className="rounded-md bg-black/75 px-2 py-1 text-[11px] font-semibold text-white shadow-xs backdrop-blur-xs">
                    {safeIndex + 1} / {totalImages}
                  </span>
                </div>
              )}

              {/* Nút chuyển ảnh Trước (◀) */}
              {totalImages > 1 && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent?.stopImmediatePropagation?.();
                  }}
                  onClick={handlePrevImage}
                  aria-label="Ảnh trước"
                  title="Ảnh trước"
                  className="absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 z-20 flex size-8 sm:size-9 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-md border border-white/25 transition-all hover:bg-black/90 hover:scale-110 active:scale-95 shadow-md cursor-pointer opacity-90 hover:opacity-100"
                >
                  <ChevronLeft className="size-5" />
                </button>
              )}

              {/* Nút chuyển ảnh Tiếp theo (▶) */}
              {totalImages > 1 && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.nativeEvent?.stopImmediatePropagation?.();
                  }}
                  onClick={handleNextImage}
                  aria-label="Ảnh tiếp theo"
                  title="Ảnh tiếp theo"
                  className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 z-20 flex size-8 sm:size-9 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-md border border-white/25 transition-all hover:bg-black/90 hover:scale-110 active:scale-95 shadow-md cursor-pointer opacity-90 hover:opacity-100"
                >
                  <ChevronRight className="size-5" />
                </button>
              )}
            </div>

            {/* Dải thumbnail phụ bên dưới (hiển thị tất cả các ảnh, click để đổi ảnh chính) */}
            {totalImages > 1 && (
              <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 scrollbar-thin">
                {project.image_urls.map((url, i) => {
                  const isSelected = i === safeIndex;
                  return (
                    <button
                      type="button"
                      key={url + i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`group relative ${
                        twoColumn ? "size-10 sm:size-11" : "size-12"
                      } shrink-0 overflow-hidden rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-2 border-primary scale-105 shadow-xs opacity-100"
                          : "border border-border/80 opacity-60 hover:opacity-100 hover:border-primary/50 hover:scale-102"
                      }`}
                      aria-label={`Chọn xem ảnh ${i + 1}`}
                      title={`Xem ảnh ${i + 1}`}
                    >
                      <SafeImage
                        src={url}
                        alt={`Ảnh thu nhỏ ${i + 1}`}
                        className="size-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                      )}
                      <span className="absolute bottom-0.5 right-0.5 rounded-xs bg-black/75 px-1 py-0.2 text-[9px] font-bold text-white leading-none">
                        {i + 1}
                      </span>
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
            onNavigate={(idx) => {
              setPreviewIndex(idx);
              setActiveImageIndex(idx);
            }}
          />
        </div>
      )}

      {/* 4. Các chức năng & Liên kết dự án - Chỉ hiển thị khi KHÔNG PHẢI twoColumn (chế độ twoColumn đã chuyển sang cột phải) */}
      {!twoColumn && (project.features.length > 0 || hasLinks) && (
        <div
          className={
            project.features.length > 0 && hasLinks
              ? "grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start"
              : "space-y-3"
          }
        >
          {/* Cột 1: Các chức năng sản phẩm */}
          {project.features.length > 0 && (
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Các chức năng</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border/60">
                    {project.features.length}
                  </span>
                </span>
              </div>

              <div className="overflow-y-auto pr-1.5 scrollbar-slim max-h-32 sm:max-h-36">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[...project.features]
                    .sort((a, b) => a.trim().length - b.trim().length)
                    .map((feature) => (
                      <div
                        key={feature}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:border-primary/40 transition-colors"
                      >
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                        <span className="leading-normal">{feature}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Cột 2: Liên kết dự án & Nộp bài */}
          {hasLinks && (
            <div className="space-y-1.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Liên kết dự án & Nộp bài
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start pr-0.5">
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
                <div className="space-y-1 pt-1 shrink-0">
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
      {!twoColumn && !hasLinks && project.extra_notes && !project.extra_notes.startsWith("http") && (
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

/** Phần hiển thị Các chức năng & Liên kết dự án đặt ở đỉnh cột phải của Modal */
export function ProjectFeaturesAndLinks({
  project,
  headerAction,
}: {
  project: ProjectView;
  headerAction?: React.ReactNode;
}) {
  const hasLinks = Boolean(
    project.repo_url ||
      project.drive_url ||
      project.demo_url ||
      (project.extra_notes && project.extra_notes.startsWith("http"))
  );
  const linksCount =
    (project.drive_url ? 1 : 0) +
    (project.repo_url ? 1 : 0) +
    (project.demo_url ? 1 : 0) +
    (project.extra_notes && project.extra_notes.startsWith("http") ? 1 : 0);

  const hasFeatures = project.features.length > 0;
  const [activeTab, setActiveTab] = useState<"features" | "links">(() =>
    hasFeatures ? "features" : "links"
  );

  useEffect(() => {
    setActiveTab(hasFeatures ? "features" : "links");
  }, [project.id, hasFeatures]);

  const sortedFeatures = useMemo(() => {
    return [...project.features].sort(
      (a, b) => a.trim().length - b.trim().length
    );
  }, [project.features]);

  if (!hasFeatures && !hasLinks) {
    if (!headerAction) return null;
    return (
      <div className="shrink-0 px-4 py-2.5 flex items-center justify-end border-b border-border/60 bg-muted/20">
        {headerAction}
      </div>
    );
  }

  const showTabs = hasFeatures && hasLinks;

  return (
    <div className="shrink-0 h-[190px] sm:h-[200px] border-b border-border/60 bg-muted/10 flex flex-col overflow-hidden">
      {/* Header thanh điều hướng: Tabs hoặc Tiêu đề + Nút đóng X */}
      <div className="px-4 sm:px-5 h-11 shrink-0 flex items-center justify-between border-b border-border/50 gap-2 bg-muted/20">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {showTabs ? (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/70 border border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab("features")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "features"
                    ? "bg-background text-foreground shadow-2xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>✨ Chức năng</span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {project.features.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("links")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "links"
                    ? "bg-background text-foreground shadow-2xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🔗 Liên kết & Nộp bài</span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {linksCount}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {hasFeatures ? (
                <>
                  <span>✨ Các chức năng</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border/60">
                    {project.features.length}
                  </span>
                </>
              ) : (
                <>
                  <span>🔗 Liên kết & Nộp bài</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border/60">
                    {linksCount}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      {/* Nội dung: Chức năng hoặc Liên kết */}
      <div className="flex-1 min-h-0 p-3 sm:p-3.5 overflow-y-auto scrollbar-slim">
        {(activeTab === "features" || !hasLinks) && hasFeatures && (
          <div className="flex flex-wrap items-center gap-2">
            {sortedFeatures.map((feature) => (
              <div
                key={feature}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-2xs hover:border-primary/50 hover:bg-accent/40 transition-colors"
              >
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                <span className="leading-normal">{feature}</span>
              </div>
            ))}
          </div>
        )}

        {(activeTab === "links" || !hasFeatures) && hasLinks && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
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

            {/* Ghi chú thêm nếu không phải link http */}
            {project.extra_notes && !project.extra_notes.startsWith("http") && (
              <div className="space-y-1 pt-1 shrink-0 col-span-full">
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
    </div>
  );
}



