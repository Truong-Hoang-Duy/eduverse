"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

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

  const needle = normalizeVi(query);

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
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên học viên hoặc sản phẩm..."
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
        <DialogContent className="scrollbar-slim max-h-[85vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
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
