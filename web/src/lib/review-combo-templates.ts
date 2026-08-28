// Bộ mẫu combo + luật rút nhãn từ danh mục của giáo viên.
//
// Tách khỏi `actions/review-combos.ts` ("use server" chỉ được export hàm async)
// để phần LOGIC THUẦN này unit test được — cùng lý do đã tách `review-status.ts`.

import type { SkillGroup } from "@/lib/skill-groups";

/**
 * Một "chân dung học viên": điền CẢ điểm mạnh + cần cải thiện (+ SPCK) trong
 * MỘT lần bấm — yêu cầu user 2026-08-28.
 *
 * Vì sao đảo ngược "mỗi bộ một loại" (migration 20260806000000): cùng đợt này ô
 * tìm-tích tự do đã bị gỡ khỏi trang nhận xét, nên combo là đường DUY NHẤT để
 * thêm điểm mạnh/cần cải thiện. Giữ chia loại thì mỗi em phải áp 2-3 lượt.
 *
 * `strengths`/`improvements` là các NHÓM KỸ NĂNG để rút nhãn ra từ chính danh
 * mục của GV (nên áp xong luôn khớp catalog, không sinh nhãn lạ). Bộ mẫu KHÔNG
 * còn đặt tên theo nhóm kỹ năng như bản cũ ("💪 Tư duy logic tốt" = đúng 1
 * nhóm) — đặt theo tình huống GV gặp thật.
 */
export interface ComboTemplate {
  name: string;
  strengths?: SkillGroup[];
  improvements?: SkillGroup[];
  /** Danh mục SPCK không chia nhóm kỹ năng (mọi dòng skill_group = "other"). */
  project?: boolean;
}

export const COMBO_TEMPLATES: ComboTemplate[] = [
  // ---- Theo xếp loại học lực (khớp 4 mức GV tích ở bảng Danh sách học viên) ----
  {
    name: "🌟 Giỏi — toàn diện",
    strengths: ["thinking", "coding", "self_study"],
    improvements: ["creativity"],
  },
  {
    name: "🌟 Giỏi — tư duy nhanh, ít phát biểu",
    strengths: ["thinking", "coding"],
    improvements: ["questioning", "collaboration"],
  },
  {
    name: "🌟 Giỏi — nhiều ý tưởng, chưa chỉn chu",
    strengths: ["creativity", "thinking"],
    improvements: ["coding", "discipline"],
  },
  {
    name: "🌟 Giỏi — chắc nền, cần bài khó hơn",
    strengths: ["coding", "thinking"],
    improvements: ["self_study", "creativity"],
  },
  {
    name: "👍 Khá — chăm chỉ, đều đặn",
    strengths: ["attitude", "discipline"],
    improvements: ["thinking", "coding"],
  },
  {
    name: "👍 Khá — hiểu nhanh nhưng ẩu",
    strengths: ["thinking"],
    improvements: ["coding", "discipline"],
  },
  {
    name: "👍 Khá — làm tốt bài cơ bản",
    strengths: ["coding", "attitude"],
    improvements: ["thinking", "self_study"],
  },
  {
    name: "👍 Khá — mạnh thực hành, yếu lý thuyết",
    strengths: ["coding", "computer_skills"],
    improvements: ["thinking", "self_study"],
  },
  {
    name: "➖ Trung bình — cần củng cố nền tảng",
    strengths: ["attitude"],
    improvements: ["thinking", "coding", "self_study"],
  },
  {
    name: "➖ Trung bình — chăm nhưng còn chậm",
    strengths: ["attitude", "discipline"],
    improvements: ["coding", "thinking"],
  },
  {
    name: "➖ Trung bình — hiểu bài, ít luyện tập",
    strengths: ["thinking"],
    improvements: ["self_study", "attitude"],
  },
  {
    name: "➖ Trung bình — nhắc mới làm",
    strengths: ["collaboration"],
    improvements: ["attitude", "discipline", "self_study"],
  },
  {
    name: "💪 Cần cố gắng — hổng kiến thức nền",
    strengths: ["attitude"],
    improvements: ["thinking", "coding", "self_study"],
  },
  {
    name: "💪 Cần cố gắng — hay mất tập trung",
    strengths: ["collaboration"],
    improvements: ["discipline", "attitude"],
  },
  {
    name: "💪 Cần cố gắng — ngại hỏi, dễ bỏ cuộc",
    strengths: ["attitude"],
    improvements: ["questioning", "thinking"],
  },
  {
    name: "💪 Cần cố gắng — đi học chưa đều",
    strengths: ["collaboration"],
    improvements: ["discipline", "attitude", "self_study"],
  },

  // ---- Theo tình huống gặp trong buổi học ----
  {
    name: "🙋 Chủ động hỏi, tích cực phát biểu",
    strengths: ["questioning", "attitude"],
    improvements: ["coding"],
  },
  {
    name: "🤐 Im lặng nhưng hiểu bài",
    strengths: ["thinking", "coding"],
    improvements: ["questioning", "presentation"],
  },
  {
    name: "⚡ Làm nhanh nhưng hay sai vặt",
    strengths: ["thinking", "computer_skills"],
    improvements: ["coding", "discipline"],
  },
  {
    name: "🐢 Làm chậm nhưng chắc chắn",
    strengths: ["coding", "discipline"],
    improvements: ["computer_skills", "thinking"],
  },
  {
    name: "🎨 Mê giao diện, thích trang trí",
    strengths: ["creativity", "computer_skills"],
    improvements: ["coding", "thinking"],
  },
  {
    name: "🧩 Thích bài khó, chán bài dễ",
    strengths: ["thinking", "self_study"],
    improvements: ["attitude", "discipline"],
  },
  {
    name: "🤝 Hay giúp bạn trong lớp",
    strengths: ["collaboration", "attitude"],
    improvements: ["self_study", "coding"],
  },
  {
    name: "📵 Làm việc riêng, mất tập trung",
    strengths: ["computer_skills"],
    improvements: ["discipline", "attitude"],
  },
  {
    name: "🤖 Phụ thuộc AI, ít tự nghĩ",
    strengths: ["ai_usage"],
    improvements: ["ai_usage", "thinking"],
  },
  {
    name: "🤖 Dùng AI đúng cách, biết kiểm chứng",
    strengths: ["ai_usage", "self_study"],
    improvements: ["thinking", "coding"],
  },
  {
    name: "🖥️ Thao tác máy tính còn chậm",
    strengths: ["attitude"],
    improvements: ["computer_skills", "discipline"],
  },
  {
    name: "🎤 Thuyết trình tự tin, nói tốt",
    strengths: ["presentation", "collaboration"],
    improvements: ["coding", "thinking"],
  },
  {
    name: "🎤 Ngại nói trước lớp",
    strengths: ["coding", "thinking"],
    improvements: ["presentation", "questioning"],
  },
  {
    name: "📚 Tự học tốt ở nhà",
    strengths: ["self_study", "attitude"],
    improvements: ["collaboration", "presentation"],
  },
  {
    name: "🏠 Không làm bài về nhà",
    strengths: ["attitude"],
    improvements: ["self_study", "discipline", "attitude"],
  },
  {
    name: "🔁 Tiến bộ rõ so với trước",
    strengths: ["attitude", "coding"],
    improvements: ["thinking", "self_study"],
  },

  // ---- Buổi làm sản phẩm cuối khóa (SPCK, thường buổi 9-13) ----
  {
    name: "🎓 SPCK — ý tưởng rõ, làm đều tay",
    strengths: ["creativity", "coding"],
    improvements: ["discipline"],
    project: true,
  },
  {
    name: "🎓 SPCK — chưa nghĩ ra ý tưởng",
    strengths: ["attitude"],
    improvements: ["creativity", "thinking"],
    project: true,
  },
  {
    name: "🎓 SPCK — làm tốt, cần hoàn thiện nốt",
    strengths: ["coding", "thinking"],
    improvements: ["creativity", "discipline"],
    project: true,
  },
  {
    name: "🎓 SPCK — chậm tiến độ",
    strengths: ["attitude"],
    improvements: ["discipline", "self_study"],
    project: true,
  },
  {
    name: "🎓 SPCK — chủ động tìm hiểu thêm",
    strengths: ["self_study", "ai_usage"],
    improvements: ["coding"],
    project: true,
  },
  {
    name: "🎓 SPCK — cần hỗ trợ nhiều",
    strengths: ["attitude"],
    improvements: ["coding", "thinking", "questioning"],
    project: true,
  },
  {
    name: "🎓 SPCK — sản phẩm sáng tạo, khác biệt",
    strengths: ["creativity", "computer_skills"],
    improvements: ["coding"],
    project: true,
  },
  {
    name: "🎓 SPCK — kỹ thuật ổn, trình bày yếu",
    strengths: ["coding"],
    improvements: ["presentation", "collaboration"],
    project: true,
  },
];

/** Số nhãn lấy từ MỖI nhóm cho một bộ (bản cũ là 2 — user 2026-08-28 muốn mỗi
 *  bộ dày hơn). Nhân với 1-3 nhóm/bộ ra khoảng 3-9 nhãn. */
export const LABELS_PER_GROUP = 3;
/** Trần an toàn cho một ô — bộ nhiều nhóm không đổ quá nhiều badge một lúc. */
export const MAX_LABELS_PER_FIELD = 8;

/** Lấy `count` phần tử liên tiếp từ `start`, CHẠY VÒNG khi hết mảng. */
export function rotateSlice(
  pool: string[],
  start: number,
  count: number
): string[] {
  if (pool.length === 0) return [];
  const result: string[] = [];
  const take = Math.min(count, pool.length);
  // `start` có thể âm nếu ai đó truyền nhầm — chuẩn hóa về [0, len).
  const from = ((start % pool.length) + pool.length) % pool.length;
  for (let i = 0; i < take; i += 1) {
    result.push(pool[(from + i) % pool.length]);
  }
  return result;
}

/**
 * Rút nhãn từ danh mục của GV, XOAY VÒNG theo `offset`.
 *
 * 🔴 Đây là chỗ sửa quan trọng nhất so với bản cũ: trước đây luôn `.slice(0, 2)`
 * nên MỌI bộ tham chiếu cùng một nhóm đều nhận ĐÚNG 2 nhãn đầu (theo alphabet),
 * và ~8 nhãn còn lại của nhóm đó KHÔNG BAO GIỜ xuất hiện trong bộ nào — đúng
 * điều user phản ánh 2026-08-28 ("chưa tận dụng hết kỹ năng đã nhập"). Giờ mỗi
 * bộ bắt đầu từ một vị trí khác nhau và chạy vòng, nên trải đều cả danh mục.
 *
 * `byKey` gom nhãn theo khóa "category:skill_group".
 */
export function pickRotating(
  byKey: Map<string, string[]>,
  category: string,
  groups: SkillGroup[],
  offset: number
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const [groupIndex, group] of groups.entries()) {
    const pool = byKey.get(`${category}:${group}`) ?? [];
    // Lệch thêm theo vị trí nhóm để 2 bộ cùng offset mà khác thứ tự nhóm vẫn
    // không rút trùng y hệt.
    const start = offset * LABELS_PER_GROUP + groupIndex;
    for (const label of rotateSlice(pool, start, LABELS_PER_GROUP)) {
      if (seen.has(label.toLowerCase())) continue;
      seen.add(label.toLowerCase());
      result.push(label);
    }
  }

  return result.slice(0, MAX_LABELS_PER_FIELD);
}
