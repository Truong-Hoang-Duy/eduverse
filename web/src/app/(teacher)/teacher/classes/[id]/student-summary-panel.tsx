"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateStudentSummary,
  type StudentSummary,
} from "@/lib/actions/reviews";

const SECTIONS: { key: keyof StudentSummary; label: string }[] = [
  { key: "qua_trinh_hoc", label: "Trong quá trình học" },
  { key: "diem_manh", label: "Điểm mạnh" },
  { key: "diem_yeu", label: "Điểm cần cải thiện" },
  { key: "dinh_huong", label: "Định hướng sắp tới" },
  { key: "kho_khan", label: "Khó khăn cần hỗ trợ" },
];

function toCopyText(studentName: string, summary: StudentSummary): string {
  return [
    `NHẬN XÉT TỔNG HỢP — ${studentName}`,
    "",
    ...SECTIONS.map((s) => `${s.label.toUpperCase()}:\n${summary[s.key]}`),
  ].join("\n\n");
}

export function StudentSummaryPanel({
  classId,
  students,
  lockedStudent,
}: {
  classId: string;
  students: { id: string; fullName: string }[];
  /** Trang hồ sơ 1 học viên: khóa cứng vào em này, ẩn dropdown chọn. */
  lockedStudent?: { id: string; fullName: string };
}) {
  const [studentId, setStudentId] = useState(lockedStudent?.id ?? "");
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startGenerate] = useTransition();

  const studentName =
    lockedStudent?.fullName ??
    students.find((s) => s.id === studentId)?.fullName ??
    "Học viên";

  function handleGenerate() {
    setError("");
    setSummary(null);
    setCopied(false);
    startGenerate(async () => {
      const res = await generateStudentSummary({ classId, studentId });
      if (res.error) {
        setError(res.error);
      } else {
        setSummary(res.summary ?? null);
      }
    });
  }

  async function handleCopy() {
    if (!summary) return;
    await navigator.clipboard.writeText(toCopyText(studentName, summary));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!lockedStudent && students.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {!lockedStudent && (
          <div className="min-w-56 space-y-1.5">
            <Label>Học viên</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn học viên" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          onClick={handleGenerate}
          disabled={pending || !studentId}
          size="sm"
        >
          {pending ? "AI đang tổng hợp..." : "Tổng hợp từ các buổi đã học"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary && (
        <div className="space-y-4 rounded-lg border p-4">
          <p className="font-semibold">{studentName}</p>
          <div className="divide-y">
            {SECTIONS.map((section) => (
              <div key={section.key} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold text-foreground">
                  {section.label}
                </p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {summary[section.key]}
                </p>
              </div>
            ))}
          </div>
          <Button onClick={handleCopy} size="sm" variant="outline">
            {copied ? "Đã copy nội dung" : "Copy nội dung"}
          </Button>
        </div>
      )}
    </div>
  );
}
