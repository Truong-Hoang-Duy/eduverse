"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

import { ProjectCard, type ProjectView } from "@/components/project-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizeVi } from "@/lib/showcase";
import { usePreventZoomWhenOpen } from "@/lib/use-prevent-zoom";

import { CommentSection, type CommentItem } from "./comment-section";

export interface GalleryProject extends ProjectView {
  classId: string;
  classCode: string;
  comments: CommentItem[];
  isMine: boolean;
}

export interface RosterMember {
  /** Ổn định giữa các lớp: `${classId}:${studentId}`. */
  key: string;
  name: string;
  classCode: string;
  isMine: boolean;
}

export function ProjectGrid({
  projects,
  membersWithoutProject = [],
  currentUserId,
  commentPlaceholder,
  searchable = true,
}: {
  projects: GalleryProject[];
  /** Bạn cùng lớp CHƯA có sản phẩm — hiện thẻ mờ cuối lưới. */
  membersWithoutProject?: RosterMember[];
  currentUserId: string;
  commentPlaceholder?: string;
  searchable?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  usePreventZoomWhenOpen(openId !== null);

  const needle = normalizeVi(query);

  const studentList = useMemo(() => {
    const list: { id: string; name: string; projectName?: string }[] = [];
    const seen = new Set<string>();

    for (const p of projects) {
      if (!seen.has(p.authorName)) {
        seen.add(p.authorName);
        list.push({ id: p.id, name: p.authorName, projectName: p.name });
      }
    }
    for (const m of membersWithoutProject) {
      if (!seen.has(m.name)) {
        seen.add(m.name);
        list.push({ id: m.key, name: m.name });
      }
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [projects, membersWithoutProject]);

  const dropdownStudents = useMemo(() => {
    if (!needle) return studentList;
    return studentList.filter(
      (s) =>
        normalizeVi(s.name).includes(needle) ||
        (s.projectName && normalizeVi(s.projectName).includes(needle))
    );
  }, [studentList, needle]);

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

  const filteredProjects = useMemo(() => {
    if (!searchable || !needle) return projects;
    return projects.filter(
      (p) =>
        normalizeVi(p.authorName).includes(needle) ||
        normalizeVi(p.name).includes(needle)
    );
  }, [projects, needle, searchable]);

  const filteredMembersWithoutProject = useMemo(() => {
    if (!searchable || !needle) return membersWithoutProject;
    return membersWithoutProject.filter((m) =>
      normalizeVi(m.name).includes(needle)
    );
  }, [membersWithoutProject, needle, searchable]);

  const selected = projects.find((p) => p.id === openId) ?? null;
  const hasTotal = projects.length > 0 || membersWithoutProject.length > 0;
  const hasMatches = filteredProjects.length > 0 || filteredMembersWithoutProject.length > 0;

  return (
    <div className="space-y-4">
      {searchable && hasTotal && (
        <div className="space-y-2">
          <div ref={searchContainerRef} className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Nhập hoặc chọn học viên / sản phẩm..."
              aria-label="Tìm hoặc chọn học viên"
              className="h-9 pl-9 pr-16 text-base sm:text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setIsDropdownOpen(false);
                  }}
                  aria-label="Xóa tìm kiếm"
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDropdownOpen((v) => !v)}
                aria-label="Danh sách học viên"
                aria-expanded={isDropdownOpen}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* Menu dropdown chọn học viên */}
            {isDropdownOpen && (
              <div className="absolute z-20 mt-1.5 w-full rounded-xl border bg-popover text-popover-foreground p-1 shadow-md max-h-60 overflow-y-auto">
                <div
                  onClick={() => {
                    setQuery("");
                    setIsDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                    !query
                      ? "bg-accent font-medium text-accent-foreground"
                      : "hover:bg-accent/60"
                  }`}
                >
                  <span>Tất cả học viên ({studentList.length})</span>
                  {!query && <span className="text-xs text-primary">✓</span>}
                </div>
                <div className="my-1 border-t" />
                {dropdownStudents.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground text-center">
                    Không có học sinh nào khớp
                  </p>
                ) : (
                  dropdownStudents.map((s) => {
                    const isSelected = needle === normalizeVi(s.name);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setQuery(s.name);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-accent font-medium text-accent-foreground"
                            : "hover:bg-accent/60"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-medium truncate">{s.name}</p>
                          {s.projectName && (
                            <p className="text-xs text-muted-foreground truncate">{s.projectName}</p>
                          )}
                        </div>
                        {isSelected && <span className="text-xs text-primary shrink-0">✓</span>}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Hàng nút bấm chọn nhanh học sinh trong lớp */}
          {studentList.length > 0 && (
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
              role="tablist"
              aria-label="Chọn nhanh học viên"
            >
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                Chọn em:
              </span>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setIsDropdownOpen(false);
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                  !query
                    ? "bg-primary font-medium text-primary-foreground shadow-xs"
                    : "border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                Tất cả ({studentList.length})
              </button>
              {studentList.map((s) => {
                const isSelected = needle === normalizeVi(s.name);
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
                    className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                      isSelected
                        ? "bg-primary font-medium text-primary-foreground shadow-xs"
                        : "border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {searchable && query && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Tìm thấy {filteredProjects.length} sản phẩm
            {filteredMembersWithoutProject.length > 0 &&
              ` (${filteredMembersWithoutProject.length} bạn chưa khai báo)`}
          </span>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-primary hover:underline"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {!hasMatches ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Không tìm thấy kết quả nào</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Không có học viên hay sản phẩm nào khớp với từ khóa &ldquo;{query}&rdquo;.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuery("")}
            className="mt-3"
          >
            Xóa tìm kiếm
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setOpenId(project.id)}
              className="group rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {project.authorName.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {project.authorName}
                    {project.isMine && (
                      <span className="ml-1 text-xs text-muted-foreground">(bạn)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lớp {project.classCode}
                  </p>
                </div>
              </div>

              <p className="mt-3 truncate text-sm font-medium">{project.name}</p>
              {project.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {project.description}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="rounded-md font-normal">
                  {project.features.length} chức năng
                </Badge>
                <span>💬 {project.comments.length}</span>
                <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                  Xem chi tiết →
                </span>
              </div>
            </button>
          ))}

          {filteredMembersWithoutProject.map((member) => (
            <div
              key={member.key}
              className="rounded-xl border border-dashed bg-muted/30 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {member.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-muted-foreground">
                    {member.name}
                    {member.isMine && (
                      <span className="ml-1 text-xs">(bạn)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Lớp {member.classCode}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {member.isMine
                  ? "Bạn chưa khai báo sản phẩm — vào tab \"Sản phẩm\" nhé!"
                  : "Chưa có sản phẩm"}
              </p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent
          style={{ touchAction: "pan-y" }}
          className="scrollbar-slim max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl"
        >
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {selected.authorName} · Lớp {selected.classCode}
                  {selected.updatedAt &&
                    ` · Cập nhật ${new Date(selected.updatedAt).toLocaleDateString("vi-VN")}`}
                </DialogDescription>
              </DialogHeader>

              <ProjectCard project={selected} hideHeading />

              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">
                  💬 Nhận xét ({selected.comments.length})
                </p>
                <CommentSection
                  projectId={selected.id}
                  comments={selected.comments}
                  currentUserId={currentUserId}
                  placeholder={commentPlaceholder}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
