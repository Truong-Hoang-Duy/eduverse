import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listMyCombos } from "@/lib/actions/review-combos";
import { requireProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

import type { PriorReviewHistoryItem } from "@/lib/actions/reviews";

import { ReviewList } from "./review-list";
import {
  type ExistingReview,
  isHandled,
  type PriorSelection,
} from "./review-status";
import { SessionForm } from "./session-form";
import { ZaloPanel } from "./zalo-panel";

interface SessionRow {
  id: string;
  class_id: string;
  session_number: number;
  title: string | null;
  content: string | null;
  review_context: string | null;
  is_periodic_test: boolean;
  is_project_period: boolean;
  is_final_presentation?: boolean;
  session_date: string | null;
  classes: {
    class_code: string;
    total_sessions?: number;
    courses: { name: string; code?: string } | null;
  } | null;
}

interface EnrollmentRow {
  profiles: { id: string; full_name: string } | null;
  academic_level: string | null;
}

interface ReviewRow extends ExistingReview {
  student_id: string;
}

interface PriorReviewRow {
  student_id: string;
  ai_generated_comment: string | null;
  strengths: string[];
  improvements: string[];
  is_absent: boolean;
  sessions: { id: string; session_number: number; title?: string | null } | null;
}

/**
 * Server Action của trang này có thể gọi Gemini cho CẢ LỚP một lượt ("áp nhận
 * xét giống buổi trước"), mà ai-service nằm trên Render free — cold start
 * 30–60s. Mặc định của Vercel không đủ cho ca xấu nhất đó.
 */
export const maxDuration = 60;

/** Buổi trước gần nhất tối đa 3 buổi để AI tránh lặp lời văn giữa các buổi. */
const MAX_PRIOR_COMMENTS = 3;
/** Giới hạn số buổi trước hiện trong combo copy — tránh dropdown quá dài. */
const MAX_PRIOR_SELECTIONS = 5;

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { id } = await params;

  const { data: sessionData } = await supabase
    .from("sessions")
    .select(
      "id, class_id, session_number, title, content, review_context, is_periodic_test, is_project_period, session_date, classes(class_code, total_sessions, courses(name, code))"
    )
    .eq("id", id)
    .single();

  if (!sessionData) {
    notFound();
  }
  const session = sessionData as unknown as SessionRow;

  const [
    { data: enrollments },
    { data: reviewsData },
    { data: optionsData },
    { data: templatesData },
    { data: priorReviewsData },
    { data: projectsData },
    combos,
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select("profiles(id, full_name), academic_level")
      .eq("class_id", session.class_id)
      .order("joined_at"),
    supabase
      .from("student_reviews")
      .select(
        "student_id, strengths, improvements, ai_generated_comment, is_absent"
      )
      .eq("session_id", session.id),
    supabase
      .from("review_options")
      .select("id, category, label, skill_group")
      .eq("teacher_id", profile.id)
      .order("label"),
    supabase
      .from("zalo_templates")
      .select("id, name")
      .eq("teacher_id", profile.id)
      .order("name"),
    // Nhận xét các buổi TRƯỚC (cùng lớp) — phục vụ: (1) AI tránh lặp lời văn,
    // (2) copy điểm mạnh/cải thiện, (3) tổng hợp toàn khóa cho buổi thuyết trình.
    supabase
      .from("student_reviews")
      .select(
        "student_id, ai_generated_comment, strengths, improvements, is_absent, sessions!inner(id, session_number, title, class_id)"
      )
      .eq("sessions.class_id", session.class_id)
      .lt("sessions.session_number", session.session_number),
    supabase
      .from("projects")
      .select("id, student_id, name, description, features")
      .eq("class_id", session.class_id),
    listMyCombos(),
  ]);

  const students = ((enrollments ?? []) as unknown as EnrollmentRow[])
    .filter((e) => e.profiles !== null)
    .map((e) => ({ ...e.profiles!, academic_level: e.academic_level }));
  const reviews = (reviewsData ?? []) as ReviewRow[];
  const reviewByStudentId = new Map(reviews.map((r) => [r.student_id, r]));
  const options = optionsData ?? [];
  const sessionTitle = session.title ?? `Buổi ${session.session_number}`;

  // "Đã xử lý" = đã nhận xét HOẶC đã đánh vắng — buổi coi như xong với em đó.
  const handledCount = students.filter((s) =>
    isHandled(reviewByStudentId.get(s.id) ?? null)
  ).length;

  const isFinalPresentation =
    Boolean(
      (sessionData as unknown as { is_final_presentation?: boolean })
        ?.is_final_presentation
    ) ||
    session.session_number === 14 ||
    (session.classes?.total_sessions !== undefined &&
      session.session_number === session.classes?.total_sessions);

  const projects = (projectsData ?? []) as {
    id: string;
    student_id: string;
    name: string;
    description: string | null;
    features: string[] | null;
  }[];
  const projectByStudentId = new Map(projects.map((p) => [p.student_id, p]));

  const priorReviews = (priorReviewsData ?? []) as unknown as PriorReviewRow[];
  const priorCommentsByStudentId = new Map<string, string[]>();
  const priorSelectionsByStudentId = new Map<string, PriorSelection[]>();
  const allPriorReviewsByStudentId = new Map<string, PriorReviewHistoryItem[]>();

  for (const studentId of new Set(priorReviews.map((r) => r.student_id))) {
    const mine = priorReviews
      .filter((r) => r.student_id === studentId)
      .sort(
        (a, b) =>
          (b.sessions?.session_number ?? 0) - (a.sessions?.session_number ?? 0)
      );

    // (1) Lời văn buổi trước cho AI chống lặp — chỉ lấy buổi đã có câu nhận xét.
    const comments = mine
      .filter((r) => r.ai_generated_comment)
      .slice(0, MAX_PRIOR_COMMENTS)
      .reverse()
      .map((r) => `Buổi ${r.sessions?.session_number}: ${r.ai_generated_comment}`);
    priorCommentsByStudentId.set(studentId, comments);

    // (2) Điểm mạnh/cải thiện buổi trước để copy — bỏ buổi vắng / trống tích.
    const selections = mine
      .filter(
        (r) =>
          !r.is_absent && (r.strengths.length > 0 || r.improvements.length > 0)
      )
      .slice(0, MAX_PRIOR_SELECTIONS)
      .map((r) => ({
        sessionNumber: r.sessions?.session_number ?? 0,
        strengths: r.strengths,
        improvements: r.improvements,
      }));
    priorSelectionsByStudentId.set(studentId, selections);

    // (3) Toàn bộ lịch sử các buổi trước (1..13) để AI tổng kết buổi 14
    const chronological = [...mine].reverse();
    allPriorReviewsByStudentId.set(
      studentId,
      chronological.map((r) => ({
        session_number: r.sessions?.session_number ?? 0,
        session_title:
          r.sessions?.title ?? `Buổi ${r.sessions?.session_number ?? 0}`,
        strengths: r.strengths,
        improvements: r.improvements,
        comment: r.ai_generated_comment,
      }))
    );
  }

  // Buổi trước có thể ÁP SANG cả lớp: chỉ buổi đã tích chọn cho ít nhất 1 em
  // (bỏ buổi vắng/trống) — buổi rỗng có hiện cũng không áp được gì.
  const copySourceCounts = new Map<
    string,
    { sessionNumber: number; students: number }
  >();
  for (const row of priorReviews) {
    if (row.is_absent) continue;
    if (row.strengths.length === 0 && row.improvements.length === 0) continue;
    const sessionRow = row.sessions;
    if (!sessionRow) continue;
    const bucket = copySourceCounts.get(sessionRow.id) ?? {
      sessionNumber: sessionRow.session_number,
      students: 0,
    };
    bucket.students += 1;
    copySourceCounts.set(sessionRow.id, bucket);
  }
  const copyFromSessions = [...copySourceCounts.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.sessionNumber - a.sessionNumber);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-3 cursor-pointer">
          <Link href={`/teacher/classes/${session.class_id}`}>
            ← Quay lại lớp {session.classes?.class_code}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Buổi {session.session_number}: {sessionTitle}
        </h1>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Nội dung buổi học</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionForm
            session={{ ...session, is_final_presentation: isFinalPresentation }}
            copyFromSessions={copyFromSessions}
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            Nhận xét học viên ({handledCount}/{students.length})
          </CardTitle>
          <CardDescription>
            {isFinalPresentation
              ? "Buổi thuyết trình sản phẩm cuối khóa: Bấm 'AI tổng kết Buổi 14' để tổng hợp toàn khóa và chấm ĐNL / Demo Score."
              : "Áp bộ combo điểm mạnh/cần cải thiện rồi bấm \"AI tạo nhận xét\"."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {students.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Lớp chưa có học viên nào.
            </p>
          )}
          {options.length === 0 && students.length > 0 && (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Chưa có danh mục nhận xét —{" "}
              <Link href="/teacher/settings" className="text-primary underline">
                vào Cài đặt để thêm
              </Link>{" "}
              rồi tạo bộ combo áp nhanh (có nút thêm nhanh bộ mặc định).
            </p>
          )}
          {students.length > 0 && (
            <ReviewList
              sessionId={session.id}
              sessionTitle={sessionTitle}
              sessionContent={session.content ?? ""}
              sessionContext={session.review_context ?? ""}
              isPeriodicTest={session.is_periodic_test}
              isProjectPeriod={session.is_project_period}
              isFinalPresentation={isFinalPresentation}
              classCode={session.classes?.class_code ?? ""}
              courseName={session.classes?.courses?.name ?? ""}
              students={students}
              options={options}
              reviewByStudentId={reviewByStudentId}
              priorCommentsByStudentId={priorCommentsByStudentId}
              priorSelectionsByStudentId={priorSelectionsByStudentId}
              allPriorReviewsByStudentId={allPriorReviewsByStudentId}
              projectsByStudentId={projectByStudentId}
              combos={combos}
            />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">📱 Tin nhắn Zalo cho phụ huynh</CardTitle>
          <CardDescription>
            AI tổng hợp các nhận xét đã lưu của buổi này thành tin nhắn theo mẫu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ZaloPanel
            sessionId={session.id}
            sessionNumber={session.session_number}
            classCode={session.classes?.class_code ?? ""}
            courseName={session.classes?.courses?.name ?? ""}
            teacherName={profile.full_name}
            templates={templatesData ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
