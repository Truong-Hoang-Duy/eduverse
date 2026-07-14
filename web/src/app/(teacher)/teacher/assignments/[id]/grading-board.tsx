"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  gradeSubmission,
  saveSubmission,
  updateGrade,
  type CriterionScore,
} from "@/lib/actions/grading";
import { createClient } from "@/lib/supabase/client";

export interface BoardRow {
  studentId: string;
  fullName: string;
  submission: { id: string; fileCount: number } | null;
  grade: {
    id: string;
    score: number;
    criteria: CriterionScore[];
    comment: string;
  } | null;
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-600 text-white";
  if (score >= 50) return "bg-yellow-500 text-white";
  return "bg-red-600 text-white";
}

export function GradingBoard({
  assignmentId,
  classId,
  initialRows,
}: {
  assignmentId: string;
  classId: string;
  initialRows: BoardRow[];
}) {
  const [rows, setRows] = useState<BoardRow[]>(initialRows);
  const [error, setError] = useState("");
  const [busyStudent, setBusyStudent] = useState("");
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [, startTransition] = useTransition();
  const [editingGrade, setEditingGrade] = useState<string | null>(null);

  function patchRow(studentId: string, patch: Partial<BoardRow>) {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r))
    );
  }

  async function handleUpload(studentId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setBusyStudent(studentId);
    try {
      const supabase = createClient();
      const paths: string[] = [];
      for (const file of Array.from(files)) {
        const path = `${assignmentId}/${studentId}/${Date.now()}-${sanitizeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from("submissions")
          .upload(path, file);
        if (upErr) {
          setError(`Upload thất bại: ${upErr.message}`);
          return;
        }
        paths.push(path);
      }
      const res = await saveSubmission({
        assignmentId,
        classId,
        studentId,
        filePaths: paths,
      });
      if (res.error) {
        setError(res.error);
      } else if (res.submissionId) {
        patchRow(studentId, {
          submission: { id: res.submissionId, fileCount: paths.length },
          grade: null, // bài mới nộp → điểm cũ (nếu có) không còn đúng
        });
      }
    } finally {
      setBusyStudent("");
    }
  }

  async function gradeOne(row: BoardRow): Promise<boolean> {
    if (!row.submission) return false;
    const res = await gradeSubmission(row.submission.id);
    if (res.error) {
      setError(`${row.fullName}: ${res.error}`);
      return false;
    }
    if (res.grade) {
      patchRow(row.studentId, {
        grade: {
          id: res.grade.gradeId,
          score: res.grade.score,
          criteria: res.grade.criteria,
          comment: res.grade.comment,
        },
      });
    }
    return true;
  }

  function handleGrade(row: BoardRow) {
    setError("");
    setBusyStudent(row.studentId);
    startTransition(async () => {
      await gradeOne(row);
      setBusyStudent("");
    });
  }

  function handleGradeAll() {
    const pending = rows.filter((r) => r.submission && !r.grade);
    if (pending.length === 0) {
      setError("Không có bài nào chờ chấm (đã chấm hết hoặc chưa có bài nộp).");
      return;
    }
    setError("");
    setBatch({ done: 0, total: pending.length });
    startTransition(async () => {
      let done = 0;
      for (const row of pending) {
        setBusyStudent(row.studentId);
        const ok = await gradeOne(row);
        done += 1;
        setBatch({ done, total: pending.length });
        if (!ok) break; // dừng khi lỗi (VD hết quota) để không phí request
      }
      setBusyStudent("");
      setBatch(null);
    });
  }

  async function handleSaveEdit(row: BoardRow, score: number, comment: string) {
    if (!row.grade) return;
    const res = await updateGrade({ gradeId: row.grade.id, score, comment });
    if (res.error) {
      setError(res.error);
      return;
    }
    patchRow(row.studentId, { grade: { ...row.grade, score, comment } });
    setEditingGrade(null);
  }

  function exportCsv() {
    const header = ["Họ tên", "Điểm", "Tiêu chí", "Nhận xét"];
    const lines = rows.map((r) => {
      const criteria = r.grade?.criteria
        .map((c) => `${c.criterion}: ${c.score}/${c.max}`)
        .join(" | ");
      return [
        r.fullName,
        r.grade ? String(r.grade.score) : r.submission ? "Chưa chấm" : "Chưa nộp",
        criteria ?? "",
        r.grade?.comment ?? "",
      ]
        .map((cell) => `"${cell.replaceAll('"', '""')}"`)
        .join(",");
    });
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bang-diem.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const gradedCount = rows.filter((r) => r.grade).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={handleGradeAll} disabled={Boolean(batch) || Boolean(busyStudent)}>
          {batch
            ? `Đang chấm ${batch.done}/${batch.total}...`
            : "✨ Chấm tất cả bài chưa chấm"}
        </Button>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={gradedCount === 0}>
          📄 Xuất CSV
        </Button>
        <span className="text-sm text-muted-foreground">
          Đã chấm {gradedCount}/{rows.length}
        </span>
      </div>

      {batch && <Progress value={(batch.done / batch.total) * 100} />}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.studentId} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-medium">{row.fullName}</span>
                {row.grade ? (
                  <Badge className={`${scoreColor(row.grade.score)} rounded-md`}>
                    {row.grade.score}/100
                  </Badge>
                ) : row.submission ? (
                  <Badge variant="secondary">
                    {row.submission.fileCount} file — chưa chấm
                  </Badge>
                ) : (
                  <Badge variant="outline">Chưa nộp bài</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer text-sm text-primary underline">
                  {row.submission ? "Nộp lại bài" : "Upload bài làm"}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".py,.js,.ts,.jsx,.tsx,.html,.css,.json,.java,.c,.cpp,.cs,.md,.txt,.sql,.pdf,.png,.jpg,.jpeg"
                    onChange={(e) => handleUpload(row.studentId, e.target.files)}
                    disabled={busyStudent === row.studentId}
                  />
                </label>
                {row.submission && (
                  <Button
                    size="sm"
                    variant={row.grade ? "outline" : "default"}
                    onClick={() => handleGrade(row)}
                    disabled={Boolean(busyStudent) || Boolean(batch)}
                  >
                    {busyStudent === row.studentId
                      ? "Đang xử lý..."
                      : row.grade
                        ? "Chấm lại"
                        : "✨ Chấm bài"}
                  </Button>
                )}
              </div>
            </div>

            {row.grade && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <div className="flex flex-wrap gap-2">
                  {row.grade.criteria.map((c) => (
                    <Badge key={c.criterion} variant="secondary" className="rounded-md">
                      {c.criterion}: {c.score}/{c.max}
                    </Badge>
                  ))}
                </div>
                {editingGrade === row.studentId ? (
                  <EditGradeForm
                    initialScore={row.grade.score}
                    initialComment={row.grade.comment}
                    onSave={(s, c) => handleSaveEdit(row, s, c)}
                    onCancel={() => setEditingGrade(null)}
                  />
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {row.grade.comment}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingGrade(row.studentId)}
                    >
                      ✏️ Sửa điểm / nhận xét
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditGradeForm({
  initialScore,
  initialComment,
  onSave,
  onCancel,
}: {
  initialScore: number;
  initialComment: string;
  onSave: (score: number, comment: string) => void;
  onCancel: () => void;
}) {
  const [score, setScore] = useState(String(initialScore));
  const [comment, setComment] = useState(initialComment);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
      <Textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(Number(score), comment)}>
          Lưu
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Hủy
        </Button>
      </div>
    </div>
  );
}
