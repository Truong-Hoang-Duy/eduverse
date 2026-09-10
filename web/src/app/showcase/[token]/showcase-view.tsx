"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  loadMyShowcaseRatings,
  trackShowcaseView,
} from "@/lib/actions/showcase-public";
import { usePreventZoomWhenOpen } from "@/lib/use-prevent-zoom";
import {
  RATING_CRITERIA,
  SHOWCASE_LAYOUTS,
  SHOWCASE_SORTS,
  arrangeShowcaseProjects,
  hasRated,
  normalizeVi,
  overallScore,
  type MyRating,
  type ShowcaseLayout,
  type ShowcasePayload,
  type ShowcaseProject,
  type ShowcaseSort,
} from "@/lib/showcase";

import { RatingForm } from "./rating-form";
import { StarDisplay } from "./star-rating";
import { ThemeSwitch } from "./theme-switch";

/**
 * Trang phụ huynh xem sản phẩm cuối khóa — concept "Bảng vàng": giấy khen gặp
 * bảng tin lớp học. Motif xuyên suốt là TRIỆN TỐT NGHIỆP (xem `emblem.tsx`),
 * dùng ở ba cỡ: crest đầu trang, vòng quanh avatar, con dấu "đã nhận xét".
 *
 * Thiết kế cho ĐIỆN THOẠI trước: phụ huynh quét QR trên TV rồi xem trên máy
 * mình, giữa buổi lễ, một tay cầm điện thoại. Vì vậy chỉ có MỘT lưới thẻ, bấm
 * vào một bạn là mở popup toàn bộ thông tin của bạn đó — không thanh tab, không
 * menu nhiều tầng (user chốt 2026-08-29).
 *
 * Mọi thứ nhận diện người xem (id ngẫu nhiên cho tim và cho bài chấm, cờ "đã
 * đếm lượt xem") nằm trong localStorage của chính máy đó — KHÔNG có tài khoản,
 * không tên, không theo dõi ai.
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
    // Trình duyệt chặn localStorage (chế độ ẩn danh chẳng hạn): vẫn chấm được,
    // chỉ là mở lại trang thì không nhớ mình đã chấm những em nào.
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
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.18em] text-sc-brass uppercase">
      {children}
    </p>
  );
}

function BigLink({ href, label }: { href: string | null; label: string }) {
  // Link do học viên dán → luôn kiểm ở chỗ render, không tin dữ liệu trong DB.
  if (!href || !isSafeHttpUrl(href)) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full border border-sc-brass/50 px-4 py-2 text-sm font-medium text-sc-brass transition-colors hover:bg-sc-brass-soft"
    >
      {label} ↗
    </a>
  );
}


/** Danh sách chức năng dạng THÀNH TÍCH có dấu tick, không phải hàng tag rời rạc. */
function FeatureList({
  features,
  limit,
  columns = 1,
}: {
  features: string[];
  /** Cắt bớt trên thẻ nhỏ; bỏ trống = hiện hết (trong popup). */
  limit?: number;
  columns?: 1 | 2;
}) {
  if (features.length === 0) return null;
  const shown = limit ? features.slice(0, limit) : features;
  const rest = features.length - shown.length;

  return (
    <div>
      <Eyebrow>Em đã làm được</Eyebrow>
      <ul
        className={`mt-1.5 gap-x-4 gap-y-1 ${columns === 2 ? "sm:columns-2" : ""}`}
      >
        {shown.map((f) => (
          <li key={f} className="flex items-start gap-2 py-0.5 text-sm break-inside-avoid">
            <CheckMark className="mt-1 size-3.5 shrink-0 text-sc-brass" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <p className="mt-1 text-xs text-sc-ink-soft">+{rest} chức năng nữa</p>
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
  /**
   * Class biến font của khu triển lãm. Phải truyền tay xuống popup: Radix
   * portal nó ra thẳng `<body>`, nằm ngoài cây DOM của layout nên không thừa kế
   * được `--font-playfair`.
   */
  fontClass: string;
}) {
  const projects = showcase.projects;

  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ShowcaseLayout>("grid");
  const [sort, setSort] = useState<ShowcaseSort>("name");
  const [onlyUnrated, setOnlyUnrated] = useState(false);
  const [slide, setSlide] = useState(0);
  const [myRatings, setMyRatings] = useState<Record<string, MyRating>>({});
  const [guestNotes, setGuestNotes] = useState(() =>
    Object.fromEntries(projects.map((p) => [p.id, p.guest_notes]))
  );
  const [visitorId, setVisitorId] = useState("");

  usePreventZoomWhenOpen(openId !== null);

  const students = useMemo(() => {
    return [...projects]
      .map((p) => ({
        id: p.id,
        name: p.author_name,
        projectName: p.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [projects]);

  const dropdownStudents = useMemo(() => {
    const needle = normalizeVi(query);
    if (!needle) return students;
    return students.filter(
      (s) =>
        normalizeVi(s.name).includes(needle) ||
        normalizeVi(s.projectName).includes(needle)
    );
  }, [students, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const id = readVisitorId();
    setVisitorId(id);

    // Bài chấm cũ của chính máy này — mở lại trang vẫn thấy mình đã chấm những
    // em nào và sửa được. Đọc theo `visitorId` nên không ai thấy của người khác.
    void loadMyShowcaseRatings(token, id).then((rows) => {
      setMyRatings(Object.fromEntries(rows.map((r) => [r.project_id, r])));
    });

    // Đếm MỘT lần cho mỗi trình duyệt: mỗi lần F5 cộng thêm một thì con số giáo
    // viên nhìn thấy chẳng nói lên điều gì.
    const key = `eduverse.showcase.viewed.${token}`;
    try {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
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

  // Thứ tự phụ huynh đang NHÌN THẤY — mọi thao tác chuyển bạn (popup, trình
  // chiếu) đều bám theo danh sách này, không bám danh sách gốc; nếu không thì
  // vừa sắp xếp xong bấm "Bạn tiếp" lại nhảy sang một bạn ở tận đâu.
  const visible = useMemo(
    () =>
      arrangeShowcaseProjects(projects, {
        query,
        sort,
        onlyUnrated,
        ratedIds,
      }),
    [projects, query, sort, onlyUnrated, ratedIds]
  );

  const openIndex = visible.findIndex((p) => p.id === openId);
  const current = openIndex >= 0 ? visible[openIndex] : null;

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      // Máy tính (giáo viên chiếu, hoặc phụ huynh xem lại ở nhà) dùng được phím
      // mũi tên; điện thoại đã có hai nút to ở cuối popup.
      if (e.key === "ArrowRight" && openIndex < visible.length - 1) {
        setOpenId(visible[openIndex + 1].id);
      }
      if (e.key === "ArrowLeft" && openIndex > 0) {
        setOpenId(visible[openIndex - 1].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, openIndex, visible]);

  const saveRating = useCallback((rating: MyRating) => {
    setMyRatings((prev) => ({ ...prev, [rating.project_id]: rating }));
    // Nhận xét ẩn danh hiện ngay cho chính người vừa gửi thấy, khỏi phải F5.
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

  const ratedCount = ratedIds.length;

  // Lọc/sắp xếp làm danh sách ngắn lại — kẹp lại để không trỏ ra ngoài mảng.
  const slideIndex = Math.min(slide, Math.max(visible.length - 1, 0));
  const slideProject = visible[slideIndex];

  return (
    <main className="pb-16">
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
          <Eyebrow>Lễ tổng kết khóa học</Eyebrow>
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
            <p className="mx-auto max-w-2xl rounded-2xl border border-sc-brass/25 bg-sc-raised p-4 text-left text-sm leading-relaxed whitespace-pre-wrap">
              {showcase.intro}
            </p>
          )}
        </header>

        {/* Thanh tiến độ: phụ huynh biết còn bạn nào mình chưa nhận xét. */}
        {showcase.allow_ratings && projects.length > 0 && (
          <div className="mt-6 rounded-2xl border border-sc-line bg-sc-raised p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm">
                Bạn đã nhận xét{" "}
                <span className="font-display text-lg font-semibold text-sc-brass">
                  {ratedCount}/{projects.length}
                </span>{" "}
                bạn
              </p>
              <p className="text-xs text-sc-ink-soft">
                Bấm vào từng bạn để xem và chấm điểm
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sc-line">
              <div
                className="h-full rounded-full bg-sc-brass transition-all"
                style={{
                  width: `${projects.length ? (ratedCount / projects.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Tìm kiếm hoặc chọn học viên */}
        {projects.length > 0 && (
          <div className="mt-4 space-y-2">
            <div ref={searchContainerRef} className="relative">
              <span
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sc-ink-soft"
                aria-hidden="true"
              >
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </span>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Nhập hoặc chọn học sinh / sản phẩm..."
                aria-label="Tìm hoặc chọn học sinh"
                className="w-full rounded-full border border-sc-line bg-sc-raised py-2.5 pr-16 pl-10 text-sm text-sc-ink placeholder:text-sc-ink-soft/70 focus:border-sc-brass focus:outline-none"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setIsDropdownOpen(false);
                    }}
                    aria-label="Xóa tìm kiếm"
                    className="p-1 text-sc-ink-soft hover:text-sc-ink transition-colors"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((v) => !v)}
                  aria-label="Danh sách học viên"
                  aria-expanded={isDropdownOpen}
                  className="p-1 text-sc-ink-soft hover:text-sc-ink transition-colors"
                >
                  <svg
                    className={`size-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {/* Menu dropdown chọn học viên */}
              {isDropdownOpen && (
                <div className="absolute z-20 mt-1.5 w-full rounded-2xl border border-sc-line bg-sc-raised p-1.5 shadow-lg max-h-60 overflow-y-auto">
                  <div
                    onClick={() => {
                      setQuery("");
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm cursor-pointer transition-colors ${!query
                        ? "bg-sc-brass-soft font-semibold text-sc-brass"
                        : "text-sc-ink hover:bg-sc-brass-soft/50"
                      }`}
                  >
                    <span>Tất cả học viên ({students.length})</span>
                    {!query && <span className="text-xs text-sc-brass">✓</span>}
                  </div>
                  <div className="my-1 border-t border-sc-line" />
                  {dropdownStudents.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-sc-ink-soft text-center">
                      Không có học sinh nào khớp
                    </p>
                  ) : (
                    dropdownStudents.map((s) => {
                      const isSelected = normalizeVi(query) === normalizeVi(s.name);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setQuery(s.name);
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm cursor-pointer transition-colors ${isSelected
                              ? "bg-sc-brass-soft font-semibold text-sc-brass"
                              : "text-sc-ink hover:bg-sc-brass-soft/50"
                            }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-medium truncate">{s.name}</p>
                            <p className="text-xs text-sc-ink-soft truncate">{s.projectName}</p>
                          </div>
                          {isSelected && <span className="text-xs text-sc-brass shrink-0">✓</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Hàng nút bấm chọn nhanh học sinh trong lớp */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
              role="tablist"
              aria-label="Chọn nhanh học viên"
            >
              <span className="shrink-0 text-xs font-medium text-sc-ink-soft">
                Chọn em:
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setIsDropdownOpen(false);
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${!query
                    ? "bg-sc-brass font-semibold text-sc-paper shadow-xs"
                    : "border border-sc-line bg-sc-raised text-sc-ink hover:border-sc-brass/50 hover:bg-sc-brass-soft"
                  }`}
              >
                Tất cả ({students.length})
              </button>
              {students.map((s) => {
                const isSelected = normalizeVi(query) === normalizeVi(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setQuery("");
                      } else {
                        setQuery(s.name);
                      }
                      setIsDropdownOpen(false);
                    }}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${isSelected
                        ? "bg-sc-brass font-semibold text-sc-paper shadow-xs"
                        : "border border-sc-line bg-sc-raised text-sc-ink hover:border-sc-brass/50 hover:bg-sc-brass-soft"
                      }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chế độ xem + sắp xếp. Lớp 1-2 bạn thì mấy thứ này chỉ tổ rối. */}
        {projects.length > 2 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Chế độ xem"
              className="flex rounded-full border border-sc-line bg-sc-raised p-0.5"
            >
              {SHOWCASE_LAYOUTS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLayout(opt.value)}
                  aria-pressed={layout === opt.value}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${layout === opt.value
                      ? "bg-sc-brass-soft font-medium text-sc-brass"
                      : "text-sc-ink-soft hover:text-sc-ink"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ShowcaseSort)}
              aria-label="Sắp xếp"
              className="rounded-full border border-sc-line bg-sc-raised px-3 py-1.5 text-sm text-sc-ink focus:border-sc-brass focus:outline-none"
            >
              {SHOWCASE_SORTS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {showcase.allow_ratings && (
              <button
                type="button"
                onClick={() => setOnlyUnrated((v) => !v)}
                aria-pressed={onlyUnrated}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${onlyUnrated
                    ? "border-sc-brass bg-sc-brass-soft font-medium text-sc-brass"
                    : "border-sc-line bg-sc-raised text-sc-ink-soft hover:text-sc-ink"
                  }`}
              >
                Chưa nhận xét
              </button>
            )}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-sc-brass/40 p-10 text-center">
            <p className="font-display text-lg">Lớp chưa có sản phẩm nào được đăng</p>
            <p className="mt-1 text-sm text-sc-ink-soft">
              Quý phụ huynh vui lòng quay lại sau ít phút nhé.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-sc-brass/40 p-8 text-center text-sm text-sc-ink-soft">
            <p>
              {query
                ? `Không tìm thấy bạn nào khớp “${query}”.`
                : "Bạn đã nhận xét hết cả lớp rồi — bỏ lọc “Chưa nhận xét” để xem lại."}
            </p>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sc-brass/50 bg-sc-brass-soft px-4 py-1.5 text-xs font-medium text-sc-brass hover:bg-sc-brass/20 transition-colors"
              >
                ✕ Xóa tìm kiếm
              </button>
            )}
          </div>
        ) : layout === "list" ? (
          <ul className="mt-6 space-y-2">
            {visible.map((p) => (
              <ProjectListRow
                key={p.id}
                project={p}
                rated={hasRated(myRatings[p.id])}
                onOpen={() => setOpenId(p.id)}
              />
            ))}
          </ul>
        ) : layout === "slideshow" && slideProject ? (
          <div className="mt-6 space-y-4">
            <div className="mx-auto max-w-md">
              <ProjectCardTile
                project={slideProject}
                rated={hasRated(myRatings[slideProject.id])}
                showResults={showcase.show_rating_results}
                onOpen={() => setOpenId(slideProject.id)}
              />
            </div>
            <div className="flex items-center justify-center gap-3">
              <SlideNavButton
                onClick={() => setSlide(Math.max(slideIndex - 1, 0))}
                disabled={slideIndex === 0}
              >
                ← Bạn trước
              </SlideNavButton>
              <span className="font-display text-lg text-sc-brass">
                {slideIndex + 1}/{visible.length}
              </span>
              <SlideNavButton
                onClick={() =>
                  setSlide(Math.min(slideIndex + 1, visible.length - 1))
                }
                disabled={slideIndex >= visible.length - 1}
              >
                Bạn tiếp →
              </SlideNavButton>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p) => (
              <ProjectCardTile
                key={p.id}
                project={p}
                rated={hasRated(myRatings[p.id])}
                showResults={showcase.show_rating_results}
                onOpen={() => setOpenId(p.id)}
              />
            ))}
          </div>
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
        {/* `showcase-theme` + font phải gắn lại ở đây: popup được portal ra ngoài
            cây DOM của layout nên không thừa kế biến nào.
            Trên điện thoại: gần như toàn màn hình. Chỉ THÂN popup cuộn — tên em
            luôn thấy ở đầu, hai nút chuyển bạn luôn thấy ở chân. */}
        <DialogContent
          style={{ touchAction: "pan-y" }}
          className={`${fontClass} showcase-theme grid max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border border-sc-line bg-sc-raised p-0 text-sc-ink ring-0 sm:max-w-2xl`}
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
    </main>
  );
}

function SlideNavButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-sc-brass/45 px-4 py-2 text-sm font-medium text-sc-brass transition-colors hover:bg-sc-brass-soft disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/**
 * Một dòng trong chế độ "Danh sách" — cùng dữ liệu nhận diện với thẻ lưới
 * (avatar triện + tên + tên dự án + dấu đã nhận xét) nhưng bỏ ảnh và danh sách
 * chức năng, để lớp đông thì lướt hết cả lớp trong một màn điện thoại.
 *
 * Không có nút tim ở đây: dòng gọn thì mọi thứ sát nhau, bấm nhầm tim khi định
 * mở chi tiết là chuyện chắc chắn xảy ra — tim vẫn bấm được trong popup.
 */
function ProjectListRow({
  project,
  rated,
  onOpen,
}: {
  project: ShowcaseProject;
  rated: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl border border-sc-line bg-sc-raised p-2.5 text-left transition-colors hover:border-sc-brass/50"
      >
        <SealAvatar name={project.author_name} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-base font-semibold">
            {project.author_name}
          </span>
          <span className="block truncate text-sm text-sc-ink-soft">
            {project.name}
          </span>
        </span>
        {rated && <CheckMark className="size-5 shrink-0 text-sc-terracotta" />}
        <span className="shrink-0 text-sm text-sc-brass">→</span>
      </button>
    </li>
  );
}

function ProjectCardTile({
  project,
  rated,
  showResults,
  onOpen,
}: {
  project: ShowcaseProject;
  rated: boolean;
  showResults: boolean;
  onOpen: () => void;
}) {
  const average = showResults ? overallScore(project.rating_avg) : null;

  return (
    /* Viền kép `.sc-rule` vẽ bằng inset shadow nên nội dung phải chừa lề ≥ 5px —
       `p-3` lo việc đó, và cũng tạo cảm giác ảnh được DÁN LÊN tấm thẻ. */
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="sc-rule cursor-pointer rounded-2xl bg-sc-raised p-3 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_color-mix(in_oklab,var(--sc-brass)_30%,transparent)]"
    >
      {project.image_urls.length > 0 && (
        <div className="relative mb-3">
          <SafeImage
            src={project.image_urls[0]}
            alt={`Ảnh sản phẩm của ${project.author_name}`}
            className="h-40 w-full rounded-lg bg-sc-paper object-cover"
          />
          {/* Băng dán góc — chi tiết "bảng tin lớp học". */}
          <span className="sc-tape absolute -top-1.5 left-5 h-4 w-14 rounded-[2px]" />
        </div>
      )}

      <div className="space-y-3 px-1 pb-1">
        <div className="flex items-center gap-3">
          <SealAvatar name={project.author_name} size={46} />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold">
              {project.author_name}
            </p>
            <p className="truncate text-sm text-sc-ink-soft">{project.name}</p>
          </div>
        </div>

        <FeatureList features={project.features} limit={3} />

        <div className="flex flex-wrap items-center gap-2 border-t border-sc-line pt-3">
          {rated && (
            <span className="sc-stamp inline-flex rounded-md border-2 border-sc-terracotta/60 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-sc-terracotta uppercase">
              Đã nhận xét
            </span>
          )}
          {average !== null && <StarDisplay score={average} />}
          <span className="ml-auto text-sm font-medium text-sc-brass">Xem →</span>
        </div>
      </div>
    </div>
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
  return (
    <>
      <DialogHeader className="border-b border-sc-line p-4 pr-12 text-left">
        <DialogTitle className="flex items-center gap-3">
          <SealAvatar name={project.author_name} size={44} />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold">
              {project.author_name}
            </span>
            <span className="block truncate text-sm font-normal text-sc-ink-soft">
              {project.name}
            </span>
          </span>
        </DialogTitle>
        <DialogDescription className="sr-only">
          Chi tiết sản phẩm cuối khóa của em {project.author_name}
        </DialogDescription>
      </DialogHeader>

      <div className="scrollbar-slim space-y-4 overflow-x-hidden overflow-y-auto p-4">
        {project.rating_count > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-sc-ink-soft">
              {project.rating_count} phụ huynh đã chấm điểm
            </span>
          </div>
        )}

        {project.image_urls.length > 0 && (
          /* Một ảnh thì trải hết bề ngang; nhiều ảnh mới chia 2 cột. Chặn chiều
             cao để ảnh dọc không đẩy hết phần còn lại xuống dưới màn hình. */
          <div
            className={
              project.image_urls.length > 1
                ? "grid gap-3 sm:grid-cols-2"
                : undefined
            }
          >
            {project.image_urls.map((url, i) => (
              <SafeImage
                key={url}
                src={url}
                alt={`Ảnh ${i + 1} sản phẩm của ${project.author_name}`}
                className="max-h-[45vh] w-full rounded-xl border border-sc-line bg-sc-paper object-contain"
              />
            ))}
          </div>
        )}

        {project.description && (
          <p className="leading-relaxed whitespace-pre-wrap">{project.description}</p>
        )}

        <FeatureList features={project.features} columns={2} />

        {(project.repo_url || project.demo_url) && (
          <div className="flex flex-wrap gap-2">
            <BigLink href={project.repo_url} label="Mã nguồn GitHub" />
            <BigLink href={project.demo_url} label="Dùng thử sản phẩm" />
          </div>
        )}

        {project.extra_notes && (
          <div className="rounded-xl border border-sc-line bg-sc-paper p-3">
            <Eyebrow>Em tìm hiểu thêm</Eyebrow>
            <p className="mt-1 text-sm whitespace-pre-wrap text-sc-ink-soft">
              {project.extra_notes}
            </p>
          </div>
        )}

        {/* Điểm trung bình CHỈ hiện khi giáo viên bật — mặc định tắt để trang
            không thành bảng xếp hạng trẻ con giữa buổi lễ. */}
        {showResults && project.rating_avg && project.rating_count > 0 && (
          <div className="rounded-xl border border-sc-brass/30 bg-sc-paper p-3">
            <Eyebrow>Điểm trung bình · {project.rating_count} lượt chấm</Eyebrow>
            <div className="mt-2 space-y-1">
              {RATING_CRITERIA.map((c) => {
                const score = project.rating_avg?.[c.key];
                return (
                  <div
                    key={c.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-sc-ink-soft">{c.label}</span>
                    {typeof score === "number" ? (
                      <StarDisplay score={score} />
                    ) : (
                      <span className="text-xs text-sc-ink-soft">chưa có</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
            <p className="text-sm text-sc-ink-soft">Đang chuẩn bị ô chấm điểm...</p>
          )
        ) : (
          <p className="rounded-xl border border-dashed border-sc-brass/40 p-3 text-sm text-sc-ink-soft">
            Giáo viên đang tạm tắt phần chấm điểm.
          </p>
        )}

        {guestNotes.length > 0 && (
          <div className="space-y-2 rounded-xl border border-sc-line p-3">
            <Eyebrow>Nhận xét của phụ huynh · {guestNotes.length}</Eyebrow>
            {guestNotes.map((n) => (
              <blockquote
                key={n.id}
                className="border-l-2 border-sc-brass/40 pl-3 text-sm"
              >
                <p className="whitespace-pre-wrap">{n.comment}</p>
                <footer className="mt-0.5 text-xs text-sc-ink-soft">
                  Phụ huynh ẩn danh · {formatDateTime(n.created_at)}
                </footer>
              </blockquote>
            ))}
          </div>
        )}

        {project.comments.length > 0 && (
          <div className="space-y-2 rounded-xl border border-sc-line p-3">
            <Eyebrow>Các bạn cùng lớp nhận xét · {project.comments.length}</Eyebrow>
            {project.comments.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium">{c.author_name}</span>{" "}
                <span className="text-xs text-sc-ink-soft">
                  {formatDateTime(c.created_at)}
                </span>
                <p className="whitespace-pre-wrap text-sc-ink-soft">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-sc-line p-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={position === 1}
          className="rounded-full border border-sc-line px-4 py-2 text-sm font-medium transition-colors hover:bg-sc-brass-soft disabled:opacity-40 disabled:hover:bg-transparent"
        >
          ← Bạn trước
        </button>
        <span className="font-display text-sm text-sc-ink-soft">
          {position}/{total}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={position === total}
          className="ml-auto rounded-full bg-sc-brass px-4 py-2 text-sm font-semibold text-sc-paper transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Bạn tiếp →
        </button>
      </div>
    </>
  );
}
