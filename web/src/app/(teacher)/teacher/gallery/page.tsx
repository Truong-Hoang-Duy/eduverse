import type { CommentItem } from "@/components/gallery/comment-section";
import type { GalleryProject, RosterMember } from "@/components/gallery/project-grid";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/get-profile";
import { driveLinksOfStudents } from "@/lib/actions/drive-link";
import { isClassCompleted } from "@/lib/class-completion";
import { createClient } from "@/lib/supabase/server";

import { type ExistingReview, isHandled } from "../sessions/[id]/review-status";
import { GalleryView } from "./gallery-view";

export const metadata = { title: "Sản phẩm học viên — Eduverse" };

interface ProjectRow {
  id: string;
  class_id: string;
  student_id: string;
  name: string;
  description: string | null;
  features: string[];
  image_urls: string[];
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

interface EnrollmentRow {
  class_id: string;
  student_id: string;
  profiles: { full_name: string } | null;
}

interface SessionRow {
  id: string;
  class_id: string;
  session_number: number;
}

export default async function TeacherGalleryPage() {
  const profile = await requireRole("teacher");
  const supabase = await createClient();

  // RLS (projects_class_select → is_teacher_of_class) đã chặn lớp của GV khác;
  // danh sách lớp ở đây dùng để nhóm hiển thị, lấy mã lớp, và giới hạn
  // enrollments/projects lấy về đúng phạm vi lớp GV dạy.
  const { data: classesData } = await supabase
    .from("classes")
    .select("id, class_code, total_sessions, courses(code)")
    .eq("teacher_id", profile.id)
    .order("class_code");

  const classes = (classesData ?? []) as unknown as {
    id: string;
    class_code: string;
    total_sessions: number;
    courses: { code: string } | null;
  }[];
  const classIds = classes.map((c) => c.id);

  const [
    { data: projectsData },
    { data: commentsData },
    { data: enrollmentsData },
    { data: sessionsData },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, class_id, student_id, name, description, features, image_urls, repo_url, demo_url, extra_notes, updated_at, profiles!projects_student_id_fkey(full_name)"
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_comments")
      .select(
        "id, project_id, content, author_id, created_at, profiles!project_comments_author_id_fkey(full_name)"
      )
      .order("created_at"),
    classIds.length > 0
      ? supabase
          .from("enrollments")
          .select("class_id, student_id, profiles(full_name)")
          .in("class_id", classIds)
      : Promise.resolve({ data: [] as EnrollmentRow[] }),
    classIds.length > 0
      ? supabase
          .from("sessions")
          .select("id, class_id, session_number")
          .in("class_id", classIds)
      : Promise.resolve({ data: [] as SessionRow[] }),
  ]);

  const comments = (commentsData ?? []) as unknown as CommentRow[];
  const enrollments = (enrollmentsData ?? []) as unknown as EnrollmentRow[];
  const classCodeById = new Map(classes.map((c) => [c.id, c.class_code]));

  // Link "Thư mục Drive" trên thẻ sản phẩm lấy từ `student_drive_links` (link HV
  // tự cài, dùng chung mọi lớp), KHÔNG phải cột projects.drive_url đã bỏ.
  const driveLinks = await driveLinksOfStudents(
    enrollments.map((e) => e.student_id)
  );

  const projects: GalleryProject[] = (
    (projectsData ?? []) as unknown as ProjectRow[]
  )
    .filter((p) => classCodeById.has(p.class_id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      features: p.features,
      image_urls: p.image_urls,
      repo_url: p.repo_url,
      drive_url: driveLinks[p.student_id] ?? null,
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

  // Xác định buổi cuối cùng của từng lớp để kiểm tra hoàn thành
  const lastSessionIdByClass = new Map<string, string>();
  for (const cls of classes) {
    const last = (sessionsData ?? []).find(
      (s) => s.class_id === cls.id && s.session_number === cls.total_sessions
    );
    if (last) lastSessionIdByClass.set(cls.id, last.id);
  }

  const lastSessionIds = [...lastSessionIdByClass.values()];
  const { data: lastReviewsData } = lastSessionIds.length
    ? await supabase
        .from("student_reviews")
        .select("session_id, strengths, improvements, ai_generated_comment, is_absent")
        .in("session_id", lastSessionIds)
    : { data: [] };

  const handledCountBySession = new Map<string, number>();
  for (const row of (lastReviewsData ?? []) as (ExistingReview & {
    session_id: string;
  })[]) {
    if (!isHandled(row)) continue;
    handledCountBySession.set(
      row.session_id,
      (handledCountBySession.get(row.session_id) ?? 0) + 1
    );
  }

  const studentCountByClass = new Map<string, number>();
  for (const e of enrollments) {
    studentCountByClass.set(
      e.class_id,
      (studentCountByClass.get(e.class_id) ?? 0) + 1
    );
  }

  // Enrollment chưa có sản phẩm tương ứng → thẻ mờ "Chưa có sản phẩm" cuối
  // mỗi lớp, giúp GV biết ngay ai còn thiếu mà không phải tự đếm.
  const hasProject = new Set(
    ((projectsData ?? []) as unknown as ProjectRow[]).map(
      (p) => `${p.class_id}:${p.student_id}`
    )
  );
  const membersWithoutProject: RosterMember[] = enrollments
    .filter((e) => !hasProject.has(`${e.class_id}:${e.student_id}`))
    .map((e) => ({
      key: `${e.class_id}:${e.student_id}`,
      name: e.profiles?.full_name ?? "Học viên",
      classCode: classCodeById.get(e.class_id) ?? "",
      isMine: false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sản phẩm học viên"
        description={
          projects.length > 0
            ? `${projects.length} sản phẩm · ${totalComments} nhận xét · ${membersWithoutProject.length} chưa khai báo`
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
        <GalleryView
          classes={classes.map((c) => {
            const studentCount = studentCountByClass.get(c.id) ?? 0;
            const lastSessionId = lastSessionIdByClass.get(c.id);
            const handledCount = lastSessionId
              ? (handledCountBySession.get(lastSessionId) ?? 0)
              : 0;
            return {
              id: c.id,
              class_code: c.class_code,
              courseCode: c.courses?.code ?? "",
              completed: isClassCompleted({ studentCount, handledCount }),
            };
          })}
          projects={projects}
          membersWithoutProject={membersWithoutProject}
          currentUserId={profile.id}
        />
      )}
    </div>
  );
}
