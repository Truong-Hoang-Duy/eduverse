"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gradeFiles, type GradeResult } from "@/lib/actions/grading";

import type { CourseChoice } from "./assignment-form";

export type { CourseChoice };

export interface AssignmentChoice {
  id: string;
  courseId: string;
  courseCode: string;
  sessionNumber: number;
  title: string;
}

/** Đọc File thành base64 (bỏ phần "data:...;base64," ở đầu). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error(`Không đọc được file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-destructive";
}

export function GradingTool({
  courses,
  assignments,
}: {
  courses: CourseChoice[];
  assignments: AssignmentChoice[];
}) {
  const [courseId, setCourseId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startGrade] = useTransition();

  const courseAssignments = assignments.filter((a) => a.courseId === courseId);

  function handleCourseChange(id: string) {
    setCourseId(id);
    setAssignmentId("");
    setGrade(null);
    setError("");
  }

  function handleGrade() {
    setError("");
    setGrade(null);
    setCopied(false);
    startGrade(async () => {
      try {
        const payload = await Promise.all(
          files.map(async (f) => ({
            name: f.name,
            mimeType: f.type,
            contentB64: await fileToBase64(f),
          }))
        );
        const res = await gradeFiles({ assignmentId, files: payload });
        if (res.error) setError(res.error);
        else setGrade(res.grade ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi khi đọc file.");
      }
    });
  }

  async function handleCopy() {
    if (!grade) return;
    const text = [
      `Điểm: ${grade.score}/100`,
      "",
      ...grade.bullets.map((b) => `- ${b}`),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const canGrade = Boolean(assignmentId) && files.length > 0 && !pending;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Khóa học *</Label>
          <Select value={courseId} onValueChange={handleCourseChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn khóa" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Đề bài *</Label>
          <Select
            value={assignmentId}
            onValueChange={setAssignmentId}
            disabled={!courseId}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !courseId
                    ? "Chọn khóa trước"
                    : courseAssignments.length === 0
                      ? "Khóa này chưa có đề"
                      : "Chọn đề"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {courseAssignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  Buổi {a.sessionNumber} — {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="submission-files">File bài làm của học sinh *</Label>
        <Input
          id="submission-files"
          type="file"
          multiple
          accept=".py,.js,.ts,.jsx,.tsx,.html,.css,.json,.java,.c,.cpp,.cs,.md,.txt,.sql,.pdf,.png,.jpg,.jpeg"
          onChange={(e) => {
            setFiles(Array.from(e.target.files ?? []));
            setGrade(null);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Chọn nhiều file của cùng một em. File không được lưu lại — chấm xong copy
          kết quả rồi chọn file của em tiếp theo.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleGrade} disabled={!canGrade}>
          {pending ? "AI đang chấm..." : "✨ Chấm bài"}
        </Button>
        {files.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {files.length} file: {files.map((f) => f.name).join(", ")}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {grade && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-lg border bg-muted/40 px-5 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">ĐIỂM</p>
              <p className={`text-3xl font-bold ${scoreColor(grade.score)}`}>
                {grade.score}
                <span className="text-base font-normal text-muted-foreground">
                  /100
                </span>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "✓ Đã copy" : "📋 Copy kết quả"}
            </Button>
          </div>
          <ul className="space-y-1.5">
            {grade.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-muted-foreground">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
