import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type { CriterionScore } from "@/lib/actions/grading";

import { GradingBoard, type BoardRow } from "./grading-board";

interface AssignmentRow {
  id: string;
  course_id: string;
  session_number: number;
  title: string;
  instructions: string | null;
  courses: { code: string; name: string } | null;
}

interface SubmissionRow {
  id: string;
  student_id: string;
  code_file_paths: string[];
  grades: {
    id: string;
    score: number;
    criteria_breakdown: CriterionScore[];
    ai_comment: string | null;
  } | null;
}

export default async function GradeAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ class?: string }>;
}) {
  const { id } = await params;
  const { class: classParam } = await searchParams;
  const supabase = await createClient();

  const { data: assignmentData } = await supabase
    .from("assignments")
    .select("id, course_id, session_number, title, instructions, courses(code, name)")
    .eq("id", id)
    .single();
  if (!assignmentData) {
    notFound();
  }
  const assignment = assignmentData as unknown as AssignmentRow;

  const { data: classesData } = await supabase
    .from("classes")
    .select("id, class_code")
    .eq("course_id", assignment.course_id)
    .order("class_code");
  const classes = classesData ?? [];
  const selectedClassId =
    classes.find((c) => c.id === classParam)?.id ?? classes[0]?.id;

  let rows: BoardRow[] = [];
  if (selectedClassId) {
    const [{ data: enrollments }, { data: submissionsData }] = await Promise.all([
      supabase
        .from("enrollments")
        .select("profiles(id, full_name)")
        .eq("class_id", selectedClassId)
        .order("joined_at"),
      supabase
        .from("submissions")
        .select("id, student_id, code_file_paths, grades(id, score, criteria_breakdown, ai_comment)")
        .eq("assignment_id", assignment.id)
        .eq("class_id", selectedClassId),
    ]);

    const submissions = (submissionsData ?? []) as unknown as SubmissionRow[];
    rows = ((enrollments ?? []) as unknown as {
      profiles: { id: string; full_name: string } | null;
    }[])
      .map((e) => e.profiles)
      .filter((p): p is { id: string; full_name: string } => p !== null)
      .map((student) => {
        const sub = submissions.find((s) => s.student_id === student.id);
        return {
          studentId: student.id,
          fullName: student.full_name,
          submission: sub
            ? { id: sub.id, fileCount: sub.code_file_paths.length }
            : null,
          grade: sub?.grades
            ? {
                id: sub.grades.id,
                score: sub.grades.score,
                criteria: sub.grades.criteria_breakdown,
                comment: sub.grades.ai_comment ?? "",
              }
            : null,
        };
      });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/teacher/assignments"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Danh sách đề bài
        </Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight">
          {assignment.title}
          <Badge variant="secondary" className="rounded-md">
            {assignment.courses?.code} · Buổi {assignment.session_number}
          </Badge>
        </h1>
        {assignment.instructions && (
          <p className="mt-1 text-sm text-muted-foreground">
            Hướng dẫn chấm: {assignment.instructions}
          </p>
        )}
      </div>

      {classes.length === 0 ? (
        <p className="text-muted-foreground">
          Khóa này chưa có lớp nào — mở lớp trước rồi quay lại chấm.
        </p>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Chấm theo lớp</CardTitle>
            <CardDescription className="flex flex-wrap gap-2 pt-1">
              {classes.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/teacher/assignments/${assignment.id}?class=${cls.id}`}
                  className={cn(
                    "rounded-md border px-3 py-1 text-sm font-medium transition-colors",
                    cls.id === selectedClassId
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {cls.class_code}
                </Link>
              ))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Lớp này chưa có học viên.
              </p>
            ) : (
              <GradingBoard
                key={selectedClassId}
                assignmentId={assignment.id}
                classId={selectedClassId!}
                initialRows={rows}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
