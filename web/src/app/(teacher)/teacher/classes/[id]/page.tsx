import Link from "next/link";
import { notFound } from "next/navigation";

import { CollapsibleCard } from "@/components/collapsible-card";
import type { ProjectView } from "@/components/project-card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { driveLinksOfClass } from "@/lib/actions/drive-link";
import {
  getSessionFormatBadge,
  resolveSessionFormat,
} from "@/lib/session-format";
import { isShowcaseExpired } from "@/lib/showcase";
import { createClient } from "@/lib/supabase/server";
import type { ClassWithCourse, EnrollmentWithStudent } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  type ExistingReview,
  isHandled,
  resolveSessionReviewState,
} from "../../sessions/[id]/review-status";
import { AddStudentDialog } from "./add-student-dialog";
import { BreakScreen } from "./break-screen";
import { DeleteClassButton } from "./delete-class-button";
import { DuplicateClassDialog } from "./duplicate-class-dialog";
import { EditClassDialog } from "./edit-class-dialog";
import { GroupRandomizer } from "./group-randomizer";
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
    { data: reviewsData },
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
      .order("sort_order", { ascending: true })
      .order("joined_at", { ascending: true }),
    supabase
      .from("classes")
      .select("id, class_code, total_sessions")
      .order("class_code"),
    supabase
      .from("sessions")
      .select(
        "id, session_number, title, content, session_date, is_periodic_test, is_project_period, is_final_presentation"
      )
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
    supabase
      .from("student_reviews")
      .select(
        "session_id, student_id, strengths, improvements, ai_generated_comment, is_absent, sessions!inner(class_id)"
      )
      .eq("sessions.class_id", id),
  ]);

  if (!classData) {
    notFound();
  }

  const cls = classData as ClassWithCourse;
  let enrollments = (enrollmentsData ?? []) as EnrollmentWithStudent[];
  if (!enrollmentsData) {
    // Graceful fallback nếu DB chưa có cột sort_order
    const { data: fallbackEnrollments } = await supabase
      .from("enrollments")
      .select("*, profiles(id, full_name, username)")
      .eq("class_id", id)
      .order("joined_at");
    if (fallbackEnrollments) {
      enrollments = fallbackEnrollments as EnrollmentWithStudent[];
    }
  }

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
      sortOrder: e.sort_order,
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

  let sessions = sessionsData ?? [];
  if (!sessionsData) {
    // Graceful fallback nếu DB chưa dán migration 20260911000000 (cột is_final_presentation)
    const { data: fallback } = await supabase
      .from("sessions")
      .select(
        "id, session_number, title, content, session_date, is_periodic_test, is_project_period"
      )
      .eq("class_id", id)
      .order("session_number");
    if (fallback) {
      sessions = fallback as typeof sessions;
    }
  }
  const filledSessions = sessions.filter((s) => Boolean(s.content)).length;

  const currentStudentIds = new Set(students.map((s) => s.studentId));
  const handledCountBySession = new Map<string, number>();
  for (const row of (reviewsData ?? []) as (ExistingReview & {
    session_id: string;
    student_id: string;
  })[]) {
    if (currentStudentIds.size > 0 && !currentStudentIds.has(row.student_id)) {
      continue;
    }
    if (!isHandled(row)) continue;
    handledCountBySession.set(
      row.session_id,
      (handledCountBySession.get(row.session_id) ?? 0) + 1
    );
  }

  const studentCount = students.length;
  const completedSessions = sessions.filter((s) => {
    const handled = handledCountBySession.get(s.id) ?? 0;
    return (
      resolveSessionReviewState({ studentCount, handledCount: handled }) ===
      "completed"
    );
  }).length;

  // Tiến độ lớp = tỉ lệ buổi đã hoàn thành nhận xét cho cả lớp.
  const progressPercent =
    cls.total_sessions > 0
      ? Math.round((completedSessions / cls.total_sessions) * 100)
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
      "id, token, is_enabled, expires_at, intro, allow_ratings, allow_reactions, show_rating_results, hidden_student_ids, view_count, spotlight_project_id"
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
  if (showcase) {
    const isExpired = isShowcaseExpired(showcase.expires_at);
    if (isExpired) {
      // Link đã hết hạn -> xóa sạch nhận xét góp ý theo yêu cầu
      await supabase
        .from("showcase_ratings")
        .delete()
        .eq("showcase_id", showcase.id);
    } else {
      const { data: ratingRows } = await supabase
        .from("showcase_ratings")
        .select(
          "id, project_id, score_product, score_presentation, score_creativity, comment, created_at"
        )
        .eq("showcase_id", showcase.id)
        .order("created_at", { ascending: false });
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
    }
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
          hint={`${completedSessions}/${cls.total_sessions} buổi đã nhận xét`}
          progress={progressPercent}
        />
      </div>

      <CollapsibleCard title="Buổi học" defaultOpen>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const filled = Boolean(session.content);
            const handledCount = handledCountBySession.get(session.id) ?? 0;
            const reviewState = resolveSessionReviewState({
              studentCount,
              handledCount,
            });
            const isReviewed = reviewState === "completed";
            const isPartiallyReviewed = reviewState === "partial";
            const badge = getSessionFormatBadge(
              resolveSessionFormat(session),
              session.session_number,
              cls.total_sessions
            );
            return (
              <Link key={session.id} href={`/teacher/sessions/${session.id}`}>
                <div className="group flex h-full items-start gap-3 rounded-lg border p-3 transition-all hover:border-primary/40 hover:shadow-sm">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold transition-colors",
                      isReviewed
                        ? "bg-emerald-600 text-white font-bold shadow-xs dark:bg-emerald-500"
                        : isPartiallyReviewed
                          ? "bg-amber-500 text-white font-bold shadow-xs dark:bg-amber-500"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {session.session_number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium">
                        {session.title ?? `Buổi ${session.session_number}`}
                      </p>
                      {badge && (
                        <span
                          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {isReviewed ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <span>✓</span> Đã nhận xét
                        </span>
                      ) : isPartiallyReviewed ? (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                          <span>⏳</span> Đang nhận xét ({handledCount}/{studentCount})
                        </span>
                      ) : (
                        <span>Chưa nhận xét</span>
                      )}
                      {session.session_date ? (
                        <span>· {new Date(session.session_date).toLocaleDateString("vi-VN")}</span>
                      ) : (
                        <span>· {filled ? "Đã có nội dung" : "Chưa có nội dung"}</span>
                      )}
                    </div>
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
        title="🎲 Bốc thăm ngẫu nhiên"
        description="Bốc thăm cá nhân hoặc chia nhóm ngẫu nhiên"
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
          projects={projects}
        />
      </CollapsibleCard>
    </div>
  );
}
