"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import {
  ProjectGrid,
  type GalleryProject,
  type RosterMember,
} from "@/components/gallery/project-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeVi } from "@/lib/showcase";

export interface GalleryClass {
  id: string;
  class_code: string;
  courseCode: string;
}

const ALL = "all";

/** Danh sách sản phẩm theo từng lớp + bộ lọc theo lớp và tìm kiếm theo tên — tách khỏi Server
 *  Component vì cần state client để lọc. */
export function GalleryView({
  classes,
  projects,
  membersWithoutProject,
  currentUserId,
}: {
  classes: GalleryClass[];
  projects: GalleryProject[];
  membersWithoutProject: RosterMember[];
  currentUserId: string;
}) {
  const [classFilter, setClassFilter] = useState(ALL);
  const [query, setQuery] = useState("");

  const needle = normalizeVi(query);

  const filteredProjects = useMemo(() => {
    if (!needle) return projects;
    return projects.filter(
      (p) =>
        normalizeVi(p.authorName).includes(needle) ||
        normalizeVi(p.name).includes(needle)
    );
  }, [projects, needle]);

  const filteredMembersWithoutProject = useMemo(() => {
    if (!needle) return membersWithoutProject;
    return membersWithoutProject.filter((m) =>
      normalizeVi(m.name).includes(needle)
    );
  }, [membersWithoutProject, needle]);

  const filteredClasses =
    classFilter === ALL ? classes : classes.filter((c) => c.id === classFilter);

  const currentClassStudents = useMemo(() => {
    if (classFilter === ALL) return [];
    const list: string[] = [];
    const seen = new Set<string>();
    for (const p of projects.filter((p) => p.classId === classFilter)) {
      if (!seen.has(p.authorName)) {
        seen.add(p.authorName);
        list.push(p.authorName);
      }
    }
    for (const m of membersWithoutProject.filter((m) => m.key.startsWith(`${classFilter}:`))) {
      if (!seen.has(m.name)) {
        seen.add(m.name);
        list.push(m.name);
      }
    }
    return list.sort((a, b) => a.localeCompare(b, "vi"));
  }, [classFilter, projects, membersWithoutProject]);

  const totalMatches =
    filteredProjects.length + filteredMembersWithoutProject.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên học viên, sản phẩm..."
            aria-label="Tìm theo tên học viên hoặc sản phẩm"
            className="h-9 pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xóa tìm kiếm"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger size="sm" className="w-[180px]" aria-label="Lọc theo lớp">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả lớp</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.class_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {currentClassStudents.length > 0 && (
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
            onClick={() => setQuery("")}
            className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
              !query
                ? "bg-primary font-medium text-primary-foreground shadow-xs"
                : "border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            Tất cả ({currentClassStudents.length})
          </button>
          {currentClassStudents.map((name) => {
            const isSelected = needle === normalizeVi(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setQuery("");
                  } else {
                    setQuery(name);
                  }
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
                  isSelected
                    ? "bg-primary font-medium text-primary-foreground shadow-xs"
                    : "border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {query && (
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

      {query && totalMatches === 0 ? (
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
        filteredClasses.map((c) => {
          const classProjects = filteredProjects.filter((p) => p.classId === c.id);
          const classMembersWithoutProject = filteredMembersWithoutProject.filter((m) =>
            m.key.startsWith(`${c.id}:`)
          );

          // Khi đang tìm kiếm mà lớp này không có em nào khớp thì ẩn lớp đó
          if (query && classProjects.length === 0 && classMembersWithoutProject.length === 0) {
            return null;
          }

          return (
            <section key={c.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-md px-2.5 py-1 font-mono text-xs">
                  {c.class_code}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {c.courseCode} · {classProjects.length} sản phẩm
                  {classMembersWithoutProject.length > 0 &&
                    ` · ${classMembersWithoutProject.length} chưa khai báo`}
                </span>
              </div>
              {classProjects.length === 0 && classMembersWithoutProject.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Lớp này chưa có học viên hoặc chưa có em nào khai báo sản phẩm.
                </p>
              ) : (
                <ProjectGrid
                  projects={classProjects}
                  membersWithoutProject={classMembersWithoutProject}
                  currentUserId={currentUserId}
                  commentPlaceholder="Viết nhận xét cho em..."
                  searchable={false}
                />
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
