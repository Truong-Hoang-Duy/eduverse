export interface DnlCriterion {
  key: string;
  name: string;
  group: "KIẾN THỨC" | "KỸ NĂNG" | "THÁI ĐỘ";
  description: string;
}

export interface DnlCriterionEvaluation {
  score: number; // 1..5
  level: "TB" | "Khá" | "Giỏi";
  comment: string;
}

export interface DemoScoreBreakdown {
  knowledge_score: number; // max 5.0 (Điểm kiến thức Demo2024 | CSI)
  computational_thinking: number; // max 2.0
  creative_thinking: number; // max 0.5
  communication: number; // max 1.0
  problem_solving: number; // max 1.0
  computer_skills: number; // max 0.5
  demo_total: number; // max 5.0 (Tổng 5 tiêu chí demo sản phẩm)
  total: number; // max 10.0 (Tổng cả điểm kiến thức + demo sản phẩm, tự động chia đều không dưới 6.0)
}


export interface FinalPresentationEvaluation {
  comment: string;
  demo_score: DemoScoreBreakdown;
  dnl_evaluations: Record<string, DnlCriterionEvaluation>;
}

export const DNL_CRITERIA: DnlCriterion[] = [
  // KIẾN THỨC
  {
    key: "kien_thuc_tu_hoc",
    name: "[ĐNL] Kiến thức học viên tự học",
    group: "KIẾN THỨC",
    description: "Khả năng tự tìm hiểu, tò mò khám phá kiến thức ngoài giờ học",
  },
  {
    key: "kien_thuc_tai_lop",
    name: "[ĐNL] Kiến thức học viên đã được học tại lớp",
    group: "KIẾN THỨC",
    description: "Mức độ tiếp thu và vận dụng kiến thức đã học trên lớp",
  },
  // KỸ NĂNG
  {
    key: "ky_nang_giao_tiep",
    name: "[ĐNL] Kỹ năng giao tiếp, hợp tác",
    group: "KỸ NĂNG",
    description: "Trao đổi, tương tác với thầy cô, bạn bè và thuyết trình",
  },
  {
    key: "ky_nang_may_tinh",
    name: "[ĐNL] Kỹ năng sử dụng máy tính",
    group: "KỸ NĂNG",
    description: "Thao tác máy tính, gõ bàn phím và quản lý tệp tin",
  },
  {
    key: "ky_nang_giai_quyet_van_de",
    name: "[ĐNL] Kỹ năng giải quyết vấn đề",
    group: "KỸ NĂNG",
    description: "Khả năng debug lỗi và tư duy tìm hướng giải quyết khi gặp khó",
  },
  {
    key: "tu_duy_sang_tao",
    name: "[ĐNL] Tư duy sáng tạo",
    group: "KỸ NĂNG",
    description: "Ý tưởng sáng tạo, tính năng độc đáo và thẩm mỹ giao diện",
  },
  {
    key: "tu_duy_may_tinh",
    name: "[ĐNL] Tư duy máy tính",
    group: "KỸ NĂNG",
    description: "Tư duy logic thuật toán, cấu trúc chương trình",
  },
  // THÁI ĐỘ
  {
    key: "thai_do_tai_lop",
    name: "[ĐNL] Thái độ học tập trên lớp",
    group: "THÁI ĐỘ",
    description: "Mức độ tập trung, ý thức kỷ luật và tương tác trong giờ học",
  },
  {
    key: "thai_do_ve_nha",
    name: "[ĐNL] Thái độ luyện tập về nhà",
    group: "THÁI ĐỘ",
    description: "Ý thức hoàn thành bài tập về nhà và tự giác ôn luyện",
  },
];

export const DEMO_SCORE_CRITERIA = [
  {
    key: "computational_thinking" as const,
    name: "Tư duy máy tính, tư duy thuật toán (2 điểm)",
    maxScore: 2.0,
  },
  {
    key: "creative_thinking" as const,
    name: "Tư duy sáng tạo (0.5 điểm)",
    maxScore: 0.5,
  },
  {
    key: "communication" as const,
    name: "Kỹ năng giao tiếp, hợp tác (1 điểm)",
    maxScore: 1.0,
  },
  {
    key: "problem_solving" as const,
    name: "Giải quyết vấn đề (1 điểm)",
    maxScore: 1.0,
  },
  {
    key: "computer_skills" as const,
    name: "Kỹ năng sử dụng máy tính (0.5 điểm)",
    maxScore: 0.5,
  },
];

/** Chuyển điểm 1..5 thành nhãn TB / Khá / Giỏi theo quy ước Denise LMS. */
export function scoreToLevel(score: number): "TB" | "Khá" | "Giỏi" {
  if (score >= 5) return "Giỏi";
  if (score >= 3) return "Khá";
  return "TB";
}

/** Tính tổng điểm Demo từ 5 tiêu chí thành phần (tối đa 5.0 điểm). */
export function calculateDemoTotal(
  scores: Partial<DemoScoreBreakdown>
): number {
  const sum =
    Number(scores.computational_thinking || 0) +
    Number(scores.creative_thinking || 0) +
    Number(scores.communication || 0) +
    Number(scores.problem_solving || 0) +
    Number(scores.computer_skills || 0);
  return Math.round(sum * 10) / 10;
}

/** Tính tổng cả điểm kiến thức + demo sản phẩm (tối đa 10.0 điểm). */
export function calculateGrandTotal(
  knowledgeScore: number,
  demoTotal: number
): number {
  const sum = Number(knowledgeScore || 0) + Number(demoTotal || 0);
  return Math.round(sum * 10) / 10;
}

/**
 * Tự động chia đều điểm giữa Kiến thức và Demo sản phẩm, bảo đảm tổng điểm không dưới 6.0 điểm.
 * @param targetTotal Điểm tổng mục tiêu (thang điểm 10, tối thiểu 6.0, tối đa 10.0)
 */
export function distributeScores(targetTotal = 7.0): DemoScoreBreakdown {
  // Ràng buộc quy định: tổng điểm không dưới 6.0
  const safeTotal = Math.min(
    10.0,
    Math.max(6.0, Math.round(targetTotal * 10) / 10)
  );

  // Chia đều 50/50: Kiến thức và Demo sản phẩm
  const knowledgeScore = Math.round((safeTotal / 2) * 10) / 10;
  const demoTotal = Math.round((safeTotal - knowledgeScore) * 10) / 10;

  // Phân bổ 5 tiêu chí demo theo tỷ lệ chuẩn (2.0 : 0.5 : 1.0 : 1.0 : 0.5 / 5.0)
  const computationalThinking = Math.round(demoTotal * 0.4 * 10) / 10;
  const creativeThinking = Math.round(demoTotal * 0.1 * 10) / 10;
  const communication = Math.round(demoTotal * 0.2 * 10) / 10;
  const problemSolving = Math.round(demoTotal * 0.2 * 10) / 10;
  const subSum =
    computationalThinking +
    creativeThinking +
    communication +
    problemSolving;
  const computerSkills = Math.max(
    0,
    Math.round((demoTotal - subSum) * 10) / 10
  );

  return {
    knowledge_score: knowledgeScore,
    computational_thinking: computationalThinking,
    creative_thinking: creativeThinking,
    communication: communication,
    problem_solving: problemSolving,
    computer_skills: computerSkills,
    demo_total: demoTotal,
    total: safeTotal,
  };
}

/** Định dạng toàn bộ bảng đánh giá thành văn bản hoàn chỉnh để copy 1 lần. */
export function formatFullEvaluationText(
  studentName: string,
  data: FinalPresentationEvaluation,
  options?: { hideDemoScore?: boolean }
): string {
  const lines: string[] = [
    `=== BẢNG TỔNG KẾT & ĐÁNH GIÁ NĂNG LỰC: ${studentName.toUpperCase()} ===\n`,
    `[NHẬN XÉT TỔNG KẾT KHÓA HỌC GỬI PHỤ HUYNH]`,
    data.comment,
    "",
    `[ĐÁNH GIÁ NĂNG LỰC - ĐNL (9 TIÊU CHÍ)]`,
  ];

  let currentGroup = "";
  for (const criterion of DNL_CRITERIA) {
    if (criterion.group !== currentGroup) {
      currentGroup = criterion.group;
      lines.push(`\n* ${currentGroup}:`);
    }
    const evalItem = data.dnl_evaluations[criterion.key];
    if (evalItem) {
      lines.push(
        `- ${criterion.name}: ${evalItem.score}/5 (${evalItem.level})`
      );
      if (evalItem.comment) {
        lines.push(`  "${evalItem.comment}"`);
      }
    } else {
      lines.push(`- ${criterion.name}: (Chưa có nhận xét)`);
    }
  }

  if (!options?.hideDemoScore && data.demo_score) {
    lines.push(
      "",
      `[ĐIỂM TỔNG KẾT: ${data.demo_score.total}/10.0 (TỰ ĐỘNG CHIA ĐỀU KHÔNG DƯỚI 6.0)]`,
      `- Điểm kiến thức (Demo2024 | CSI): ${data.demo_score.knowledge_score}/5.0 điểm`,
      `- Điểm demo sản phẩm: ${data.demo_score.demo_total}/5.0 điểm`,
      `  + Tư duy máy tính, thuật toán: ${data.demo_score.computational_thinking}/2.0 điểm`,
      `  + Tư duy sáng tạo: ${data.demo_score.creative_thinking}/0.5 điểm`,
      `  + Kỹ năng giao tiếp, hợp tác: ${data.demo_score.communication}/1.0 điểm`,
      `  + Giải quyết vấn đề: ${data.demo_score.problem_solving}/1.0 điểm`,
      `  + Kỹ năng sử dụng máy tính: ${data.demo_score.computer_skills}/0.5 điểm`
    );
  }

  return lines.join("\n");
}

/** Tạo bảng đánh giá mặc định (khi giáo viên muốn tự điền mà không cần gọi AI). */
export function createDefaultFinalEvaluation(
  comment = ""
): FinalPresentationEvaluation {
  const dnl: Record<string, DnlCriterionEvaluation> = {};
  for (const c of DNL_CRITERIA) {
    dnl[c.key] = {
      score: 4,
      level: "Khá",
      comment: "",
    };
  }
  return {
    comment,
    demo_score: distributeScores(7.0),
    dnl_evaluations: dnl,
  };
}

