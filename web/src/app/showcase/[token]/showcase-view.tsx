"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { ZoomableImage } from "@/components/gallery/zoomable-image";
import { SafeImage } from "@/components/safe-image";
import { CheckMark, GraduationSeal } from "@/components/showcase/emblem";
import { SealAvatar } from "@/components/showcase/seal-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isSafeHttpUrl } from "@/lib/drive-url";
import {
  getShowcaseSpotlight,
  loadMyShowcaseRatings,
  trackShowcaseView,
} from "@/lib/actions/showcase-public";
import { usePreventZoom } from "@/lib/use-prevent-zoom";
import {
  RATING_CRITERIA,
  arrangeShowcaseProjects,
  hasRated,
  type MyRating,
  type ShowcasePayload,
  type ShowcaseProject,
} from "@/lib/showcase";

import { RatingForm } from "./rating-form";
import { StarDisplay } from "./star-rating";
import { ThemeSwitch } from "./theme-switch";

/**
 * Trang xem sản phẩm cuối khóa — concept "Bảng vàng": giấy khen gặp
 * bảng tin lớp học. Motif xuyên suốt là TRIỆN TỐT NGHIỆP (xem `emblem.tsx`),
 * dùng ở ba cỡ: crest đầu trang, vòng quanh avatar, con dấu "đã nhận xét".
 *
 * Thiết kế tinh gọn: Hiển thị dưới dạng danh sách tên học viên & sản phẩm nằm ngang.
 * Bấm vào một bạn sẽ mở popup toàn bộ thông tin chi tiết của bạn đó.
 */

/** Id ngẫu nhiên cho mỗi trình duyệt — khớp CHECK `showcase_*_visitor_shape`. */
function readVisitorId(): string {
  const KEY = "eduverse.showcase.visitor";
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    const fresh = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

/** Đường phân cách kiểu giấy khen: hai nét mảnh, viên kim cương ở giữa. */
function Divider({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 text-sc-brass/50 ${className ?? ""}`}
      aria-hidden
    >
      <span className="h-px w-14 bg-current sm:w-20" />
      <span className="size-1.5 rotate-45 bg-current" />
      <span className="h-px w-14 bg-current sm:w-20" />
    </div>
  );
}

/** Nhãn nhỏ chữ hoa giãn cách — nhịp chữ của một tấm bằng. */
function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-xs sm:text-[13px] font-bold tracking-[0.16em] text-sc-brass uppercase ${className ?? ""}`}>
      {children}
    </p>
  );
}

function BigLink({ href, label }: { href: string | null; label: string }) {
  if (!href || !isSafeHttpUrl(href)) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-sc-brass/50 bg-sc-brass-soft/40 px-4 py-2 text-sm sm:text-base font-medium text-sc-brass transition-all hover:bg-sc-brass hover:text-sc-paper hover:shadow-xs"
    >
      <span>{label}</span>
      <span aria-hidden="true">↗</span>
    </a>
  );
}

/** Danh sách chức năng dạng THÀNH TÍCH có dấu tick. */
function FeatureList({
  features,
  limit,
  columns = 1,
}: {
  features: string[];
  limit?: number;
  columns?: 1 | 2;
}) {
  if (features.length === 0) return null;
  const shown = limit ? features.slice(0, limit) : features;
  const rest = features.length - shown.length;

  return (
    <div className="space-y-1.5">
      <Eyebrow>Tính năng</Eyebrow>
      <ul
        className={`mt-1.5 gap-x-6 gap-y-1.5 ${columns === 2 ? "sm:columns-2" : ""}`}
      >
        {shown.map((f) => (
          <li key={f} className="flex items-start gap-2.5 py-1 text-sm sm:text-base lg:text-lg break-inside-avoid">
            <CheckMark className="mt-1 size-4 shrink-0 text-sc-brass" />
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <p className="mt-1 text-xs sm:text-sm text-sc-ink-soft">+{rest} chức năng nữa</p>
      )}
    </div>
  );
}

export function ShowcaseView({
  token,
  showcase,
  fontClass,
}: {
  token: string;
  showcase: ShowcasePayload;
  fontClass: string;
}) {
  const projects = showcase.projects;

  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [myRatings, setMyRatings] = useState<Record<string, MyRating>>({});
  const [guestNotes, setGuestNotes] = useState(() =>
    Object.fromEntries(projects.map((p) => [p.id, p.guest_notes]))
  );
  const [visitorId, setVisitorId] = useState("");
  const [spotlightId, setSpotlightId] = useState<string | null>(
    showcase.spotlight_project_id ?? null
  );

  useEffect(() => {
    // Polling nhẹ mỗi 4s để cập nhật bạn đang thuyết trình từ giáo viên
    const interval = setInterval(async () => {
      try {
        const id = await getShowcaseSpotlight(token);
        setSpotlightId(id);
      } catch {
        // Bỏ qua lỗi mạng chập chờn
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const spotlightProject = useMemo(
    () => (spotlightId ? projects.find((p) => p.id === spotlightId) ?? null : null),
    [projects, spotlightId]
  );

  usePreventZoom(true);

  useEffect(() => {
    const id = readVisitorId();
    setVisitorId(id);

    // Bài chấm cũ của chính máy này
    void loadMyShowcaseRatings(token, id).then((rows) => {
      setMyRatings(Object.fromEntries(rows.map((r) => [r.project_id, r])));
    });

    const key = `eduverse.showcase.viewed.${token}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        void trackShowcaseView(token);
      }
    } catch {
      void trackShowcaseView(token);
    }
  }, [token]);

  const ratedIds = useMemo(
    () => projects.filter((p) => hasRated(myRatings[p.id])).map((p) => p.id),
    [projects, myRatings]
  );

  const visible = useMemo(
    () =>
      arrangeShowcaseProjects(projects, {
        query,
        sort: "name",
        onlyUnrated: false,
        ratedIds,
      }),
    [projects, query, ratedIds]
  );

  const openIndex = visible.findIndex((p) => p.id === openId);
  const current = openIndex >= 0 ? visible[openIndex] : null;

  const saveRating = useCallback((rating: MyRating) => {
    setMyRatings((prev) => ({ ...prev, [rating.project_id]: rating }));
    setGuestNotes((prev) => {
      const others = (prev[rating.project_id] ?? []).filter(
        (n) => n.id !== rating.id
      );
      const next = rating.comment
        ? [
            { id: rating.id, comment: rating.comment, created_at: rating.created_at },
            ...others,
          ]
        : others;
      return { ...prev, [rating.project_id]: next };
    });
  }, []);

  return (
    <main className="pb-16" style={{ touchAction: "manipulation" }}>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <div className="flex justify-end">
          <ThemeSwitch />
        </div>

        <header className="space-y-3 text-center">
          <GraduationSeal
            size={78}
            withRibbon
            className="mx-auto text-sc-brass"
          />
          <Eyebrow>Tổng kết khóa học</Eyebrow>
          <h1 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
            Sản phẩm cuối khóa
          </h1>
          <p className="font-display text-xl text-sc-brass sm:text-2xl">
            Lớp {showcase.class_code}
          </p>
          <Divider />
          <p className="text-sm text-sc-ink-soft">
            {showcase.course_name}
            {projects.length > 0 && ` · ${projects.length} sản phẩm`}
          </p>
          {showcase.intro && (
            <p className="mx-auto max-w-2xl rounded-2xl border border-sc-brass/25 bg-sc-raised p-4 text-left text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              {showcase.intro}
            </p>
          )}
        </header>

        {/* Ô tìm kiếm nhanh học sinh hoặc sản phẩm (giao diện tối giản, không bộ lọc rườm rà) */}
        {projects.length > 0 && (
          <div className="mt-5 max-w-md mx-auto">
            <div className="relative">
              <span
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sc-ink-soft"
                aria-hidden="true"
              >
                <Search className="size-4" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm học sinh hoặc sản phẩm..."
                aria-label="Tìm học sinh hoặc sản phẩm"
                className="w-full rounded-full border border-sc-line bg-sc-raised py-2 pr-10 pl-10 text-sm sm:text-base text-sc-ink placeholder:text-sc-ink-soft/70 focus:border-sc-brass focus:outline-none shadow-2xs transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Xóa tìm kiếm"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-sc-ink-soft hover:text-sc-ink transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Danh sách học sinh theo hàng ngang: Tên và sản phẩm nằm ngang */}
        {projects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-sc-brass/40 p-10 text-center">
            <p className="font-display text-lg">Lớp chưa có sản phẩm nào được đăng</p>
            <p className="mt-1 text-sm text-sc-ink-soft">
              Vui lòng quay lại sau ít phút nhé.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-sc-brass/40 p-8 text-center text-sm text-sc-ink-soft">
            <p>Không tìm thấy học sinh hay sản phẩm nào khớp “{query}”.</p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sc-brass/50 bg-sc-brass-soft px-4 py-1.5 text-xs font-medium text-sc-brass hover:bg-sc-brass/20 transition-colors cursor-pointer"
            >
              ✕ Xóa tìm kiếm
            </button>
          </div>
        ) : (
          <ul className="mt-6 space-y-2.5">
            {visible.map((p) => (
              <ProjectListRow
                key={p.id}
                project={p}
                rated={hasRated(myRatings[p.id])}
                isSpotlight={p.id === spotlightId}
                onOpen={() => setOpenId(p.id)}
              />
            ))}
          </ul>
        )}

        <footer className="mt-12 space-y-2 text-center">
          <Divider />
          <Eyebrow>Giáo viên chủ nhiệm</Eyebrow>
          <p className="font-script text-3xl text-sc-brass">
            {showcase.teacher_name}
          </p>
        </footer>
      </div>

      <Dialog open={current !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent
          style={{ touchAction: "pan-y" }}
          className={`${fontClass} showcase-theme flex flex-col h-[94dvh] sm:h-[90dvh] max-h-[96dvh] w-[calc(100%-1rem)] sm:w-full max-w-[calc(100%-1rem)] sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl gap-0 overflow-hidden border border-sc-line bg-sc-raised p-0 text-sc-ink ring-0`}
        >
          {current && (
            <ProjectDetail
              token={token}
              project={current}
              guestNotes={guestNotes[current.id] ?? []}
              position={openIndex + 1}
              total={visible.length}
              visitorId={visitorId}
              myRating={myRatings[current.id]}
              allowRatings={showcase.allow_ratings}
              showResults={showcase.show_rating_results}
              onPrev={() => openIndex > 0 && setOpenId(visible[openIndex - 1].id)}
              onNext={() =>
                openIndex < visible.length - 1 &&
                setOpenId(visible[openIndex + 1].id)
              }
              onRated={saveRating}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Spotlight Banner: Thông báo nổi khi có bạn đang thuyết trình */}
      {spotlightProject && openId !== spotlightProject.id && (
        <aside
          aria-label="Đang thuyết trình"
          className="fixed bottom-4 inset-x-0 z-30 mx-auto max-w-md px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <button
            type="button"
            onClick={() => setOpenId(spotlightProject.id)}
            className="pointer-events-auto w-full flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 bg-[length:200%_auto] text-white p-3.5 shadow-2xl hover:brightness-110 transition-all border border-white/25 active:scale-[0.98] text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex size-3.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex size-3.5 rounded-full bg-white shadow-xs" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-100">
                  🔴 Đang thuyết trình
                </p>
                <p className="font-display font-semibold text-sm sm:text-base truncate">
                  Em {spotlightProject.author_name}
                  <span className="font-normal text-xs text-red-100/90 ml-1.5 truncate">
                    — {spotlightProject.name}
                  </span>
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs whitespace-nowrap shadow-xs">
              Bấm để xem →
            </span>
          </button>
        </aside>
      )}
    </main>
  );
}

/**
 * Một dòng danh sách theo tên và sản phẩm nằm ngang:
 * [Avatar] [Tên học viên] — [Tên sản phẩm] [Badge thuyết trình/đã góp ý] [Xem →]
 */
function ProjectListRow({
  project,
  rated,
  isSpotlight,
  onOpen,
}: {
  project: ShowcaseProject;
  rated: boolean;
  isSpotlight?: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`group flex w-full items-center justify-between gap-3.5 rounded-2xl border bg-sc-raised p-3.5 sm:p-4 text-left transition-all cursor-pointer ${
          isSpotlight
            ? "border-red-500 ring-2 ring-red-500/30 bg-red-500/5 shadow-md"
            : "border-sc-line hover:border-sc-brass/60 hover:bg-sc-brass-soft/25 hover:shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <SealAvatar name={project.author_name} size={44} />
          <div className="flex flex-wrap sm:flex-nowrap items-baseline sm:items-center gap-x-2.5 gap-y-0.5 min-w-0 flex-1">
            <span className="font-display font-semibold text-base sm:text-lg lg:text-xl text-sc-ink shrink-0">
              {project.author_name}
            </span>
            <span className="text-sc-brass/50 font-normal hidden sm:inline" aria-hidden="true">
              —
            </span>
            <span className="text-sm sm:text-base lg:text-lg text-sc-ink-soft truncate font-normal group-hover:text-sc-ink transition-colors">
              {project.name}
            </span>
            {isSpotlight && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider animate-pulse shrink-0 ml-1">
                🔴 Đang thuyết trình
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {rated && (
            <span className="sc-stamp inline-flex items-center rounded-md border border-sc-terracotta/50 bg-sc-terracotta/10 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold tracking-wider text-sc-terracotta uppercase">
              ✓ Đã góp ý
            </span>
          )}
          <span className="text-sm sm:text-base font-semibold text-sc-brass group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            <span className="hidden sm:inline">Xem</span> →
          </span>
        </div>
      </button>
    </li>
  );
}

function ProjectDetail({
  token,
  project,
  guestNotes,
  position,
  total,
  visitorId,
  myRating,
  allowRatings,
  showResults,
  onPrev,
  onNext,
  onRated,
}: {
  token: string;
  project: ShowcaseProject;
  guestNotes: { id: string; comment: string; created_at: string }[];
  position: number;
  total: number;
  visitorId: string;
  myRating: MyRating | undefined;
  allowRatings: boolean;
  showResults: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRated: (rating: MyRating) => void;
}) {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    setActiveImgIndex(0);
  }, [project.id]);

  const totalImages = project.image_urls.length;
  const currentImage = totalImages > 0 ? project.image_urls[activeImgIndex] : null;

  // Hỗ trợ phím mũi tên bàn phím trên máy tính
  useEffect(() => {
    if (totalImages <= 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setActiveImgIndex((prev) => (prev - 1 + totalImages) % totalImages);
      } else if (e.key === "ArrowRight") {
        setActiveImgIndex((prev) => (prev + 1) % totalImages);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalImages]);

  // Hỗ trợ vuốt tay trái/phải trên màn hình điện thoại.
  // Đang zoom thì vuốt là kéo ảnh, và chụm 2 ngón là zoom — đều không được đổi ảnh.
  const handleTouchStart = (e: React.TouchEvent) => {
    if (imageZoomed || e.targetTouches.length > 1) {
      setTouchStartX(null);
      return;
    }
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (imageZoomed || e.targetTouches.length > 1) {
      setTouchStartX(null);
      return;
    }
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (imageZoomed || touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    if (distance > 45 && totalImages > 1) {
      setActiveImgIndex((prev) => (prev + 1) % totalImages);
    } else if (distance < -45 && totalImages > 1) {
      setActiveImgIndex((prev) => (prev - 1 + totalImages) % totalImages);
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-sc-line p-3.5 sm:p-5 pr-12 text-left bg-sc-raised/95 backdrop-blur-md">
        <DialogTitle className="flex items-center gap-3">
          <SealAvatar name={project.author_name} size={44} />
          <div className="min-w-0">
            <span className="block truncate font-display text-lg sm:text-2xl lg:text-3xl font-bold">
              {project.author_name}
            </span>
            <span className="block truncate text-xs sm:text-base lg:text-lg font-normal text-sc-ink-soft">
              {project.name}
            </span>
          </div>
        </DialogTitle>
        <DialogDescription className="sr-only">
          Chi tiết sản phẩm cuối khóa của em {project.author_name}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 min-h-0 scrollbar-slim space-y-4 sm:space-y-5 overflow-x-hidden overflow-y-auto p-3.5 sm:p-6 lg:p-7 text-sm sm:text-base scroll-smooth">
        {project.rating_count > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm sm:text-base text-sc-ink-soft">
              {project.rating_count} lượt đánh giá
            </span>
          </div>
        )}

        {/* 1. Phần Mô tả dự án đưa lên trước */}
        {project.description && (
          <div className="space-y-1.5">
            <Eyebrow>Mô tả dự án</Eyebrow>
            <div className="rounded-2xl border border-sc-line bg-sc-paper/60 p-3.5 sm:p-4.5 text-sm sm:text-base lg:text-lg leading-relaxed text-sc-ink">
              <p className="whitespace-pre-wrap">{project.description}</p>
            </div>
          </div>
        )}

        {/* 2. Tiêu đề Tính năng (đổi từ 'Em đã làm được') */}
        <FeatureList features={project.features} columns={2} />

        {/* 3. Tiêu đề Đường dẫn dự án (đổi từ 'Em tìm hiểu thêm') */}
        {(project.repo_url || project.demo_url || project.extra_notes) && (
          <div className="space-y-2">
            <Eyebrow>Đường dẫn dự án</Eyebrow>
            <div className="flex flex-wrap gap-2.5">
              <BigLink href={project.repo_url} label="Mã nguồn GitHub" />
              <BigLink href={project.demo_url} label="Dùng thử sản phẩm" />
              {project.extra_notes && isSafeHttpUrl(project.extra_notes) && (
                <BigLink
                  href={project.extra_notes}
                  label={
                    project.extra_notes.includes("canva")
                      ? "Slide thuyết trình Canvas"
                      : "Slide thuyết trình / Liên kết"
                  }
                />
              )}
            </div>
            {project.extra_notes && !isSafeHttpUrl(project.extra_notes) && (
              <div className="rounded-xl border border-sc-line bg-sc-paper p-3 text-sm sm:text-base text-sc-ink-soft">
                <p className="whitespace-pre-wrap">{project.extra_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* 4. Khung ảnh sản phẩm đặt DƯỚI 2 phần trên (Mô tả & Tính năng/Đường dẫn) */}
        {currentImage && (
          <div id="project-image-showcase" className="space-y-2 pt-1 scroll-mt-2">
            <div className="flex items-center justify-between">
              <Eyebrow>Hình ảnh sản phẩm</Eyebrow>
              {totalImages > 1 && (
                <span className="text-[11px] sm:text-xs text-sc-ink-soft">
                  Vuốt ◀ ▶ hoặc bấm nút để đổi ảnh
                </span>
              )}
            </div>

            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`group relative w-full ${
                totalImages > 1
                  ? "h-[calc(94dvh-230px)] min-h-[340px] max-h-[580px] sm:h-[460px] md:h-[520px] lg:h-[580px] xl:h-[620px]"
                  : "h-[calc(94dvh-175px)] min-h-[360px] max-h-[630px] sm:h-[500px] md:h-[560px] lg:h-[620px] xl:h-[660px]"
              } overflow-hidden rounded-2xl border border-sc-line bg-zinc-950 select-none shadow-md transition-all`}
            >
              {/* Nền Ambient Blur nghệ thuật */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <SafeImage
                  src={currentImage}
                  alt=""
                  className="size-full scale-125 object-cover blur-2xl opacity-40 saturate-150"
                />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs" />
              </div>

              {/* Ảnh zoom TẠI CHỖ (chạm đúp / chụm / nút +−) — không mở popup phụ */}
              <div className="relative z-1 size-full">
                <ZoomableImage
                  src={currentImage}
                  alt={`Ảnh ${activeImgIndex + 1} sản phẩm của ${project.author_name}`}
                  onZoomChange={setImageZoomed}
                />
              </div>

              {/* Badge số thứ tự ảnh */}
              {totalImages > 1 && (
                <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10">
                  <span className="rounded-full bg-black/70 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-white backdrop-blur-md border border-white/20 shadow-xs">
                    {activeImgIndex + 1} / {totalImages}
                  </span>
                </div>
              )}

              {/* Nút lùi / tiến ảnh ◀ ▶ bấm sang trái/phải xem các ảnh tiếp */}
              {totalImages > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImgIndex((prev) => (prev - 1 + totalImages) % totalImages);
                    }}
                    aria-label="Ảnh trước"
                    title="Ảnh trước"
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 flex size-9 sm:size-11 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-md border border-white/25 hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    <ChevronLeft className="size-5 sm:size-7" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImgIndex((prev) => (prev + 1) % totalImages);
                    }}
                    aria-label="Ảnh tiếp theo"
                    title="Ảnh tiếp theo"
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 flex size-9 sm:size-11 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-md border border-white/25 hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                  >
                    <ChevronRight className="size-5 sm:size-7" />
                  </button>
                </>
              )}
            </div>

            {/* Dãy thumbnail các ảnh bên dưới */}
            {totalImages > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-slim">
                {project.image_urls.map((url, idx) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    className={`relative size-14 sm:size-18 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      idx === activeImgIndex
                        ? "border-sc-brass ring-2 ring-sc-brass/40 scale-105 shadow-sm"
                        : "border-sc-line opacity-65 hover:opacity-100"
                    }`}
                  >
                    <SafeImage src={url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Điểm trung bình CHỈ hiện khi giáo viên bật */}
        {showResults && project.rating_avg && project.rating_count > 0 && (
          <div className="rounded-xl border border-sc-brass/30 bg-sc-paper p-3.5">
            <Eyebrow>Điểm trung bình · {project.rating_count} lượt chấm</Eyebrow>
            <div className="mt-2 space-y-1.5">
              {RATING_CRITERIA.map((c) => {
                const score = project.rating_avg?.[c.key];
                return (
                  <div
                    key={c.key}
                    className="flex items-center justify-between text-sm sm:text-base"
                  >
                    <span className="text-sc-ink-soft">{c.label}</span>
                    {typeof score === "number" ? (
                      <StarDisplay score={score} />
                    ) : (
                      <span className="text-xs sm:text-sm text-sc-ink-soft">chưa có</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Phần nhận xét góp ý của người xem / khách gửi cho bài làm qua link này */}
        {allowRatings ? (
          visitorId ? (
            <RatingForm
              token={token}
              projectId={project.id}
              studentName={project.author_name}
              visitorId={visitorId}
              existing={myRating}
              onSaved={onRated}
            />
          ) : (
            <p className="text-sm sm:text-base text-sc-ink-soft">Đang chuẩn bị ô chấm điểm...</p>
          )
        ) : (
          <p className="rounded-xl border border-dashed border-sc-brass/40 p-3 text-sm sm:text-base text-sc-ink-soft">
            Giáo viên đang tạm tắt phần chấm điểm.
          </p>
        )}

        {guestNotes.length > 0 && (
          <div className="space-y-3 rounded-xl border border-sc-line bg-sc-paper/40 p-4">
            <Eyebrow>Cảm nghĩ & Góp ý · {guestNotes.length}</Eyebrow>
            <div className="space-y-3.5 divide-y divide-sc-line/60">
              {guestNotes.map((n) => (
                <div key={n.id} className="pt-3 first:pt-0 text-sm sm:text-base">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-sc-ink-soft">
                    <span>{formatDateTime(n.created_at)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-sc-ink">
                    {n.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-2 border-t border-sc-line p-3 sm:p-5 bg-sc-raised/95 backdrop-blur-md">
        <button
          type="button"
          onClick={onPrev}
          disabled={position === 1}
          className="rounded-full border border-sc-line px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-base font-medium transition-colors hover:bg-sc-brass-soft disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
        >
          ← Bạn trước
        </button>
        <span className="font-display text-xs sm:text-base text-sc-ink-soft">
          {position}/{total}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={position === total}
          className="ml-auto rounded-full bg-sc-brass px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-base font-semibold text-sc-paper transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
        >
          Bạn tiếp →
        </button>
      </div>
    </>
  );
}
