import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard, type ProjectView } from "@/components/project-card";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

import { CommentSection, type CommentItem } from "./comment-section";

export const metadata = { title: "Sản phẩm của lớp — Eduverse" };

interface ProjectRow {
  id: string;
  class_id: string;
  name: string;
  description: string | null;
  features: string[];
  repo_url: string | null;
  drive_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
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

  // Lớp học viên đang học → chỉ hiện sản phẩm trong các lớp đó (RLS cũng chặn sẵn).
  const { data: enrollmentsData } = await supabase
    .from("enrollments")
    .select("class_id, classes(class_code)")
    .eq("student_id", profile.id);
  const enrollments = (enrollmentsData ?? []) as unknown as {
    class_id: string;
    classes: { class_code: string } | null;
  }[];
  const classCodeById = new Map(
    enrollments.map((e) => [e.class_id, e.classes?.class_code ?? ""])
  );

  const [{ data: projectsData }, { data: commentsData }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, class_id, name, description, features, repo_url, drive_url, demo_url, extra_notes, profiles!projects_student_id_fkey(full_name)"
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_comments")
      .select("id, project_id, content, author_id, created_at, profiles!project_comments_author_id_fkey(full_name)")
      .order("created_at"),
  ]);

  const projects = (projectsData ?? []) as unknown as ProjectRow[];
  const comments = (commentsData ?? []) as unknown as CommentRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sản phẩm của lớp"
        description="Xem sản phẩm của các bạn cùng lớp và để lại nhận xét"
      />

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Chưa có sản phẩm nào trong lớp</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Hãy là người đầu tiên khai báo sản phẩm của mình!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => {
            const view: ProjectView = {
              id: p.id,
              name: p.name,
              description: p.description,
              features: p.features,
              repo_url: p.repo_url,
              drive_url: p.drive_url,
              demo_url: p.demo_url,
              extra_notes: p.extra_notes,
              authorName: p.profiles?.full_name ?? "Học viên",
            };
            const projectComments: CommentItem[] = comments
              .filter((c) => c.project_id === p.id)
              .map((c) => ({
                id: c.id,
                content: c.content,
                authorName: c.profiles?.full_name ?? "Học viên",
                authorId: c.author_id,
                createdAt: c.created_at,
              }));
            return (
              <Card key={p.id} className="shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <ProjectCard project={view} />
                    <span className="shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                      {classCodeById.get(p.class_id) ?? ""}
                    </span>
                  </div>
                  <div className="border-t pt-3">
                    <CommentSection
                      projectId={p.id}
                      comments={projectComments}
                      currentUserId={profile.id}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
