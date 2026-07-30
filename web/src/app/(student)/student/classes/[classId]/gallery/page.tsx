import type { CommentItem } from "@/components/gallery/comment-section";
import {
  ProjectGrid,
  type GalleryProject,
  type RosterMember,
} from "@/components/gallery/project-grid";
import { getMyDriveLink } from "@/lib/actions/drive-link";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sản phẩm của lớp — Eduverse" };

interface ProjectRow {
  id: string;
  class_id: string;
  student_id: string;
  name: string;
  description: string | null;
  features: string[];
  repo_url: string | null;
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

export default async function StudentClassGalleryPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const profile = await requireRole("student");
  const supabase = await createClient();

  // Lớp đã được layout xác thực. Roster lấy theo ĐÚNG lớp này để hiện cả bạn
  // chưa có sản phẩm (policy `enrollments_classmates_select` cho đọc bạn cùng lớp).
  const [{ data: clsData }, { data: enrollmentsData }] = await Promise.all([
    supabase.from("classes").select("class_code").eq("id", classId).maybeSingle(),
    supabase
      .from("enrollments")
      .select("student_id, profiles(full_name)")
      .eq("class_id", classId),
  ]);

  const classCode = clsData?.class_code ?? "";
  const enrollments = (enrollmentsData ?? []) as unknown as {
    student_id: string;
    profiles: { full_name: string } | null;
  }[];

  const [{ data: projectsData }, { data: commentsData }] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, class_id, student_id, name, description, features, repo_url, demo_url, extra_notes, updated_at, profiles!projects_student_id_fkey(full_name)"
      )
      .eq("class_id", classId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_comments")
      .select(
        "id, project_id, content, author_id, created_at, profiles!project_comments_author_id_fkey(full_name)"
      )
      .order("created_at"),
  ]);

  const rows = (projectsData ?? []) as unknown as ProjectRow[];
  const comments = (commentsData ?? []) as unknown as CommentRow[];

  // Chỉ link của CHÍNH EM: RLS không cho học viên đọc link của bạn cùng lớp
  // (e2e-drive-link canh đúng việc này) nên thẻ của bạn khác không có nút Drive.
  const myDriveUrl = await getMyDriveLink();

  const projects: GalleryProject[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    features: p.features,
    repo_url: p.repo_url,
    drive_url: p.student_id === profile.id ? myDriveUrl : null,
    demo_url: p.demo_url,
    extra_notes: p.extra_notes,
    updatedAt: p.updated_at,
    authorName: p.profiles?.full_name ?? "Học viên",
    classId: p.class_id,
    classCode,
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

  // Bạn cùng lớp chưa có sản phẩm → thẻ mờ cuối lưới.
  const hasProject = new Set(rows.map((p) => p.student_id));
  const membersWithoutProject: RosterMember[] = enrollments
    .filter((e) => !hasProject.has(e.student_id))
    .map((e) => ({
      key: `${classId}:${e.student_id}`,
      name: e.profiles?.full_name ?? "Học viên",
      classCode,
      isMine: e.student_id === profile.id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  if (projects.length === 0 && membersWithoutProject.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">Chưa có sản phẩm nào trong lớp</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Hãy là người đầu tiên khai báo sản phẩm ở tab &quot;Sản phẩm của
          tôi&quot;!
        </p>
      </div>
    );
  }

  return (
    <ProjectGrid
      projects={projects}
      membersWithoutProject={membersWithoutProject}
      currentUserId={profile.id}
    />
  );
}
