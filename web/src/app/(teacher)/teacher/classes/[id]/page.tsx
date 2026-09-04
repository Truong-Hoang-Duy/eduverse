import Link from "next/link";
import { notFound } from "next/navigation";

import { CollapsibleCard } from "@/components/collapsible-card";
import { ProjectCard, type ProjectView } from "@/components/project-card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { driveLinksOfClass } from "@/lib/actions/drive-link";
import { createClient } from "@/lib/supabase/server";
import type { ClassWithCourse, EnrollmentWithStudent } from "@/lib/types";

import { AddStudentDialog } from "./add-student-dialog";
import { BreakScreen } from "./break-screen";
import { DeleteClassButton } from "./delete-class-button";
import { DuplicateClassDialog } from "./duplicate-class-dialog";
import { EditClassDialog } from "./edit-class-dialog";
import { GroupRandomizer } from "./group-randomizer";
import { ProjectShowcase } from "./project-showcase";
import {
  ShowcasePanel,
  type ShowcaseRatingRow,
  type ShowcaseRow,
} from "./showcase-panel";
import {
  StudentsTable,
  type ClassOption,
  type StudentRow,
} from "./students-table";
import { TransferStudentDialog } from "./transfer-student-dialog";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: classData },
    { data: enrollmentsData },
    { data: allClasses },
    { data: sessionsData },
    { data: projectsData },
    { data: coursesData },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("*, courses(code, name)")
      .eq("id", id)
      .single(),
    supabase
      .from("enrollments")
      .select("*, profiles(id, full_name, username)")
      .eq("class_id", id)
      .order("joined_at"),
    supabase
      .from("classes")
      .select("id, class_code, total_sessions")
      .order("class_code"),
    supabase
      .from("sessions")
      .select("id, session_number, title, content, session_date")
      .eq("class_id", id)
      .order("session_number"),
    supabase
      .from("projects")
      .select(
        "id, student_id, name, description, features, image_urls, repo_url, demo_url, extra_notes, profiles!projects_student_id_fkey(full_name)"
      )
      .eq("class_id", id)
      .order("updated_at", { ascending: false }),
    supabase.from("courses").select("id, code, name").order("code"),
  ]);

  if (!classData) {
    notFound();
  }

  const cls = classData as ClassWithCourse;
  const enrollments = (enrollmentsData ?? []) as EnrollmentWithStudent[];

  // Link Drive nộp bài của từng em (RLS: chỉ GV của lớp này đọc được).
  const driveLinks = await driveLinksOfClass(id);

  const students: StudentRow[] = enrollments
    .filter((e) => e.profiles !== null)
    .map((e) => ({
      enrollmentId: e.id,
      studentId: e.profiles!.id,
      fullName: e.profiles!.full_name,
      username: e.profiles!.username,
      driveUrl: driveLinks[e.profiles!.id] ?? null,
      academicLevel: e.academic_level,
    }));

  const allClassRows = (allClasses ?? []) as {
    id: string;
    class_code: string;
    total_sessions: number;
  }[];
  const otherClasses: ClassOption[] = allClassRows
    .filter((c) => c.id !== id)
    .map((c) => ({ id: c.id, classCode: c.class_code }));

  // Nguồn giáo án cho "Sao chép lớp": các lớp KHÁC lớp đang mở (user chốt
  // 2026-07-27 — không lấy giáo án từ lớp hiện tại), kèm số buổi để hiển thị.
  const curriculumSources = allClassRows
    .filter((c) => c.id !== id)
    .map((c) => ({
      id: c.id,
      classCode: c.class_code,
      totalSessions: c.total_sessions,
    }));

  const sessions = sessionsData ?? [];
  const filledSessions = sessions.filter((s) => Boolean(s.content)).length;
  // Tiến độ lớp = tỉ lệ buổi đã soạn nội dung.
  const progressPercent =
    cls.total_sessions > 0
      ? Math.round((filledSessions / cls.total_sessions) * 100)
      : 0;

  const projects = (
    (projectsData ?? []) as unknown as {
      id: string;
      student_id: string;
      name: string;
      description: string | null;
      features: string[];
      image_urls: string[];
      repo_url: string | null;
      demo_url: string | null;
      extra_notes: string | null;
      profiles: { full_name: string } | null;
    }[]
  ).map(
    (p): ProjectView => ({
      id: p.id,
      name: p.name,
      description: p.description,
      features: p.features,
      image_urls: p.image_urls,
      repo_url: p.repo_url,
      drive_url: driveLinks[p.student_id] ?? null,
      demo_url: p.demo_url,
      extra_notes: p.extra_notes,
      authorName: p.profiles?.full_name ?? "Học viên",
    })
  );

  // Link triển lãm gửi phụ huynh. RLS `class_showcases_teacher_all` đã chặn lớp
  // của giáo viên khác, ở đây chỉ lọc theo lớp đang mở.
  const { data: showcaseData, error: showcaseError } = await supabase
    .from("class_showcases")
    .select(
      "id, token, is_enabled, expires_at, intro, allow_ratings, allow_reactions, show_rating_results, hidden_student_ids, view_count"
    )
    .eq("class_id", id)
    .maybeSingle();

  const showcase = (showcaseData ?? null) as (ShowcaseRow & { id: string }) | null;
  // KHÔNG nuốt lỗi ở đây: nếu truy vấn hỏng (thiếu cột vì migration chưa dán,
  // RLS đổi...) thì `showcase` cũng là null y như khi chưa bật link — giáo viên
  // sẽ thấy 'Chưa bật' và tưởng link tự biến mất. Đã dính đúng lỗi này 2026-08-29.
  const showcaseLoadError = showcaseError
    ? `Không đọc được cấu hình link: ${showcaseError.message}`
    : null;
  const authorByProject = new Map(projects.map((p) => [p.id, p.authorName]));

  let showcaseRatings: ShowcaseRatingRow[] = [];
  let heartCount = 0;
  if (showcase) {
    const [{ data: ratingRows }, { data: heartRows }] = await Promise.all([
      supabase
        .from("showcase_ratings")
        .select(
          "id, project_id, score_product, score_presentation, score_creativity, comment, created_at"
        )
        .eq("showcase_id", showcase.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("showcase_reactions")
        .select("id")
        .eq("showcase_id", showcase.id),
    ]);
    // Bài chấm ẩn danh: dòng KHÔNG có tên người gửi. `studentName` là tên em
    // ĐƯỢC CHẤM, lấy từ chính danh sách sản phẩm phía trên.
    showcaseRatings = (ratingRows ?? []).map((r) => ({
      id: r.id,
      studentName: authorByProject.get(r.project_id) ?? "Học viên",
      score_product: r.score_product,
      score_presentation: r.score_presentation,
      score_creativity: r.score_creativity,
      comment: r.comment,
      created_at: r.created_at,
    }));
    heartCount = (heartRows ?? []).length;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-3 cursor-pointer">
          <Link href="/teacher">← Quay lại danh sách lớp</Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-2xl font-bold tracking-tight">
              Lớp {cls.class_code}
              <Badge variant="secondary" className="rounded-md">
                {cls.courses ? `${cls.courses.code} — ${cls.courses.name}` : ""}
              </Badge>
            </h1>
            {cls.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {cls.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BreakScreen classCode={cls.class_code} />
            <EditClassDialog
              classId={cls.id}
              classCode={cls.class_code}
              courseId={cls.course_id}
              description={cls.description}
              courses={coursesData ?? []}
            />
            <DuplicateClassDialog
              sourceClassCode={cls.class_code}
              courseId={cls.course_id}
              description={cls.description}
              curriculumSources={curriculumSources}
              courses={coursesData ?? []}
              students={students.map((s) => ({
                id: s.studentId,
                fullName: s.fullName,
              }))}
            />
            <DeleteClassButton classId={cls.id} classCode={cls.class_code} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sĩ số" value={students.length} hint="Học viên trong lớp" />
        <StatCard
          label="Buổi đã soạn"
          value={`${filledSessions}/${cls.total_sessions}`}
          hint="Buổi đã có nội dung"
        />
        <StatCard
          label="Sản phẩm"
          value={projects.length}
          hint="Sản phẩm cuối khóa đã khai báo"
        />
        <StatCard
          label="Tiến độ lớp"
          value={`${progressPercent}%`}
          progress={progressPercent}
        />
      </div>

      <CollapsibleCard title="Buổi học" defaultOpen>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const filled = Boolean(session.content);
            return (
              <Link key={session.id} href={`/teacher/sessions/${session.id}`}>
                <div className="group flex h-full items-start gap-3 rounded-lg border p-3 transition-all hover:border-primary/40 hover:shadow-sm">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${filled
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {session.session_number}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {session.title ?? `Buổi ${session.session_number}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.session_date
                        ? new Date(session.session_date).toLocaleDateString("vi-VN")
                        : filled
                          ? "Đã có nội dung"
                          : "Chưa có nội dung"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title={`Danh sách học viên (${students.length})`}>
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <TransferStudentDialog
            classId={cls.id}
            students={students.map((s) => ({
              enrollmentId: s.enrollmentId,
              fullName: s.fullName,
            }))}
            otherClasses={otherClasses}
          />
          <AddStudentDialog
            classId={cls.id}
            classCode={cls.class_code}
            existingStudentIds={students.map((s) => s.studentId)}
          />
        </div>
        <StudentsTable classId={cls.id} students={students} />
      </CollapsibleCard>

      <CollapsibleCard
        title="🎲 Random nhóm thuyết trình"
        description="Chia nhóm ngẫu nhiên theo số nhóm hoặc số người mỗi nhóm"
      >
        <GroupRandomizer
          classCode={cls.class_code}
          students={students.map((s) => ({ id: s.studentId, name: s.fullName }))}
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="🔗 Tổng kết khóa học"
        description="Trang công khai để phụ huynh xem sản phẩm cả lớp — gửi link hoặc chiếu QR trong buổi lễ cuối khóa"
      >
        <ShowcasePanel
          classId={cls.id}
          classCode={cls.class_code}
          showcase={showcase}
          loadError={showcaseLoadError}
          students={students.map((s) => ({
            id: s.studentId,
            fullName: s.fullName,
          }))}
          ratings={showcaseRatings}
          heartCount={heartCount}
        />
      </CollapsibleCard>

      <CollapsibleCard
        title={`🚀 Sản phẩm cuối khóa (${projects.length})`}
        description="Sản phẩm học viên trong lớp đã khai báo"
      >
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <ProjectShowcase classCode={cls.class_code} projects={projects} />
        </div>
        <div className="space-y-4">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có học viên nào khai báo sản phẩm.
            </p>
          ) : (
            projects.map((project, i) => (
              <div
                key={project.id}
                className={i > 0 ? "border-t pt-4" : undefined}
              >
                <ProjectCard project={project} />
              </div>
            ))
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}
