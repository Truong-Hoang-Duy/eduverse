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
  strengths: string[];
  improvements: string[];
  is_absent: boolean;
  sessions: { session_number: number } | null;
}

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
    combos,
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
    // Nhận xét các buổi TRƯỚC (cùng lớp) — phục vụ 2 việc: (1) cho AI biết đã
    // viết gì để tránh lặp lời văn, (2) copy điểm mạnh/cải thiện từ buổi trước.
    // KHÔNG lọc theo ai_generated_comment nữa vì buổi trước có thể có tích chọn
    // mà chưa lưu câu nhận xét — vẫn cần cho việc copy.
    supabase
      .from("student_reviews")
      .select(
        "student_id, ai_generated_comment, strengths, improvements, is_absent, sessions!inner(session_number, class_id)"
      )
      .eq("sessions.class_id", session.class_id)
      .lt("sessions.session_number", session.session_number),
    listMyCombos(),
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
  const priorSelectionsByStudentId = new Map<string, PriorSelection[]>();
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
  }

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
              priorSelectionsByStudentId={priorSelectionsByStudentId}
              combos={combos}
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
