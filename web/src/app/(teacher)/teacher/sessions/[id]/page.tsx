import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireProfile } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";

import { ReviewList } from "./review-list";
import { type ExistingReview, isHandled } from "./review-status";
import { SessionForm } from "./session-form";
import { ZaloPanel } from "./zalo-panel";

interface SessionRow {
  id: string;
  class_id: string;
  session_number: number;
  title: string | null;
  content: string | null;
  session_date: string | null;
  classes: { class_code: string } | null;
}

interface EnrollmentRow {
  profiles: { id: string; full_name: string } | null;
}

interface ReviewRow extends ExistingReview {
  student_id: string;
}

interface PriorReviewRow {
  student_id: string;
  ai_generated_comment: string | null;
  sessions: { session_number: number } | null;
}

/** Buổi trước gần nhất tối đa 3 buổi để AI tránh lặp lời văn giữa các buổi. */
const MAX_PRIOR_COMMENTS = 3;

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
    .select("id, class_id, session_number, title, content, session_date, classes(class_code)")
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
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select("profiles(id, full_name)")
      .eq("class_id", session.class_id)
      .order("joined_at"),
    supabase
      .from("student_reviews")
      .select(
        "student_id, strengths, improvements, advice, ai_generated_comment, academic_level, is_absent"
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
    // Nhận xét các buổi TRƯỚC (cùng lớp, cùng học viên) — cho AI biết đã
    // viết gì để đổi cách diễn đạt, tránh lặp lời văn giữa các buổi.
    supabase
      .from("student_reviews")
      .select("student_id, ai_generated_comment, sessions!inner(session_number, class_id)")
      .eq("sessions.class_id", session.class_id)
      .lt("sessions.session_number", session.session_number)
      .not("ai_generated_comment", "is", null),
  ]);

  const students = ((enrollments ?? []) as unknown as EnrollmentRow[])
    .map((e) => e.profiles)
    .filter((p): p is NonNullable<EnrollmentRow["profiles"]> => p !== null);
  const reviews = (reviewsData ?? []) as ReviewRow[];
  const reviewByStudentId = new Map(reviews.map((r) => [r.student_id, r]));
  const options = optionsData ?? [];
  const sessionTitle = session.title ?? `Buổi ${session.session_number}`;

  // "Đã xử lý" = đã nhận xét HOẶC đã đánh vắng — buổi coi như xong với em đó.
  const handledCount = students.filter((s) =>
    isHandled(reviewByStudentId.get(s.id) ?? null)
  ).length;

  const priorReviews = (priorReviewsData ?? []) as unknown as PriorReviewRow[];
  const priorCommentsByStudentId = new Map<string, string[]>();
  for (const studentId of new Set(priorReviews.map((r) => r.student_id))) {
    const comments = priorReviews
      .filter((r) => r.student_id === studentId)
      .sort((a, b) => (b.sessions?.session_number ?? 0) - (a.sessions?.session_number ?? 0))
      .slice(0, MAX_PRIOR_COMMENTS)
      .reverse()
      .map((r) => `Buổi ${r.sessions?.session_number}: ${r.ai_generated_comment}`);
    priorCommentsByStudentId.set(studentId, comments);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/teacher/classes/${session.class_id}`}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Lớp {session.classes?.class_code}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Buổi {session.session_number}: {sessionTitle}
        </h1>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Nội dung buổi học</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionForm session={session} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            Nhận xét học viên ({handledCount}/{students.length})
          </CardTitle>
          <CardDescription>
            Tick điểm mạnh / cần cải thiện rồi bấm &quot;AI tạo nhận xét&quot; —
            sửa lại theo ý bạn trước khi lưu.
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
              Chưa có danh mục điểm mạnh / cần cải thiện —{" "}
              <Link href="/teacher/settings" className="text-primary underline">
                vào Cài đặt để thêm
              </Link>{" "}
              (có nút thêm nhanh bộ mặc định).
            </p>
          )}
          {students.length > 0 && (
            <ReviewList
              sessionId={session.id}
              sessionTitle={sessionTitle}
              sessionContent={session.content ?? ""}
              students={students}
              options={options}
              reviewByStudentId={reviewByStudentId}
              priorCommentsByStudentId={priorCommentsByStudentId}
            />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">📱 Tin nhắn Zalo cho phụ huynh</CardTitle>
          <CardDescription>
            AI tổng hợp các nhận xét đã lưu của buổi này thành tin nhắn theo mẫu —
            copy rồi dán vào nhóm Zalo lớp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ZaloPanel
            sessionId={session.id}
            templates={templatesData ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
