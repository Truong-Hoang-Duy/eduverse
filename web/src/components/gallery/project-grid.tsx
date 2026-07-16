"use client";

import { useState } from "react";

import { ProjectCard, type ProjectView } from "@/components/project-card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CommentSection, type CommentItem } from "./comment-section";

export interface GalleryProject extends ProjectView {
  classId: string;
  classCode: string;
  comments: CommentItem[];
  isMine: boolean;
}

export function ProjectGrid({
  projects,
  currentUserId,
  canModerate = false,
  commentPlaceholder,
}: {
  projects: GalleryProject[];
  currentUserId: string;
  /** GV: xóa được nhận xét bất kỳ trong lớp mình. */
  canModerate?: boolean;
  commentPlaceholder?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = projects.find((p) => p.id === openId) ?? null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
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
      </div>

      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {selected.authorName} · Lớp {selected.classCode}
                </DialogDescription>
              </DialogHeader>

              <ProjectCard project={selected} />

              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">
                  💬 Nhận xét ({selected.comments.length})
                </p>
                <CommentSection
                  projectId={selected.id}
                  comments={selected.comments}
                  currentUserId={currentUserId}
                  canModerate={canModerate}
                  placeholder={commentPlaceholder}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
