import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

import type { CommentItem } from "@/components/gallery/comment-section";
import {
  ProjectGrid,
  type GalleryProject,
  type RosterMember,
} from "@/components/gallery/project-grid";

export const metadata = { title: "Sản phẩm của lớp — Eduverse" };

interface ProjectRow {
  id: string;
  class_id: string;
  student_id: string;
  name: string;
  description: string | null;
  features: string[];
  repo_url: string | null;
  drive_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
  updated_at: string;
  profiles: { full_name: string } | null;
}

interface CommentRow {
  id: string;
  project_id: string;
  content: string;
  author_id: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

export default async function GalleryPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  // Toàn bộ ghi danh mà RLS cho thấy: dòng của mình + bạn cùng lớp
  // (policy `enrollments_classmates_select`) — vừa suy ra lớp mình học,
  // vừa có roster để hiện cả bạn CHƯA có sản phẩm.
  const { data: enrollmentsData } = await supabase
    .from("enrollments")
    .select("class_id, student_id, classes(class_code), profiles(full_name)");
  const enrollments = (enrollmentsData ?? []) as unknown as {
    class_id: string;
    student_id: string;
    classes: { class_code: string } | null;
    profiles: { full_name: string } | null;
  }[];
  const classCodeById = new Map(
    enrollments
      .filter((e) => e.student_id === profile.id)
      .map((e) => [e.class_id, e.classes?.class_code ?? ""])
  );

  const [{ data: projectsData }, { data: commentsData }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, class_id, student_id, name, description, features, repo_url, drive_url, demo_url, extra_notes, updated_at, profiles!projects_student_id_fkey(full_name)"
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_comments")
      .select(
        "id, project_id, content, author_id, created_at, profiles!project_comments_author_id_fkey(full_name)"
      )
      .order("created_at"),
  ]);

  const comments = (commentsData ?? []) as unknown as CommentRow[];

  const projects: GalleryProject[] = (
    (projectsData ?? []) as unknown as ProjectRow[]
  )
    // Chốt chặn thêm ở tầng UI: chỉ sản phẩm thuộc lớp mình đang học.
    .filter((p) => classCodeById.has(p.class_id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      features: p.features,
      repo_url: p.repo_url,
      drive_url: p.drive_url,
      demo_url: p.demo_url,
      extra_notes: p.extra_notes,
      updatedAt: p.updated_at,
      authorName: p.profiles?.full_name ?? "Học viên",
      classId: p.class_id,
      classCode: classCodeById.get(p.class_id) ?? "",
      isMine: p.student_id === profile.id,
      comments: comments
        .filter((c) => c.project_id === p.id)
        .map(
          (c): CommentItem => ({
            id: c.id,
            content: c.content,
            authorName: c.profiles?.full_name ?? "Học viên",
            authorId: c.author_id,
            createdAt: c.created_at,
          })
        ),
    }));

  // Bạn cùng lớp chưa có sản phẩm → thẻ mờ cuối lưới (chỉ lớp mình học).
  const hasProject = new Set(
    ((projectsData ?? []) as unknown as ProjectRow[]).map(
      (p) => `${p.class_id}:${p.student_id}`
    )
  );
  const membersWithoutProject: RosterMember[] = enrollments
    .filter(
      (e) =>
        classCodeById.has(e.class_id) &&
        !hasProject.has(`${e.class_id}:${e.student_id}`)
    )
    .map((e) => ({
      key: `${e.class_id}:${e.student_id}`,
      name: e.profiles?.full_name ?? "Học viên",
      classCode: classCodeById.get(e.class_id) ?? "",
      isMine: e.student_id === profile.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sản phẩm của lớp"
        description="Bấm vào từng bạn để xem chi tiết sản phẩm và để lại nhận xét"
      />

      {projects.length === 0 && membersWithoutProject.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Chưa có sản phẩm nào trong lớp</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Hãy là người đầu tiên khai báo sản phẩm ở tab &quot;Sản phẩm&quot;!
          </p>
        </div>
      ) : (
        <ProjectGrid
          projects={projects}
          membersWithoutProject={membersWithoutProject}
          currentUserId={profile.id}
        />
      )}
    </div>
  );
}
