/**
 * Cầu nối phía web CodeLuma để đẩy nhận xét sang Chrome Extension
 * `extensions/codeluma-lms-bridge/` rồi tự điền vào giao diện MindX LMS.
 *
 * Chỉ giao tiếp nội bộ qua `window.postMessage` trên trình duyệt của chính GV;
 * KHÔNG đụng DB hay gọi API ẩn của LMS — GV luôn soát lại và tự bấm Save.
 */

import type {
  DemoScoreBreakdown,
  DnlCriterionEvaluation,
  FinalPresentationEvaluation,
  MindxLetterEvaluation,
} from "@/lib/presentation-evaluation";

export interface LmsStudentReviewPayload {
  studentName: string;
  comment: string;
  gradingSummary?: string;
  dnlEvaluations?: Record<string, DnlCriterionEvaluation>;
  demoScore?: DemoScoreBreakdown;
  mindxLetter?: MindxLetterEvaluation;
}

export interface LmsBridgeBatchPayload {
  classCode: string;
  courseName: string;
  sessionId: string;
  sessionNumber: number | null;
  sessionTitle: string;
  sessionFormat: "standard" | "project_period" | "periodic_test" | "final_presentation";
  students: LmsStudentReviewPayload[];
}

export interface PushToLmsResult {
  ok: boolean;
  installed: boolean;
  count: number;
  focusedTab: boolean;
  error?: string;
}

/**
 * Đóng gói dữ liệu của 1 học viên để gửi sang MindX LMS.
 * Trả về `null` nếu học viên vắng mặt hoặc chưa có nội dung gì để điền.
 */
export function buildLmsStudentPayload(input: {
  studentName: string;
  isAbsent?: boolean;
  comment?: string | null;
  gradingSummary?: string | null;
  evaluation?: FinalPresentationEvaluation | null;
  includeDemoScore?: boolean;
}): LmsStudentReviewPayload | null {
  if (input.isAbsent) return null;

  const trimmedComment = (
    input.comment ??
    input.evaluation?.comment ??
    ""
  ).trim();
  const trimmedGradingSummary = (input.gradingSummary ?? "").trim();

  const dnlEntries = Object.entries(input.evaluation?.dnl_evaluations ?? {}).filter(
    ([, item]) => Boolean(item && (item.comment?.trim() || item.score > 0))
  );
  const dnlEvaluations =
    dnlEntries.length > 0
      ? Object.fromEntries(
          dnlEntries.map(([key, item]) => [
            key,
            {
              score: item.score,
              level: item.level,
              comment: (item.comment ?? "").trim(),
            },
          ])
        )
      : undefined;

  const letter = input.evaluation?.mindx_letter;
  const hasLetter = Boolean(
    letter &&
      (letter.learned_from_mindx?.trim() ||
        letter.suggestions_from_mindx?.trim() ||
        letter.future_direction?.trim())
  );
  const mindxLetter: MindxLetterEvaluation | undefined = hasLetter && letter
    ? {
        learned_from_mindx: (letter.learned_from_mindx ?? "").trim(),
        suggestions_from_mindx: (letter.suggestions_from_mindx ?? "").trim(),
        future_direction: (letter.future_direction ?? "").trim(),
      }
    : undefined;

  const demoScore =
    input.includeDemoScore && input.evaluation?.demo_score
      ? input.evaluation.demo_score
      : undefined;

  if (
    !trimmedComment &&
    !trimmedGradingSummary &&
    !dnlEvaluations &&
    !demoScore &&
    !mindxLetter
  ) {
    return null;
  }

  return {
    studentName: input.studentName.trim(),
    comment: trimmedComment,
    ...(trimmedGradingSummary ? { gradingSummary: trimmedGradingSummary } : {}),
    ...(dnlEvaluations ? { dnlEvaluations } : {}),
    ...(demoScore ? { demoScore } : {}),
    ...(mindxLetter ? { mindxLetter } : {}),
  };
}

/** Đọc mô tả bài làm / kết quả Chấm bài AI đang lưu tạm trong localStorage (nếu có). */
export function readCachedGradingSummaryFromStorage(
  sessionId: string,
  studentId: string
): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      window.localStorage.getItem(
        `eduverse_grading_summary_${sessionId}_${studentId}`
      ) ?? ""
    );
  } catch {
    return "";
  }
}

export interface ParsedCheckpointScores {
  practiceScore: number | null;
  correctQuestions: number[] | null;
}

/**
 * Bản TS song song với parser trong `extensions/codeluma-lms-bridge/content-lms.js`
 * để unit test thuật toán trích điểm Thực hành (thang 5) + Trắc nghiệm (1..10).
 */
export function parseCheckpointScoresFromText(
  rawText: string
): ParsedCheckpointScores {
  const text = String(rawText || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r\n/g, "\n");
  if (!text.trim()) {
    return { practiceScore: null, correctQuestions: null };
  }

  let practiceScore: number | null = null;
  const ratioMatch = text.match(
    /(?:điểm\s*)?(?:thực\s*hành|practice)(?:\s*\([^)]*\))?\s*[:\-]\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/i
  );
  if (ratioMatch) {
    const got = parseFloat(ratioMatch[1].replace(",", "."));
    const max = parseFloat(ratioMatch[2].replace(",", "."));
    if (!Number.isNaN(got) && !Number.isNaN(max) && max > 0) {
      const scaled = (got / max) * 5;
      practiceScore = Number(Math.min(5, Math.max(0, scaled)).toFixed(2));
    }
  } else {
    const directMatch = text.match(
      /(?:điểm\s*)?(?:thực\s*hành|practice)(?:\s*\([^)]*\))?\s*[:\-]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm)?(?:\s|$|\n)/i
    );
    if (directMatch) {
      const val = parseFloat(directMatch[1].replace(",", "."));
      if (!Number.isNaN(val) && val >= 0) {
        const scaled = val > 5 && val <= 100 ? (val / 100) * 5 : val;
        practiceScore = Number(Math.min(5, Math.max(0, scaled)).toFixed(2));
      }
    }
  }

  let correctQuestions: number[] | null = null;
  const theoryMatch = text.match(
    /(?:lý\s*thuyết|trắc\s*nghiệm)\s*[:\-]\s*(\d+)\s*\/\s*(\d+)/i
  );
  const theoryGot = theoryMatch ? Number(theoryMatch[1]) : null;
  const theoryTotal = theoryMatch ? Number(theoryMatch[2]) : null;

  const quizSectionMatch = text.match(
    /trắc\s*nghiệm[\s\S]*?đúng\s*[:\-]\s*([0-9,\s]+)/i
  );
  const genericRightMatch = text.match(/(?:^|\n)\s*đúng\s*[:\-]\s*([0-9,\s]+)/i);
  const rightListStr = quizSectionMatch?.[1] || genericRightMatch?.[1] || "";

  const wrongSectionMatch = text.match(
    /trắc\s*nghiệm[\s\S]*?sai\s*[:\-]\s*([0-9,\s]+)/i
  );
  const genericWrongMatch = text.match(/(?:^|\n)\s*sai\s*[:\-]\s*([0-9,\s]+)/i);
  const wrongListStr = wrongSectionMatch?.[1] || genericWrongMatch?.[1] || "";

  if (rightListStr) {
    const unique = Array.from(
      new Set(
        rightListStr
          .split(/[^0-9]+/)
          .map((s) => Number(s))
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= 10)
      )
    ).sort((a, b) => a - b);
    if (unique.length > 0) {
      correctQuestions = unique;
    }
  } else if (wrongListStr) {
    const wrongNums = new Set(
      wrongListStr
        .split(/[^0-9]+/)
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 10)
    );
    if (wrongNums.size > 0) {
      const total = Math.min(10, theoryTotal && theoryTotal > 0 ? theoryTotal : 10);
      const derived: number[] = [];
      for (let q = 1; q <= total; q++) {
        if (!wrongNums.has(q)) derived.push(q);
      }
      if (theoryGot === null || derived.length === theoryGot) {
        correctQuestions = derived;
      }
    }
  } else if (theoryGot !== null && theoryTotal !== null && theoryTotal > 0) {
    if (theoryGot === theoryTotal) {
      const maxQ = Math.min(10, theoryTotal);
      correctQuestions = Array.from({ length: maxQ }, (_, i) => i + 1);
    } else if (theoryGot === 0) {
      correctQuestions = [];
    }
  } else if (/em làm đúng tất cả các câu/i.test(text)) {
    correctQuestions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }

  return { practiceScore, correctQuestions };
}

/** Đọc bảng ĐNL / Demo Score / Thư MindX đang lưu tạm trong localStorage (nếu có). */
export function readCachedRubricFromStorage(
  sessionId: string,
  studentId: string
): FinalPresentationEvaluation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      `eduverse_rubric_${sessionId}_${studentId}`
    );
    if (!raw) return null;
    return JSON.parse(raw) as FinalPresentationEvaluation;
  } catch {
    return null;
  }
}

/** Kiểm tra nhanh Chrome Extension CodeLuma -> MindX LMS đã được cài trên trình duyệt chưa. */
export function isLmsBridgeInstalled(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.documentElement.dataset.codelumaLmsBridge);
}

/**
 * Đẩy 1 học viên hoặc cả lớp sang Chrome Extension để điền vào MindX LMS.
 * Nếu Extension chưa cài, trả `{ ok: false, installed: false }`.
 */
export function pushToLmsBridge(
  payload: LmsBridgeBatchPayload,
  options?: { replaceAll?: boolean; focusLmsTab?: boolean }
): Promise<PushToLmsResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      ok: false,
      installed: false,
      count: 0,
      focusedTab: false,
      error: "Chỉ hỗ trợ trên trình duyệt.",
    });
  }

  if (!isLmsBridgeInstalled()) {
    return Promise.resolve({
      ok: false,
      installed: false,
      count: 0,
      focusedTab: false,
      error: "Chưa cài Chrome Extension CodeLuma → MindX LMS.",
    });
  }

  const requestId = `codeluma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve) => {
    let settled = false;

    function finish(result: PushToLmsResult) {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(timer);
      resolve(result);
    }

    function handleMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data as
        | {
            source?: string;
            type?: string;
            requestId?: string;
            ok?: boolean;
            count?: number;
            focusedTab?: boolean;
            error?: string;
          }
        | undefined;
      if (
        !data ||
        data.source !== "codeluma-lms-bridge" ||
        data.type !== "PUSH_RESULT" ||
        data.requestId !== requestId
      ) {
        return;
      }
      finish({
        ok: Boolean(data.ok),
        installed: true,
        count: Number(data.count ?? 0),
        focusedTab: Boolean(data.focusedTab),
        error: data.error || undefined,
      });
    }

    window.addEventListener("message", handleMessage);
    const timer = window.setTimeout(() => {
      finish({
        ok: false,
        installed: false,
        count: 0,
        focusedTab: false,
        error:
          "Extension không phản hồi — hãy kiểm tra Chrome Extension đã bật và tải lại trang (F5).",
      });
    }, 1800);

    window.postMessage(
      {
        source: "codeluma-app",
        type: "PUSH_TO_LMS",
        requestId,
        payload,
        replaceAll: Boolean(options?.replaceAll),
        focusLmsTab: options?.focusLmsTab ?? true,
      },
      "*"
    );
  });
}
