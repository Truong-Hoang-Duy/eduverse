/**
 * Ngân hàng nhận xét và cấu trúc đánh giá sản phẩm cuối khóa (SPCK).
 *
 * Chia theo 3 cấp độ học lực:
 * 1. `yeu`: Học yếu / Cần cố gắng
 * 2. `trung_binh`: Trung bình
 * 3. `kha_gioi`: Khá / Giỏi
 *
 * Và 6 nhóm kỹ năng quan sát:
 * - `attitude`: 🌱 Thái độ
 * - `coding`: 💻 Kỹ năng
 * - `self_study`: 📚 Tự học
 * - `project_progress`: 🚀 Tiến độ & sản phẩm
 * - `soft_skills`: 🤝 Kỹ năng mềm
 * - `knowledge`: 🧠 Kiến thức nền tảng
 */

export type SpckLevel = "yeu" | "trung_binh" | "kha_gioi";

export type SpckSkillGroup =
  | "attitude"
  | "coding"
  | "self_study"
  | "project_progress"
  | "soft_skills"
  | "knowledge";

export interface SpckSkillConfig {
  value: SpckSkillGroup;
  label: string;
  icon: string;
}

export const SPCK_SKILL_GROUPS: readonly SpckSkillConfig[] = [
  { value: "attitude", label: "Thái độ", icon: "🌱" },
  { value: "coding", label: "Kỹ năng", icon: "💻" },
  { value: "self_study", label: "Tự học", icon: "📚" },
  { value: "project_progress", label: "Tiến độ & sản phẩm", icon: "🚀" },
  { value: "soft_skills", label: "Kỹ năng mềm", icon: "🤝" },
  { value: "knowledge", label: "Kiến thức nền tảng", icon: "🧠" },
] as const;

export interface SpckLevelConfig {
  level: SpckLevel;
  label: string;
  icon: string;
  badgeClass: string;
  academicLevelMatch: string[]; // Khớp với academic_level trong DB ('gioi', 'kha', 'trung_binh', 'can_co_gang')
}

export const SPCK_LEVEL_CONFIGS: readonly SpckLevelConfig[] = [
  {
    level: "kha_gioi",
    label: "Khá / Giỏi",
    icon: "🌟",
    badgeClass:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    academicLevelMatch: ["gioi", "kha"],
  },
  {
    level: "trung_binh",
    label: "Trung bình",
    icon: "⚖️",
    badgeClass:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    academicLevelMatch: ["trung_binh"],
  },
  {
    level: "yeu",
    label: "Học yếu",
    icon: "⚠️",
    badgeClass:
      "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    academicLevelMatch: ["can_co_gang"],
  },
] as const;

export interface SpckObservationItem {
  label: string;
  level: SpckLevel;
  skillGroup: SpckSkillGroup;
}

/** Ngân hàng 44 nhận xét đồ án cuối khóa chuẩn chia theo 3 cấp độ và 6 kỹ năng */
export const SPCK_OBSERVATION_BANK: readonly SpckObservationItem[] = [
  // =================== 1. HỌC YẾU ===================
  // --- Thái độ ---
  {
    label: "Còn thụ động, chưa chủ động đặt câu hỏi khi gặp khó khăn",
    level: "yeu",
    skillGroup: "attitude",
  },
  {
    label: "Còn mất tập trung, dễ xao nhãng trong giờ thực hành",
    level: "yeu",
    skillGroup: "attitude",
  },
  {
    label: "Chưa có ý tưởng, còn gặp khó khăn trong việc xác định hướng làm",
    level: "yeu",
    skillGroup: "attitude",
  },
  // --- Kỹ năng ---
  {
    label: "Còn yếu về logic, cần luyện thêm tư duy giải quyết vấn đề",
    level: "yeu",
    skillGroup: "coding",
  },
  {
    label: "Viết code còn lộn xộn, chưa có thói quen đặt tên biến/hàm rõ ràng",
    level: "yeu",
    skillGroup: "coding",
  },
  {
    label: "Chưa biết cách tra cứu tài liệu để tự giải quyết lỗi",
    level: "yeu",
    skillGroup: "coding",
  },
  // --- Tự học ---
  {
    label: "Chưa có thói quen tự tìm hiểu, còn phụ thuộc vào giáo viên",
    level: "yeu",
    skillGroup: "self_study",
  },
  // --- Tiến độ & sản phẩm ---
  {
    label: "Tiến độ chậm so với kế hoạch, cần đẩy nhanh hơn",
    level: "yeu",
    skillGroup: "project_progress",
  },
  {
    label: "Chưa hoàn thành đủ chức năng theo yêu cầu đồ án",
    level: "yeu",
    skillGroup: "project_progress",
  },
  {
    label: "Cần hỗ trợ thêm để hoàn thiện sản phẩm",
    level: "yeu",
    skillGroup: "project_progress",
  },
  // --- Kỹ năng mềm ---
  {
    label: "Trình bày, thuyết trình sản phẩm còn chưa tự tin",
    level: "yeu",
    skillGroup: "soft_skills",
  },
  {
    label: "Cần rèn thêm kỹ năng quản lý thời gian",
    level: "yeu",
    skillGroup: "soft_skills",
  },
  {
    label: "Còn ngại giao tiếp, chưa mạnh dạn trao đổi khi gặp vướng mắc",
    level: "yeu",
    skillGroup: "soft_skills",
  },
  {
    label: "Chưa biết cách đặt câu hỏi cụ thể, rõ ràng khi cần hỗ trợ",
    level: "yeu",
    skillGroup: "soft_skills",
  },
  // --- Kiến thức nền tảng ---
  {
    label: "Còn hổng kiến thức cơ bản, cần ôn lại các buổi học trước",
    level: "yeu",
    skillGroup: "knowledge",
  },
  {
    label: "Chưa nắm vững cú pháp, hay nhầm lẫn giữa các khái niệm cơ bản",
    level: "yeu",
    skillGroup: "knowledge",
  },
  {
    label: "Cần luyện tập thêm bài tập nhỏ để củng cố nền tảng",
    level: "yeu",
    skillGroup: "knowledge",
  },

  // =================== 2. TRUNG BÌNH ===================
  // --- Thái độ ---
  {
    label: "Chủ động hỏi khi bí ý tưởng",
    level: "trung_binh",
    skillGroup: "attitude",
  },
  {
    label: "Nghiêm túc, tập trung trong suốt buổi học",
    level: "trung_binh",
    skillGroup: "attitude",
  },
  // --- Kỹ năng ---
  {
    label: "Biết chia nhỏ việc để làm dần từng phần",
    level: "trung_binh",
    skillGroup: "coding",
  },
  {
    label: "Biết debug lỗi cơ bản nhưng còn lúng túng với lỗi phức tạp",
    level: "trung_binh",
    skillGroup: "coding",
  },
  {
    label: "Có ý tưởng nhưng triển khai còn chậm",
    level: "trung_binh",
    skillGroup: "coding",
  },
  // --- Tự học ---
  {
    label: "Biết áp dụng kiến thức đã học vào tình huống mới",
    level: "trung_binh",
    skillGroup: "self_study",
  },
  // --- Tiến độ & sản phẩm ---
  {
    label: "Hoàn thành đúng tiến độ đề ra",
    level: "trung_binh",
    skillGroup: "project_progress",
  },
  {
    label: "Sản phẩm còn đơn giản, chưa thể hiện hết kiến thức đã học",
    level: "trung_binh",
    skillGroup: "project_progress",
  },
  {
    label: "Tập trung làm bài, tìm hiểu thêm nhiều kiến thức lập trình",
    level: "trung_binh",
    skillGroup: "project_progress",
  },
  // --- Kỹ năng mềm ---
  {
    label: "Biết lắng nghe và tiếp thu phản hồi để cải thiện sản phẩm",
    level: "trung_binh",
    skillGroup: "soft_skills",
  },
  {
    label: "Giao tiếp, trao đổi với giáo viên khá tốt",
    level: "trung_binh",
    skillGroup: "soft_skills",
  },
  {
    label: "Biết cách sắp xếp thời gian hợp lý cho các đầu việc",
    level: "trung_binh",
    skillGroup: "soft_skills",
  },
  // --- Kiến thức nền tảng ---
  {
    label: "Nắm được kiến thức cơ bản nhưng chưa thật vững ở một số phần",
    level: "trung_binh",
    skillGroup: "knowledge",
  },
  {
    label: "Cần ôn lại và luyện tập thêm để nâng cao độ chắc chắn",
    level: "trung_binh",
    skillGroup: "knowledge",
  },

  // =================== 3. KHÁ / GIỎI ===================
  // --- Thái độ ---
  {
    label: "Có tinh thần cầu tiến, tiếp thu góp ý tốt",
    level: "kha_gioi",
    skillGroup: "attitude",
  },
  {
    label: "Hay trao đổi, thảo luận với giáo viên và bạn học",
    level: "kha_gioi",
    skillGroup: "attitude",
  },
  // --- Kỹ năng ---
  {
    label: "Nắm chắc kiến thức nền tảng, vận dụng tốt vào sản phẩm",
    level: "kha_gioi",
    skillGroup: "coding",
  },
  {
    label: "Đã biết tổ chức code gọn gàng, dễ đọc hơn",
    level: "kha_gioi",
    skillGroup: "coding",
  },
  // --- Tự học ---
  {
    label: "Chủ động tìm hiểu thêm kiến thức ngoài buổi học để làm sản phẩm",
    level: "kha_gioi",
    skillGroup: "self_study",
  },
  {
    label: "Có khả năng tự học tốt, tự tìm hiểu thêm ngoài bài giảng",
    level: "kha_gioi",
    skillGroup: "self_study",
  },
  // --- Tiến độ & sản phẩm ---
  {
    label: "Sản phẩm có tính sáng tạo, vượt yêu cầu đề ra",
    level: "kha_gioi",
    skillGroup: "project_progress",
  },
  {
    label: "Có sự đầu tư về giao diện/trải nghiệm người dùng",
    level: "kha_gioi",
    skillGroup: "project_progress",
  },
  // --- Kỹ năng mềm ---
  {
    label: "Trình bày ý tưởng rõ ràng, mạch lạc",
    level: "kha_gioi",
    skillGroup: "soft_skills",
  },
  {
    label: "Tự tin thuyết trình, trả lời tốt các câu hỏi phản biện",
    level: "kha_gioi",
    skillGroup: "soft_skills",
  },
  {
    label: "Có khả năng làm việc độc lập, chủ động sắp xếp công việc hiệu quả",
    level: "kha_gioi",
    skillGroup: "soft_skills",
  },
  // --- Kiến thức nền tảng ---
  {
    label: "Nắm vững kiến thức nền tảng, không cần nhắc lại nhiều",
    level: "kha_gioi",
    skillGroup: "knowledge",
  },
  {
    label: "Có khả năng liên kết kiến thức các buổi học để giải quyết vấn đề mới",
    level: "kha_gioi",
    skillGroup: "knowledge",
  },
];

export const DEFAULT_PROJECT_PROGRESS: readonly string[] =
  SPCK_OBSERVATION_BANK.map((item) => item.label);

/**
 * Tìm nhóm kỹ năng của một nhãn SPCK (từ ngân hàng chuẩn hoặc fallback).
 */
export function getSpckSkillGroup(
  label: string,
  customSkillGroup?: string
): SpckSkillGroup {
  const item = SPCK_OBSERVATION_BANK.find(
    (b) => b.label.toLowerCase() === label.trim().toLowerCase()
  );
  if (item) return item.skillGroup;
  if (
    customSkillGroup &&
    SPCK_SKILL_GROUPS.some((g) => g.value === customSkillGroup)
  ) {
    return customSkillGroup as SpckSkillGroup;
  }
  return "project_progress";
}

/**
 * Tìm cấp độ học lực của một nhãn SPCK (từ ngân hàng chuẩn hoặc fallback).
 */
export function getSpckLevel(label: string): SpckLevel | null {
  const item = SPCK_OBSERVATION_BANK.find(
    (b) => b.label.toLowerCase() === label.trim().toLowerCase()
  );
  return item ? item.level : null;
}

/**
 * Xác định tab cấp độ gợi ý ban đầu dựa trên academic_level của học viên.
 */
export function resolveDefaultSpckLevel(
  academicLevel: string | null | undefined
): SpckLevel | "all" {
  if (!academicLevel) return "all";
  const matched = SPCK_LEVEL_CONFIGS.find((c) =>
    c.academicLevelMatch.includes(academicLevel)
  );
  return matched ? matched.level : "all";
}

/**
 * Kiểm tra xem một nhận xét là điểm làm tốt hay điểm cần lưu ý/cải thiện.
 */
export function isSpckImprovement(text: string): boolean {
  const lower = text.toLowerCase();
  const keywords = [
    "còn",
    "chưa",
    "cần",
    "yếu",
    "chậm",
    "lúng túng",
    "phụ thuộc",
    "xao nhãng",
    "mất tập trung",
    "hổng",
    "ngại",
    "lộn xộn",
    "khó khăn",
    "hỗ trợ",
  ];
  return keywords.some((kw) => lower.includes(kw));
}
