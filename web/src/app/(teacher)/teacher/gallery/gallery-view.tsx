"use client";

import { useState } from "react";

import {
  ProjectGrid,
  type GalleryProject,
  type RosterMember,
} from "@/components/gallery/project-grid";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface GalleryClass {
  id: string;
  class_code: string;
  courseCode: string;
}

const ALL = "all";

/** Danh sách sản phẩm theo từng lớp + bộ lọc theo lớp — tách khỏi Server
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

  const filteredClasses =
    classFilter === ALL ? classes : classes.filter((c) => c.id === classFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
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

      {filteredClasses.map((c) => {
        const classProjects = projects.filter((p) => p.classId === c.id);
        const classMembersWithoutProject = membersWithoutProject.filter((m) =>
          m.key.startsWith(`${c.id}:`)
        );
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
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
