"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { CollapsibleCard } from "@/components/collapsible-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { ACADEMIC_LEVELS } from "@/lib/academic-levels";
import type { ReviewCombo } from "@/lib/actions/review-combos";
import type { PriorReviewHistoryItem } from "@/lib/actions/reviews";
import {
  addSubstituteStudents,
  createSubstituteSession,
  deleteSubstituteClassForm,
  deleteSubstituteSessionForm,
  type ImportedSubstituteSessionInput,
  listCurriculumTemplatesForSubstitute,
  removeSubstituteStudentForm,
  saveSubstituteStudentReview,
  syncSubstituteRosterFromLms,
  updateSubstituteClass,
  updateSubstituteSession,
  updateSubstituteStudent,
  type CurriculumTemplateOption,
} from "@/lib/actions/substitute-classes";
import { generateSubstituteZaloSummary } from "@/lib/actions/zalo";
import {
  clearLmsRosterImport,
  readLmsRosterImport,
} from "@/lib/lms-bridge";
import { createDefaultFinalEvaluation } from "@/lib/presentation-evaluation";
import {
  resolveSessionFormat,
  SESSION_FORMATS,
  type SessionFormat,
} from "@/lib/session-format";
import {
  countHandledInSubstituteSession,
  normalizeStudentNameKey,
  parseBulkStudentNames,
  type SubstituteClass,
} from "@/lib/substitute-classes";
import { cn } from "@/lib/utils";

import { LmsInstallDialog } from "../../sessions/[id]/lms-install-dialog";
import type { ReviewOptionItem } from "../../sessions/[id]/review-editor";
import { ReviewList, type StudentForReview } from "../../sessions/[id]/review-list";
import type { ExistingReview, PriorSelection } from "../../sessions/[id]/review-status";
import { type TemplateChoice, ZaloPanel } from "../../sessions/[id]/zalo-panel";

interface CourseChoice {
  id: string;
  code: string;
  name: string;
}

const CUSTOM_COURSE_VALUE = "__custom__";

export function SubstituteDetailClient({
  substituteClass,
  initialSessionId,
  courses,
  options,
  templates,
  combos,
  teacherName,
}: {
  substituteClass: SubstituteClass;
  initialSessionId: string | null;
  courses: CourseChoice[];
  options: ReviewOptionItem[];
  templates: TemplateChoice[];
  combos: ReviewCombo[];
  teacherName: string;
}) {
  const router = useRouter();

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    if (
      initialSessionId &&
      substituteClass.sessions.some((s) => s.id === initialSessionId)
    ) {
      return initialSessionId;
    }
    return (
      substituteClass.sessions[substituteClass.sessions.length - 1]?.id ?? ""
    );
  });

  // Giữ activeSessionId hợp lệ sau khi thêm hoặc xóa buổi
  useEffect(() => {
    if (
      substituteClass.sessions.length > 0 &&
      !substituteClass.sessions.some((s) => s.id === activeSessionId)
    ) {
      setActiveSessionId(
        substituteClass.sessions[substituteClass.sessions.length - 1].id
      );
    }
  }, [substituteClass.sessions, activeSessionId]);

  const activeSession = useMemo(
    () =>
      substituteClass.sessions.find((s) => s.id === activeSessionId) ??
      substituteClass.sessions[0] ??
      null,
    [substituteClass.sessions, activeSessionId]
  );

  // --- Dialog Sửa thông tin lớp dạy thay ---
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [editCode, setEditCode] = useState(substituteClass.classCode);
  const [editCourseId, setEditCourseId] = useState(
    substituteClass.courseId ?? CUSTOM_COURSE_VALUE
  );
  const [editCourseName, setEditCourseName] = useState(substituteClass.courseName);
  const [editNotes, setEditNotes] = useState(substituteClass.notes ?? "");
  const [editClassMsg, setEditClassMsg] = useState("");
  const [savingClass, startSaveClass] = useTransition();

  // --- Dialog Thêm buổi dạy thay mới ---
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const suggestedNextSession = useMemo(() => {
    if (substituteClass.sessions.length === 0) return 1;
    const max = Math.max(
      ...substituteClass.sessions.map((s) => s.sessionNumber)
    );
    return Math.min(100, max + 1);
  }, [substituteClass.sessions]);
  const [newSessNum, setNewSessNum] = useState(String(suggestedNextSession));
  const [newSessFormat, setNewSessFormat] = useState<SessionFormat>("standard");
  const [newSessTitle, setNewSessTitle] = useState("");
  const [newSessContent, setNewSessContent] = useState("");
  const [newSessError, setNewSessError] = useState("");
  const [creatingSession, startCreateSession] = useTransition();

  // --- Quản lý học viên ---
  const [bulkNames, setBulkNames] = useState("");
  const [rosterMsg, setRosterMsg] = useState("");
  const [rosterErr, setRosterErr] = useState("");
  const [addingStudents, startAddStudents] = useTransition();
  const [lmsInstallOpen, setLmsInstallOpen] = useState(false);

  // --- Chỉnh sửa thông tin buổi đang chọn ---
  const [sessTitle, setSessTitle] = useState(activeSession?.title ?? "");
  const [sessContent, setSessContent] = useState(activeSession?.content ?? "");
  const [sessContext, setSessContext] = useState(
    activeSession?.reviewContext ?? ""
  );
  const [sessDate, setSessDate] = useState(activeSession?.sessionDate ?? "");
  const [sessFormat, setSessFormat] = useState<SessionFormat>(() =>
    activeSession
      ? resolveSessionFormat({
          session_number: activeSession.sessionNumber,
          is_periodic_test: activeSession.isPeriodicTest,
          is_project_period: activeSession.isProjectPeriod,
          is_final_presentation: activeSession.isFinalPresentation,
        })
      : "standard"
  );
  const [sessSaveMsg, setSessSaveMsg] = useState("");
  const [sessSaveErr, setSessSaveErr] = useState("");
  const [savingSession, startSaveSession] = useTransition();

  // Gợi ý chép giáo án từ lớp cố định cùng khóa cho buổi đang mở
  const [curriculumOptions, setCurriculumOptions] = useState<
    CurriculumTemplateOption[]
  >([]);

  useEffect(() => {
    if (!activeSession) return;
    setSessTitle(activeSession.title ?? "");
    setSessContent(activeSession.content ?? "");
    setSessContext(activeSession.reviewContext ?? "");
    setSessDate(activeSession.sessionDate ?? "");
    setSessFormat(
      resolveSessionFormat({
        session_number: activeSession.sessionNumber,
        is_periodic_test: activeSession.isPeriodicTest,
        is_project_period: activeSession.isProjectPeriod,
        is_final_presentation: activeSession.isFinalPresentation,
      })
    );
    setSessSaveMsg("");
    setSessSaveErr("");

    let cancelled = false;
    listCurriculumTemplatesForSubstitute({
      courseId: substituteClass.courseId,
      sessionNumber: activeSession.sessionNumber,
    })
      .then((opts) => {
        if (!cancelled) setCurriculumOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setCurriculumOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSession, substituteClass.courseId]);

  // --- Dữ liệu truyền vào ReviewList ---
  const studentsForReview: StudentForReview[] = useMemo(
    () =>
      substituteClass.students.map((s) => ({
        id: s.id,
        full_name: s.full_name,
        academic_level: s.academic_level,
      })),
    [substituteClass.students]
  );

  const reviewByStudentId = useMemo(() => {
    const map = new Map<string, ExistingReview>();
    if (!activeSession) return map;
    for (const [sid, rev] of Object.entries(activeSession.reviews)) {
      map.set(sid, {
        strengths: rev.strengths,
        improvements: rev.improvements,
        ai_generated_comment: rev.ai_generated_comment,
        is_absent: rev.is_absent,
      });
    }
    return map;
  }, [activeSession]);

  // Tổng hợp lịch sử từ các buổi dạy thay trước (nếu GV đã dạy thay lớp này nhiều buổi)
  const {
    priorCommentsByStudentId,
    priorSelectionsByStudentId,
    allPriorReviewsByStudentId,
  } = useMemo(() => {
    const commentsMap = new Map<string, string[]>();
    const selectionsMap = new Map<string, PriorSelection[]>();
    const historyMap = new Map<string, PriorReviewHistoryItem[]>();

    if (!activeSession) {
      return {
        priorCommentsByStudentId: commentsMap,
        priorSelectionsByStudentId: selectionsMap,
        allPriorReviewsByStudentId: historyMap,
      };
    }

    const earlierSessions = substituteClass.sessions
      .filter((s) => s.sessionNumber < activeSession.sessionNumber)
      .sort((a, b) => a.sessionNumber - b.sessionNumber);

    for (const prev of earlierSessions) {
      for (const [sid, rev] of Object.entries(prev.reviews)) {
        const hist = historyMap.get(sid) ?? [];
        hist.push({
          session_number: prev.sessionNumber,
          session_title: prev.title ?? `Buổi ${prev.sessionNumber}`,
          session_content: prev.content ?? null,
          strengths: rev.strengths,
          improvements: rev.improvements,
          comment: rev.ai_generated_comment,
          is_absent: rev.is_absent,
        });
        historyMap.set(sid, hist);

        if (rev.is_absent) continue;
        if (rev.ai_generated_comment) {
          const list = commentsMap.get(sid) ?? [];
          list.push(`Buổi ${prev.sessionNumber}: ${rev.ai_generated_comment}`);
          commentsMap.set(sid, list.slice(-3));
        }
        if (rev.strengths.length > 0 || rev.improvements.length > 0) {
          const sels = selectionsMap.get(sid) ?? [];
          sels.push({
            sessionNumber: prev.sessionNumber,
            strengths: rev.strengths,
            improvements: rev.improvements,
          });
          selectionsMap.set(sid, sels.slice(-5));
        }
      }
    }

    return {
      priorCommentsByStudentId: commentsMap,
      priorSelectionsByStudentId: selectionsMap,
      allPriorReviewsByStudentId: historyMap,
    };
  }, [activeSession, substituteClass.sessions]);

  function handleSaveClassMeta(e: React.FormEvent) {
    e.preventDefault();
    setEditClassMsg("");
    const selectedCourse = courses.find((c) => c.id === editCourseId);
    const resolvedName = selectedCourse
      ? `${selectedCourse.code} — ${selectedCourse.name}`
      : editCourseName.trim();

    startSaveClass(async () => {
      const res = await updateSubstituteClass({
        id: substituteClass.id,
        classCode: editCode,
        courseId: selectedCourse ? selectedCourse.id : null,
        courseName: resolvedName,
        notes: editNotes,
      });
      if (res.error) {
        setEditClassMsg(res.error);
      } else {
        setEditClassOpen(false);
        router.refresh();
      }
    });
  }

  function handleAddStudentsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRosterMsg("");
    setRosterErr("");
    startAddStudents(async () => {
      const res = await addSubstituteStudents({
        substituteClassId: substituteClass.id,
        rawNames: bulkNames,
      });
      if (res.error) {
        setRosterErr(res.error);
      } else {
        setBulkNames("");
        setRosterMsg(`✓ Đã thêm ${res.addedCount ?? 0} học viên vào lớp.`);
        router.refresh();
      }
    });
  }

  async function handleSyncFromLms() {
    setRosterMsg("");
    setRosterErr("");
    const res = await readLmsRosterImport();
    if (!res.installed) {
      setLmsInstallOpen(true);
      return;
    }
    if (!res.ok) {
      setRosterErr(res.error || "Không đọc được danh sách từ MindX LMS.");
      return;
    }
    if (!res.roster || res.roster.students.length === 0) {
      setRosterErr(
        "Chưa có danh sách nào gửi từ MindX LMS. Mở lớp trên LMS rồi bấm \"📥 Đưa sang Dạy thay\" trước nhé."
      );
      return;
    }

    const r = res.roster;
    const importedSessions: ImportedSubstituteSessionInput[] =
      r.sessions && r.sessions.length > 0
        ? r.sessions.map((impSess) => ({
            sessionNumber: impSess.sessionNumber,
            title: impSess.title,
            content: impSess.content,
            sessionDate: impSess.sessionDate,
            sessionFormat: impSess.sessionFormat,
            reviewsByStudentName: Object.fromEntries(
              impSess.students.map((st) => [
                st.fullName,
                {
                  comment: st.comment,
                  isAbsent: st.attendance === "absent",
                },
              ])
            ),
          }))
        : [];

    startAddStudents(async () => {
      const syncRes = await syncSubstituteRosterFromLms({
        substituteClassId: substituteClass.id,
        sessionId: activeSession?.id,
        students: r.students.map((s) => ({
          fullName: s.fullName,
          isAbsent: s.attendance === "absent",
          comment: s.comment,
        })),
        importedSessions: importedSessions.length > 0 ? importedSessions : undefined,
      });
      if (syncRes.error) {
        setRosterErr(syncRes.error);
        return;
      }

      // Lưu gradingSummary & ĐNL từ MindX LMS vào localStorage theo từng buổi đã đồng bộ
      if (syncRes.studentMap) {
        const sourceSessions =
          r.sessions && r.sessions.length > 0
            ? r.sessions
            : activeSession
              ? [{ sessionNumber: activeSession.sessionNumber, students: r.students }]
              : [];

        for (const impSess of sourceSessions) {
          const sessId =
            syncRes.sessionIdsByNumber?.[impSess.sessionNumber] ??
            (activeSession?.sessionNumber === impSess.sessionNumber
              ? activeSession.id
              : undefined);
          if (!sessId) continue;

          for (const s of impSess.students) {
            const sid = syncRes.studentMap[normalizeStudentNameKey(s.fullName)];
            if (!sid) continue;
            if (s.gradingSummary?.trim()) {
              try {
                localStorage.setItem(
                  `eduverse_grading_summary_${sessId}_${sid}`,
                  s.gradingSummary.trim()
                );
              } catch {}
            }
            if (s.dnlEvaluations && Object.keys(s.dnlEvaluations).length > 0) {
              try {
                const base = createDefaultFinalEvaluation(s.comment ?? "");
                base.dnl_evaluations = {
                  ...base.dnl_evaluations,
                  ...s.dnlEvaluations,
                };
                localStorage.setItem(
                  `eduverse_rubric_${sessId}_${sid}`,
                  JSON.stringify(base)
                );
              } catch {}
            }
          }
        }
      }
      clearLmsRosterImport();
      const parts: string[] = [];
      if ((syncRes.addedCount ?? 0) > 0) {
        parts.push(`thêm ${syncRes.addedCount} HV mới`);
      }
      if ((syncRes.createdSessionsCount ?? 0) > 0) {
        parts.push(`tạo thêm ${syncRes.createdSessionsCount} buổi từ LMS`);
      }
      if ((syncRes.importedCommentsCount ?? 0) > 0) {
        parts.push(`kéo ${syncRes.importedCommentsCount} nhận xét đã lưu`);
      }
      setRosterMsg(
        parts.length > 0
          ? `✓ Đã đồng bộ từ MindX LMS (${parts.join(", ")}).`
          : "✓ Đã đồng bộ từ MindX LMS (danh sách & nhận xét đã đầy đủ)."
      );
      router.refresh();
    });
  }

  function handleCreateSessionSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNewSessError("");
    const num = Number(newSessNum);
    if (!Number.isFinite(num) || num < 1 || num > 100) {
      setNewSessError("Số buổi hợp lệ từ 1 đến 100.");
      return;
    }

    startCreateSession(async () => {
      const res = await createSubstituteSession({
        substituteClassId: substituteClass.id,
        sessionNumber: num,
        title: newSessTitle.trim() || `Buổi ${num}`,
        content: newSessContent,
        sessionFormat: newSessFormat,
        sessionDate: new Date().toISOString().slice(0, 10),
      });
      if (res.error || !res.sessionId) {
        setNewSessError(res.error ?? "Không thêm được buổi.");
        return;
      }
      setAddSessionOpen(false);
      setNewSessTitle("");
      setNewSessContent("");
      setActiveSessionId(res.sessionId);
      router.refresh();
    });
  }

  function handleSaveSessionInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSession) return;
    setSessSaveMsg("");
    setSessSaveErr("");
    startSaveSession(async () => {
      const res = await updateSubstituteSession({
        substituteClassId: substituteClass.id,
        sessionId: activeSession.id,
        title: sessTitle,
        content: sessContent,
        reviewContext: sessContext,
        sessionDate: sessDate,
        sessionFormat: sessFormat,
      });
      if (res.error) {
        setSessSaveErr(res.error);
      } else {
        setSessSaveMsg(res.success ?? "Đã lưu.");
        router.refresh();
      }
    });
  }

  async function handleInlineLevelChange(studentId: string, level: string | null) {
    await updateSubstituteStudent({
      substituteClassId: substituteClass.id,
      studentId,
      academicLevel: level,
    });
    router.refresh();
  }

  const parsedBulkCount = useMemo(
    () => parseBulkStudentNames(bulkNames).length,
    [bulkNames]
  );

  const isPeriodicTest = sessFormat === "periodic_test";
  const isProjectPeriod = sessFormat === "project_period";
  const isFinalPresentation = sessFormat === "final_presentation";
  const isFinalSession = Boolean(
    activeSession && activeSession.sessionNumber === 14
  );

  return (
    <div className="space-y-6">
      {/* Thanh điều hướng + Sửa + Xóa sạch lớp dạy thay */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm" className="cursor-pointer">
          <Link href="/teacher/substitute">← Danh sách dạy thay</Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditCode(substituteClass.classCode);
              setEditCourseId(substituteClass.courseId ?? CUSTOM_COURSE_VALUE);
              setEditCourseName(substituteClass.courseName);
              setEditNotes(substituteClass.notes ?? "");
              setEditClassMsg("");
              setEditClassOpen(true);
            }}
          >
            ✏️ Sửa lớp
          </Button>

          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                🗑️ Xóa lớp dạy thay
              </Button>
            }
            title={`Xóa lớp dạy thay ${substituteClass.classCode}?`}
            description={`Toàn bộ ${substituteClass.sessions.length} buổi dạy thay, danh sách ${substituteClass.students.length} học viên và nhận xét của lớp ${substituteClass.classCode} sẽ bị xóa vĩnh viễn. Các lớp cố định không bị ảnh hưởng.`}
            confirmLabel="Xóa sạch lớp này"
            action={deleteSubstituteClassForm}
            fields={{
              id: substituteClass.id,
              redirect_to: "/teacher/substitute",
            }}
          />
        </div>
      </div>

      {/* Tiêu đề lớp dạy thay */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight font-mono">
            {substituteClass.classCode}
          </h1>
          <Badge
            variant="secondary"
            className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
          >
            🔄 Lớp dạy thay
          </Badge>
          {substituteClass.courseName && (
            <Badge variant="outline">📚 {substituteClass.courseName}</Badge>
          )}
        </div>
        {substituteClass.notes && (
          <p className="text-sm text-muted-foreground">
            📝 {substituteClass.notes}
          </p>
        )}
      </div>

      {/* Khối 1: Quản lý danh sách học viên không cần tài khoản */}
      <CollapsibleCard
        title={`👧 Danh sách học viên (${substituteClass.students.length})`}
        description="Không cần tạo tài khoản — thêm lẻ, dán danh sách, sửa học lực hoặc kéo 1 chạm từ MindX LMS."
        defaultOpen={substituteClass.students.length === 0}
      >
        <div className="space-y-4">
          <form onSubmit={handleAddStudentsSubmit} className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="bulk-add-students">
                Thêm học viên (dán mỗi dòng 1 tên)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSyncFromLms()}
                className="h-7 text-xs border-indigo-500/40 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300"
              >
                📥 Đồng bộ từ MindX LMS
              </Button>
            </div>
            <Textarea
              id="bulk-add-students"
              rows={3}
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              placeholder={"Nguyễn Văn An\nTrần Thị Bình\nLê Đỗ Minh Khôi"}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={addingStudents || parsedBulkCount === 0}
              >
                {addingStudents
                  ? "Đang thêm..."
                  : `+ Thêm ${parsedBulkCount > 0 ? `${parsedBulkCount} ` : ""}học viên`}
              </Button>
              {rosterMsg && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {rosterMsg}
                </span>
              )}
              {rosterErr && (
                <span className="text-xs font-medium text-destructive">
                  {rosterErr}
                </span>
              )}
            </div>
          </form>

          {substituteClass.students.length > 0 && (
            <div className="divide-y rounded-lg border">
              {substituteClass.students.map((student, idx) => (
                <div
                  key={student.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground w-6">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium truncate">
                      {student.full_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={student.academic_level ?? "__none__"}
                      onValueChange={(val) =>
                        void handleInlineLevelChange(
                          student.id,
                          val === "__none__" ? null : val
                        )
                      }
                    >
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue placeholder="Học lực" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Chưa xếp loại</SelectItem>
                        {ACADEMIC_LEVELS.map((lv) => (
                          <SelectItem key={lv.value} value={lv.value}>
                            {lv.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <ConfirmDialog
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          Xóa
                        </Button>
                      }
                      title={`Xóa ${student.full_name} khỏi lớp dạy thay?`}
                      description="Học viên này và các nhận xét của em trong lớp dạy thay này sẽ bị xóa."
                      confirmLabel="Xóa học viên"
                      action={removeSubstituteStudentForm}
                      fields={{
                        substitute_class_id: substituteClass.id,
                        student_id: student.id,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* Khối 2: Thanh chọn buổi dạy thay */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1">
            Buổi dạy thay:
          </span>
          {substituteClass.sessions.map((s) => {
            const isActive = activeSession?.id === s.id;
            const done = countHandledInSubstituteSession(
              s,
              substituteClass.students
            );
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSessionId(s.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-background hover:border-primary/40"
                )}
              >
                Buổi {s.sessionNumber}{" "}
                <span className="opacity-80 font-normal">
                  ({done}/{substituteClass.students.length})
                </span>
              </button>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const next = suggestedNextSession;
              setNewSessNum(String(next));
              setNewSessFormat(
                next === 5 || next === 9
                  ? "periodic_test"
                  : next === 14
                    ? "final_presentation"
                    : "standard"
              );
              setNewSessTitle("");
              setNewSessContent("");
              setNewSessError("");
              setAddSessionOpen(true);
            }}
          >
            + Thêm buổi
          </Button>
        </div>

        {activeSession && (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                🗑️ Xóa Buổi {activeSession.sessionNumber}
              </Button>
            }
            title={`Xóa Buổi ${activeSession.sessionNumber} của lớp ${substituteClass.classCode}?`}
            description="Nội dung buổi học và toàn bộ nhận xét học viên của buổi này sẽ bị xóa. Danh sách học viên và các buổi khác vẫn giữ nguyên."
            confirmLabel="Xóa buổi này"
            action={deleteSubstituteSessionForm}
            fields={{
              substitute_class_id: substituteClass.id,
              session_id: activeSession.id,
            }}
          />
        )}
      </div>

      {!activeSession ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
          <p className="font-medium">Chưa có buổi dạy thay nào trong lớp này</p>
          <Button
            type="button"
            onClick={() => {
              setNewSessNum("1");
              setNewSessFormat("standard");
              setAddSessionOpen(true);
            }}
          >
            + Thêm buổi dạy thay đầu tiên
          </Button>
        </div>
      ) : (
        <>
          {/* Khối 3: Thông tin buổi học (có chép nhanh từ lớp cố định cùng khóa) */}
          <CollapsibleCard
            title={`📘 Nội dung Buổi ${activeSession.sessionNumber}: ${sessTitle || `Buổi ${activeSession.sessionNumber}`}`}
            description="Điều chỉnh tiêu đề, nội dung bài học, bối cảnh & hình thức buổi (AI sẽ dùng thông tin này để viết nhận xét)."
            defaultOpen={!activeSession.content}
          >
            <form onSubmit={handleSaveSessionInfo} className="space-y-4">
              {curriculumOptions.length > 0 && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-primary">
                    📋 Chép nhanh giáo án Buổi {activeSession.sessionNumber} từ lớp cố định cùng khóa:
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
                          setSessTitle(opt.title);
                          setSessContent(opt.content);
                          setSessFormat(opt.sessionFormat);
                        }}
                      >
                        Lấy từ {opt.classCode}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="detail-sess-title">Tiêu đề buổi</Label>
                  <Input
                    id="detail-sess-title"
                    value={sessTitle}
                    onChange={(e) => setSessTitle(e.target.value)}
                    placeholder={`Buổi ${activeSession.sessionNumber}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="detail-sess-format">Hình thức buổi</Label>
                  <Select
                    value={sessFormat}
                    onValueChange={(v) => setSessFormat(v as SessionFormat)}
                  >
                    <SelectTrigger id="detail-sess-format" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SESSION_FORMATS) as SessionFormat[]).map(
                        (k) => (
                          <SelectItem key={k} value={k}>
                            {SESSION_FORMATS[k].label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="detail-sess-date">Ngày dạy thay</Label>
                  <Input
                    id="detail-sess-date"
                    type="date"
                    value={sessDate}
                    onChange={(e) => setSessDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detail-sess-content">
                  Nội dung kiến thức buổi học (đi vào nhận xét & tin Zalo)
                </Label>
                <Textarea
                  id="detail-sess-content"
                  rows={3}
                  value={sessContent}
                  onChange={(e) => setSessContent(e.target.value)}
                  placeholder="VD: Thực hành xây dựng mô hình hồi quy tuyến tính và vẽ biểu đồ đánh giá kết quả..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="detail-sess-context">
                  Bối cảnh buổi học cho AI tham khảo (tùy chọn — không gửi phụ huynh)
                </Label>
                <Input
                  id="detail-sess-context"
                  value={sessContext}
                  onChange={(e) => setSessContext(e.target.value)}
                  placeholder="VD: Hôm nay lớp làm bài kiểm tra thực hành 45 phút..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="sm" disabled={savingSession}>
                  {savingSession ? "Đang lưu..." : "Lưu thông tin buổi"}
                </Button>
                {sessSaveMsg && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ✓ {sessSaveMsg}
                  </span>
                )}
                {sessSaveErr && (
                  <span className="text-xs font-medium text-destructive">
                    {sessSaveErr}
                  </span>
                )}
              </div>
            </form>
          </CollapsibleCard>

          {/* Khối 4: Nhận xét từng học viên (tái sử dụng trọn vẹn ReviewList + ReviewEditor + LMS Bridge) */}
          <Card>
            <CardHeader>
              <CardTitle>
                ✍️ Nhận xét học viên — Buổi {activeSession.sessionNumber}
              </CardTitle>
              <CardDescription>
                Dùng chung Bộ Combo nhận xét, AI viết nhận xét (tự nhận diện bối
                cảnh dạy thay để không bịa lịch sử buổi cũ), Bảng 9 ĐNL và nút{" "}
                <strong>🚀 Gửi cả lớp sang LMS</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentsForReview.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có học viên nào — hãy mở khối{" "}
                  <strong>👧 Danh sách học viên</strong> ở trên để dán tên hoặc
                  đồng bộ từ MindX LMS.
                </p>
              ) : (
                <ReviewList
                  sessionId={activeSession.id}
                  sessionNumber={activeSession.sessionNumber}
                  sessionTitle={
                    sessTitle.trim() || `Buổi ${activeSession.sessionNumber}`
                  }
                  sessionContent={sessContent}
                  sessionContext={sessContext}
                  isPeriodicTest={isPeriodicTest}
                  isProjectPeriod={isProjectPeriod}
                  isFinalPresentation={isFinalPresentation}
                  isFinalSession={isFinalSession}
                  classCode={substituteClass.classCode}
                  courseName={substituteClass.courseName}
                  students={studentsForReview}
                  options={options}
                  reviewByStudentId={reviewByStudentId}
                  priorCommentsByStudentId={priorCommentsByStudentId}
                  priorSelectionsByStudentId={priorSelectionsByStudentId}
                  allPriorReviewsByStudentId={allPriorReviewsByStudentId}
                  combos={combos}
                  saveAction={saveSubstituteStudentReview}
                  extraHiddenFields={{
                    substitute_class_id: substituteClass.id,
                  }}
                  onAcademicLevelChange={handleInlineLevelChange}
                  isSubstituteTeaching={true}
                />
              )}
            </CardContent>
          </Card>

          {/* Khối 5: Tin nhắn Zalo tổng hợp cả lớp (dùng chung mẫu tin Zalo của GV) */}
          <Card>
            <CardHeader>
              <CardTitle>💬 Tin nhắn Zalo tổng hợp — Buổi {activeSession.sessionNumber}</CardTitle>
              <CardDescription>
                Tổng hợp tình hình chung của lớp dạy thay để gửi vào nhóm Zalo
                phụ huynh hoặc gửi bàn giao lại cho giáo viên chính.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ZaloPanel
                sessionId={activeSession.id}
                sessionNumber={activeSession.sessionNumber}
                sessionFormat={sessFormat}
                classCode={substituteClass.classCode}
                courseName={substituteClass.courseName}
                teacherName={teacherName}
                templates={templates}
                customGenerateSummary={(templateId) =>
                  generateSubstituteZaloSummary({
                    substituteClassId: substituteClass.id,
                    sessionId: activeSession.id,
                    templateId,
                  })
                }
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Sửa lớp dạy thay */}
      <Dialog open={editClassOpen} onOpenChange={setEditClassOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ Sửa thông tin lớp dạy thay</DialogTitle>
            <DialogDescription>
              Đổi mã lớp, khóa học hoặc ghi chú cho lớp dạy thay này.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveClassMeta} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sub-code">Mã lớp *</Label>
              <Input
                id="edit-sub-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-sub-course">Khóa học</Label>
              <Select value={editCourseId} onValueChange={setEditCourseId}>
                <SelectTrigger id="edit-sub-course" className="w-full">
                  <SelectValue />
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

            {editCourseId === CUSTOM_COURSE_VALUE && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-sub-course-name">Tên khóa / môn học</Label>
                <Input
                  id="edit-sub-course-name"
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-sub-notes">Ghi chú</Label>
              <Input
                id="edit-sub-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            {editClassMsg && (
              <p className="text-sm text-destructive">{editClassMsg}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditClassOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={savingClass}>
                {savingClass ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Thêm buổi dạy thay */}
      <Dialog open={addSessionOpen} onOpenChange={setAddSessionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>+ Thêm buổi dạy thay cho {substituteClass.classCode}</DialogTitle>
            <DialogDescription>
              Giữ nguyên danh sách {substituteClass.students.length} học viên và
              xếp loại học lực sẵn có.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSessionSubmit} className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-sess-num">Buổi số *</Label>
                <Input
                  id="new-sess-num"
                  type="number"
                  min={1}
                  max={100}
                  value={newSessNum}
                  onChange={(e) => {
                    setNewSessNum(e.target.value);
                    const n = Number(e.target.value);
                    if (n === 5 || n === 9) setNewSessFormat("periodic_test");
                    else if (n === 14) setNewSessFormat("final_presentation");
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-sess-fmt">Hình thức buổi</Label>
                <Select
                  value={newSessFormat}
                  onValueChange={(v) => setNewSessFormat(v as SessionFormat)}
                >
                  <SelectTrigger id="new-sess-fmt" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SESSION_FORMATS) as SessionFormat[]).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {SESSION_FORMATS[k].label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-sess-title">Tiêu đề buổi (tùy chọn)</Label>
              <Input
                id="new-sess-title"
                value={newSessTitle}
                onChange={(e) => setNewSessTitle(e.target.value)}
                placeholder={`Buổi ${newSessNum || 1}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-sess-content">Nội dung buổi học (tùy chọn)</Label>
              <Textarea
                id="new-sess-content"
                rows={3}
                value={newSessContent}
                onChange={(e) => setNewSessContent(e.target.value)}
              />
            </div>

            {newSessError && (
              <p className="text-sm text-destructive">{newSessError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddSessionOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={creatingSession}>
                {creatingSession ? "Đang tạo..." : "Thêm buổi"}
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
