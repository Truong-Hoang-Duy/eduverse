import type { CommentItem } from "@/components/gallery/comment-section";
import { ProjectGrid, type GalleryProject } from "@/components/gallery/project-grid";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sản phẩm học viên — Eduverse" };

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

export default async function TeacherGalleryPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  // RLS (projects_class_select → is_teacher_of_class) đã chặn lớp của GV khác;
  // danh sách lớp ở đây chỉ để nhóm hiển thị và lấy mã lớp.
  const [{ data: classesData }, { data: projectsData }, { data: commentsData }] =
    await Promise.all([
      supabase
        .from("classes")
        .select("id, class_code, courses(code)")
        .eq("teacher_id", profile.id)
        .order("class_code"),
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

  const classes = (classesData ?? []) as unknown as {
    id: string;
    class_code: string;
    courses: { code: string } | null;
  }[];
  const comments = (commentsData ?? []) as unknown as CommentRow[];
  const classCodeById = new Map(classes.map((c) => [c.id, c.class_code]));

  const projects: GalleryProject[] = (
    (projectsData ?? []) as unknown as ProjectRow[]
  )
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
      classCode: classCodeById.get(p.class_id) ?? "",
      // GV không sở hữu sản phẩm nào — nhãn "(bạn)" không bao giờ hiện.
      isMine: false,
      classId: p.class_id,
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

  const totalComments = projects.reduce((n, p) => n + p.comments.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sản phẩm học viên"
        description={
          projects.length > 0
            ? `${projects.length} sản phẩm · ${totalComments} nhận xét — bấm vào từng em để xem chi tiết và nhận xét`
            : "Sản phẩm cuối khóa của học viên trong các lớp bạn dạy"
        }
      />

      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Bạn chưa có lớp nào</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tạo lớp trong trang Lớp học trước.
          </p>
        </div>
      ) : (
        classes.map((c) => {
          const classProjects = projects.filter((p) => p.classId === c.id);
          return (
            <section key={c.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-md px-2.5 py-1 font-mono text-xs">
                  {c.class_code}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {c.courses?.code ?? ""} · {classProjects.length} sản phẩm
                </span>
              </div>
              {classProjects.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Lớp này chưa có em nào khai báo sản phẩm.
                </p>
              ) : (
                <ProjectGrid
                  projects={classProjects}
                  currentUserId={profile.id}
                  commentPlaceholder="Viết nhận xét cho em..."
                />
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
