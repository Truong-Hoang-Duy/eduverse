"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createSubstituteClassQuick,
  deleteSubstituteClassForm,
  type ImportedSubstituteSessionInput,
  listCurriculumTemplatesForSubstitute,
  type CurriculumTemplateOption,
} from "@/lib/actions/substitute-classes";
import {
  clearLmsRosterImport,
  type LmsRosterImportPayload,
  readLmsRosterImport,
} from "@/lib/lms-bridge";
import { createDefaultFinalEvaluation } from "@/lib/presentation-evaluation";
import { SESSION_FORMATS, type SessionFormat } from "@/lib/session-format";
import {
  countHandledInSubstituteSession,
  normalizeStudentNameKey,
  parseBulkStudentNames,
  type SubstituteClass,
} from "@/lib/substitute-classes";

import { LmsInstallDialog } from "../sessions/[id]/lms-install-dialog";

interface CourseChoice {
  id: string;
  code: string;
  name: string;
}

const CUSTOM_COURSE_VALUE = "__custom__";

export function SubstituteListClient({
  initialClasses,
  courses,
  autoImportFromLms = false,
}: {
  initialClasses: SubstituteClass[];
  courses: CourseChoice[];
  autoImportFromLms?: boolean;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [lmsInstallOpen, setLmsInstallOpen] = useState(false);
  const [lmsImportNotice, setLmsImportNotice] = useState("");

  // Form tạo lớp dạy thay mới
  const [classCode, setClassCode] = useState("");
  const [courseId, setCourseId] = useState<string>(CUSTOM_COURSE_VALUE);
  const [customCourseName, setCustomCourseName] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionNumber, setSessionNumber] = useState("1");
  const [sessionFormat, setSessionFormat] = useState<SessionFormat>("standard");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionContent, setSessionContent] = useState("");
  const [rawStudentNames, setRawStudentNames] = useState("");
  const [importedRoster, setImportedRoster] =
    useState<LmsRosterImportPayload | null>(null);
  const [includeImportedComments, setIncludeImportedComments] = useState(true);
  const [formError, setFormError] = useState("");
  const [creating, startCreate] = useTransition();

  // Gợi ý chép giáo án từ lớp cố định cùng khóa
  const [curriculumOptions, setCurriculumOptions] = useState<
    CurriculumTemplateOption[]
  >([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  const resetForm = useCallback(() => {
    setClassCode("");
    setCourseId(CUSTOM_COURSE_VALUE);
    setCustomCourseName("");
    setNotes("");
    setSessionNumber("1");
    setSessionFormat("standard");
    setSessionTitle("");
    setSessionContent("");
    setRawStudentNames("");
    setImportedRoster(null);
    setIncludeImportedComments(true);
    setFormError("");
    setCurriculumOptions([]);
  }, []);

  /** Tự khớp khóa học từ mã lớp (VD BH-CSA06 -> CSA, ONL-JSB12 -> JSB). */
  const guessCourseIdFromCode = useCallback(
    (code: string): string => {
      const upper = code.toUpperCase();
      const sorted = [...courses].sort((a, b) => b.code.length - a.code.length);
      const hit = sorted.find((c) => upper.includes(c.code.toUpperCase()));
      return hit ? hit.id : CUSTOM_COURSE_VALUE;
    },
    [courses]
  );

  const handleImportFromLms = useCallback(
    async (silentIfEmpty = false) => {
      setLmsImportNotice("");
      const res = await readLmsRosterImport();
      if (!res.installed) {
        if (!silentIfEmpty) setLmsInstallOpen(true);
        return;
      }
      if (!res.ok) {
        if (!silentIfEmpty) {
          setLmsImportNotice(res.error || "Không đọc được danh sách từ MindX LMS.");
        }
        return;
      }
      if (!res.roster || res.roster.students.length === 0) {
        if (!silentIfEmpty) {
          setLmsImportNotice(
            "Chưa có danh sách nào được gửi từ LMS. Hãy mở lớp trên MindX LMS rồi bấm nút \"📥 Đưa sang Dạy thay\" ở góc dưới-trái."
          );
        }
        return;
      }

      const r = res.roster;
      resetForm();
      setImportedRoster(r);
      setIncludeImportedComments(true);
      setClassCode(r.classCode || "");
      const guessedCourse =
        (r.classCode && guessCourseIdFromCode(r.classCode)) ||
        (r.courseShortName && guessCourseIdFromCode(r.courseShortName)) ||
        CUSTOM_COURSE_VALUE;
      setCourseId(guessedCourse);
      if (guessedCourse === CUSTOM_COURSE_VALUE && r.courseName) {
        setCustomCourseName(r.courseName);
      }

      const sessNum = r.sessionNumber ?? r.sessions?.[r.sessions.length - 1]?.sessionNumber ?? 1;
      setSessionNumber(String(sessNum));

      const activeImportedSession = r.sessions?.find(
        (s) => s.sessionNumber === sessNum
      );
      if (activeImportedSession?.title) {
        setSessionTitle(activeImportedSession.title);
      }
      if (activeImportedSession?.content) {
        setSessionContent(activeImportedSession.content);
      }
      if (activeImportedSession?.sessionFormat) {
        setSessionFormat(activeImportedSession.sessionFormat);
      } else if (sessNum === 5 || sessNum === 9) {
        setSessionFormat("periodic_test");
      } else if (sessNum === 14) {
        setSessionFormat("final_presentation");
      } else {
        setSessionFormat("standard");
      }
      setRawStudentNames(r.students.map((s) => s.fullName).join("\n"));
      setCreateOpen(true);
    },
    [guessCourseIdFromCode, resetForm]
  );

  // Khi bấm "📥 Đưa sang Dạy thay" từ MindX LMS → chuyển tới `/teacher/substitute?import=lms` → tự mở form nạp sẵn
  useEffect(() => {
    if (!autoImportFromLms) return;
    const timer = setTimeout(() => {
      void handleImportFromLms(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [autoImportFromLms, handleImportFromLms]);

  // Nạp danh sách giáo án cùng số buổi từ các lớp cố định khi đổi khóa học hoặc số buổi
  useEffect(() => {
    if (!createOpen) return;
    const num = Number(sessionNumber);
    if (!Number.isFinite(num) || num < 1) {
      setCurriculumOptions([]);
      return;
    }
    const targetCourseId =
      courseId !== CUSTOM_COURSE_VALUE ? courseId : null;
    if (!targetCourseId) {
      setCurriculumOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingCurriculum(true);
    listCurriculumTemplatesForSubstitute({
      courseId: targetCourseId,
      sessionNumber: num,
    })
      .then((opts) => {
        if (!cancelled) setCurriculumOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setCurriculumOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCurriculum(false);
      });

    return () => {
      cancelled = true;
    };
  }, [createOpen, courseId, sessionNumber]);

  const parsedCount = useMemo(
    () => parseBulkStudentNames(rawStudentNames).length,
    [rawStudentNames]
  );

  const filteredClasses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialClasses;
    return initialClasses.filter(
      (c) =>
        c.classCode.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q)
    );
  }, [initialClasses, query]);

  const totalSessionsCount = useMemo(
    () => initialClasses.reduce((sum, c) => sum + c.sessions.length, 0),
    [initialClasses]
  );

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const num = Number(sessionNumber);
    if (!classCode.trim()) {
      setFormError("Vui lòng nhập mã lớp dạy thay (VD: BH-CSA06, ONL-JSB12).");
      return;
    }
    if (!Number.isFinite(num) || num < 1 || num > 100) {
      setFormError("Số buổi hợp lệ từ 1 đến 100.");
      return;
    }

    const selectedCourse = courses.find((c) => c.id === courseId);
    const resolvedCourseName = selectedCourse
      ? `${selectedCourse.code} — ${selectedCourse.name}`
      : customCourseName.trim();

    const absentNames = importedRoster
      ? importedRoster.students
          .filter((s) => s.attendance === "absent")
          .map((s) => s.fullName)
      : [];

    // Đóng gói các buổi + nhận xét đã lưu kéo từ MindX LMS (nếu GV bật tùy chọn kéo nhận xét)
    const initialSessions: ImportedSubstituteSessionInput[] = [];
    if (importedRoster && includeImportedComments) {
      if (importedRoster.sessions && importedRoster.sessions.length > 0) {
        for (const impSess of importedRoster.sessions) {
          const reviewsByStudentName: Record<
            string,
            { comment?: string; isAbsent?: boolean }
          > = {};
          for (const st of impSess.students) {
            reviewsByStudentName[st.fullName] = {
              comment: st.comment,
              isAbsent: st.attendance === "absent",
            };
          }
          initialSessions.push({
            sessionNumber: impSess.sessionNumber,
            title: impSess.title,
            content: impSess.content,
            sessionDate: impSess.sessionDate,
            sessionFormat: impSess.sessionFormat,
            reviewsByStudentName,
          });
        }
      } else if (importedRoster.students.some((s) => Boolean(s.comment?.trim()))) {
        const reviewsByStudentName: Record<
          string,
          { comment?: string; isAbsent?: boolean }
        > = {};
        for (const st of importedRoster.students) {
          reviewsByStudentName[st.fullName] = {
            comment: st.comment,
            isAbsent: st.attendance === "absent",
          };
        }
        initialSessions.push({
          sessionNumber: num,
          title: sessionTitle.trim() || `Buổi ${num}`,
          content: sessionContent,
          sessionFormat,
          reviewsByStudentName,
        });
      }
    }

    startCreate(async () => {
      const res = await createSubstituteClassQuick({
        classCode,
        courseId: selectedCourse ? selectedCourse.id : null,
        courseName: resolvedCourseName,
        notes,
        sessionNumber: num,
        sessionTitle: sessionTitle.trim() || `Buổi ${num}`,
        sessionContent,
        sessionFormat,
        sessionDate: new Date().toISOString().slice(0, 10),
        rawStudentNames,
        absentNames,
        initialSessions: initialSessions.length > 0 ? initialSessions : undefined,
      });

      if (res.error || !res.id) {
        setFormError(res.error ?? "Không tạo được lớp dạy thay.");
        return;
      }

      // Lưu kèm nháp gradingSummary & 9 tiêu chí ĐNL (nếu có) vào localStorage theo đúng sessionId/studentId vừa tạo
      if (importedRoster && res.studentMap) {
        const sessionsList =
          importedRoster.sessions && importedRoster.sessions.length > 0
            ? importedRoster.sessions
            : [
                {
                  sessionNumber: num,
                  students: importedRoster.students,
                },
              ];

        for (const impSess of sessionsList) {
          const createdSessId =
            res.sessionIdsByNumber?.[impSess.sessionNumber] ??
            (impSess.sessionNumber === num ? res.sessionId : undefined);
          if (!createdSessId) continue;

          for (const s of impSess.students) {
            const sid = res.studentMap[normalizeStudentNameKey(s.fullName)];
            if (!sid) continue;

            if (s.gradingSummary?.trim()) {
              try {
                localStorage.setItem(
                  `eduverse_grading_summary_${createdSessId}_${sid}`,
                  s.gradingSummary.trim()
                );
              } catch {}
            }

            if (
              includeImportedComments &&
              s.dnlEvaluations &&
              Object.keys(s.dnlEvaluations).length > 0
            ) {
              try {
                const base = createDefaultFinalEvaluation(s.comment ?? "");
                base.dnl_evaluations = {
                  ...base.dnl_evaluations,
                  ...s.dnlEvaluations,
                };
                localStorage.setItem(
                  `eduverse_rubric_${createdSessId}_${sid}`,
                  JSON.stringify(base)
                );
              } catch {}
            }
          }
        }
        clearLmsRosterImport();
      }

      setCreateOpen(false);
      resetForm();
      router.push(
        res.sessionId
          ? `/teacher/substitute/${res.id}?session=${res.sessionId}`
          : `/teacher/substitute/${res.id}`
      );
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          <Link href="/teacher">← Quay lại Lớp học</Link>
        </Button>
      </div>

      <PageHeader
        title="🔄 Lớp dạy thay"
        description="Không gian tách riêng cho các lớp nhận dạy thay — không cần tạo tài khoản học viên, viết nhận xét AI & gửi sang MindX LMS như lớp cố định, xóa sạch bất cứ lúc nào."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleImportFromLms(false)}
              className="border-indigo-500/40 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300"
            >
              📥 Lấy lớp từ MindX LMS
            </Button>
            <Button
              type="button"
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
            >
              + Thêm lớp dạy thay
            </Button>
          </div>
        }
      />

      {lmsImportNotice && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {lmsImportNotice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Lớp dạy thay đang lưu"
          value={initialClasses.length}
          hint="Tách biệt hoàn toàn khỏi lớp cố định — xóa được ngay khi xong"
        />
        <StatCard
          label="Buổi dạy thay"
          value={totalSessionsCount}
          hint="Tự do thêm từng buổi lẻ, không sinh 14 buổi trống"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Danh sách lớp dạy thay
        </h2>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Tìm theo mã lớp, khóa học hoặc ghi chú..."
          className="h-9 w-full sm:max-w-xs"
        />
      </div>

      {filteredClasses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
          <p className="font-medium">
            {query
              ? `Không có lớp dạy thay nào khớp "${query}".`
              : "Chưa có lớp dạy thay nào"}
          </p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Bấm <strong>+ Thêm lớp dạy thay</strong> để dán nhanh danh sách học
            viên, hoặc mở lớp trên <strong>MindX LMS</strong> rồi bấm{" "}
            <strong>📥 Đưa sang Dạy thay</strong> để tự kéo toàn bộ danh sách
            và điểm danh sang đây trong 1 chạm.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => {
            const latestSession = cls.sessions[cls.sessions.length - 1];
            const latestHandled = latestSession
              ? countHandledInSubstituteSession(latestSession, cls.students)
              : 0;
            return (
              <Card
                key={cls.id}
                className="flex flex-col justify-between gap-3 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/teacher/substitute/${cls.id}`}
                      prefetch={true}
                      className="min-w-0 flex-1 group"
                    >
                      <CardTitle className="flex items-center gap-2 text-lg group-hover:text-primary transition-colors">
                        <span className="truncate font-mono">{cls.classCode}</span>
                        <Badge
                          variant="secondary"
                          className="shrink-0 text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                        >
                          Dạy thay
                        </Badge>
                      </CardTitle>
                    </Link>

                    <ConfirmDialog
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                          title="Xóa sạch lớp dạy thay này khi không dạy nữa"
                        >
                          🗑️ Xóa
                        </Button>
                      }
                      title={`Xóa lớp dạy thay ${cls.classCode}?`}
                      description={`Toàn bộ ${cls.sessions.length} buổi dạy thay, danh sách ${cls.students.length} học viên và nhận xét của lớp ${cls.classCode} sẽ bị xóa vĩnh viễn. Các lớp cố định của bạn không bị ảnh hưởng.`}
                      confirmLabel="Xóa lớp dạy thay"
                      action={deleteSubstituteClassForm}
                      fields={{ id: cls.id }}
                    />
                  </div>

                  {cls.courseName && (
                    <CardDescription className="truncate text-xs">
                      📚 {cls.courseName}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>👧 {cls.students.length} học viên</span>
                    <span>•</span>
                    <span>📅 {cls.sessions.length} buổi</span>
                    {latestSession && (
                      <>
                        <span>•</span>
                        <span>
                          Buổi {latestSession.sessionNumber}: {latestHandled}/
                          {cls.students.length} xong
                        </span>
                      </>
                    )}
                  </div>

                  {cls.sessions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {cls.sessions.map((s) => (
                        <Link
                          key={s.id}
                          href={`/teacher/substitute/${cls.id}?session=${s.id}`}
                          className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium hover:border-primary/50 hover:bg-primary/10 transition-colors"
                        >
                          Buổi {s.sessionNumber}
                        </Link>
                      ))}
                    </div>
                  )}

                  {cls.notes && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      📝 {cls.notes}
                    </p>
                  )}

                  <Button asChild size="sm" variant="outline" className="w-full cursor-pointer">
                    <Link href={`/teacher/substitute/${cls.id}`} prefetch={true}>
                      Mở lớp & viết nhận xét →
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog tạo lớp dạy thay mới */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {importedRoster
                ? `📥 Nạp lớp dạy thay từ MindX LMS (${importedRoster.students.length} HV)`
                : "🔄 Thêm lớp dạy thay mới"}
            </DialogTitle>
            <DialogDescription>
              Học viên không cần tài khoản CodeLuma. Xong lớp có thể xóa sạch bất
              cứ lúc nào mà không ảnh hưởng các lớp cố định.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {importedRoster && (() => {
              const impSessions = importedRoster.sessions ?? [];
              const savedCommentsCount =
                impSessions.length > 0
                  ? impSessions.reduce(
                      (sum, sess) =>
                        sum +
                        sess.students.filter(
                          (st) => Boolean(st.comment?.trim()) || Boolean(st.dnlEvaluations)
                        ).length,
                      0
                    )
                  : importedRoster.students.filter((st) => Boolean(st.comment?.trim())).length;
              const sessionNumsLabel = impSessions
                .map((s) => `Buổi ${s.sessionNumber}`)
                .join(", ");
              const absentCount = importedRoster.students.filter(
                (s) => s.attendance === "absent"
              ).length;

              return (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div>
                    ✓ Đã kéo <strong>{importedRoster.students.length} học viên</strong>{" "}
                    từ MindX LMS
                    {absentCount > 0 ? ` (tự động đánh vắng ${absentCount} em)` : ""}
                    {savedCommentsCount > 0
                      ? ` kèm ${savedCommentsCount} nhận xét đã lưu${sessionNumsLabel ? ` (${sessionNumsLabel})` : ""}`
                      : ""}
                    .
                  </div>
                  {savedCommentsCount > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={includeImportedComments}
                        onChange={(e) => setIncludeImportedComments(e.target.checked)}
                        className="size-3.5 rounded accent-emerald-600 cursor-pointer"
                      />
                      <span>
                        Kéo luôn toàn bộ {savedCommentsCount} nhận xét đã lưu
                        {impSessions.length > 1
                          ? ` (tạo đủ ${impSessions.length} buổi: ${sessionNumsLabel})`
                          : ""}{" "}
                        sang CodeLuma
                      </span>
                    </label>
                  )}
                </div>
              );
            })()}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sub-class-code">Mã lớp *</Label>
                <Input
                  id="sub-class-code"
                  value={classCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClassCode(val);
                    if (courseId === CUSTOM_COURSE_VALUE && !customCourseName) {
                      const guessed = guessCourseIdFromCode(val);
                      if (guessed !== CUSTOM_COURSE_VALUE) setCourseId(guessed);
                    }
                  }}
                  placeholder="VD: BH-CSA06, ONL-JSB12"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sub-course">Khóa học</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="sub-course" className="w-full">
                    <SelectValue placeholder="Chọn khóa học" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM_COURSE_VALUE}>
                      Nhập tên môn khác...
                    </SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {courseId === CUSTOM_COURSE_VALUE && (
              <div className="space-y-1.5">
                <Label htmlFor="sub-custom-course">Tên khóa / môn học (tùy chọn)</Label>
                <Input
                  id="sub-custom-course"
                  value={customCourseName}
                  onChange={(e) => setCustomCourseName(e.target.value)}
                  placeholder="VD: Computer Science Advance, Web Basic..."
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sub-session-num">Buổi dạy thay *</Label>
                <Input
                  id="sub-session-num"
                  type="number"
                  min={1}
                  max={100}
                  value={sessionNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSessionNumber(val);
                    const n = Number(val);
                    if (n === 5 || n === 9) setSessionFormat("periodic_test");
                    else if (n === 14) setSessionFormat("final_presentation");
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sub-session-format">Hình thức buổi</Label>
                <Select
                  value={sessionFormat}
                  onValueChange={(v) => setSessionFormat(v as SessionFormat)}
                >
                  <SelectTrigger id="sub-session-format" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SESSION_FORMATS) as SessionFormat[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {SESSION_FORMATS[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Chép nhanh giáo án từ lớp cố định cùng khóa */}
            {curriculumOptions.length > 0 && (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-medium text-primary">
                  📋 Chép nhanh nội dung Buổi {sessionNumber} từ lớp cố định cùng khóa:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {curriculumOptions.map((opt) => (
                    <Button
                      key={opt.classCode}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSessionTitle(opt.title);
                        setSessionContent(opt.content);
                        setSessionFormat(opt.sessionFormat);
                      }}
                    >
                      Lấy từ {opt.classCode}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {loadingCurriculum && (
              <p className="text-xs text-muted-foreground">
                Đang tìm giáo án buổi {sessionNumber} ở các lớp cùng khóa...
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="sub-title">Tiêu đề buổi học (tùy chọn)</Label>
              <Input
                id="sub-title"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder={`VD: Buổi ${sessionNumber || 1}: Ôn tập & thực hành`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-content">
                Nội dung kiến thức buổi học (tùy chọn — có thể điền sau)
              </Label>
              <Textarea
                id="sub-content"
                rows={3}
                value={sessionContent}
                onChange={(e) => setSessionContent(e.target.value)}
                placeholder="VD: Ôn tập vòng lặp, xây dựng bài toán phân tích dữ liệu..."
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sub-students">
                  Danh sách học viên (mỗi dòng 1 em — không cần tài khoản)
                </Label>
                <span className="text-xs text-muted-foreground">
                  {parsedCount} học viên
                </span>
              </div>
              <Textarea
                id="sub-students"
                rows={5}
                value={rawStudentNames}
                onChange={(e) => setRawStudentNames(e.target.value)}
                placeholder={"Nguyễn Văn An\nTrần Minh\nLê Đỗ Minh Khôi"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-notes">Ghi chú (tùy chọn)</Label>
              <Input
                id="sub-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: Dạy thay thầy Minh — chiều thứ 7"
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Đang tạo..." : "Tạo lớp dạy thay"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <LmsInstallDialog
        open={lmsInstallOpen}
        onOpenChange={setLmsInstallOpen}
      />
    </div>
  );
}
