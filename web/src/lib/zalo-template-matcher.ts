import type { SessionFormat } from "./session-format";

export interface ZaloTemplateLike {
  id: string;
  name: string;
}

/**
 * Tính điểm tương thích giữa tên mẫu tin Zalo và hình thức buổi học.
 * Điểm càng cao thì mẫu tin càng ưu tiên được chọn tự động.
 */
export function scoreZaloTemplateForFormat(
  name: string,
  format: SessionFormat
): number {
  const norm = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const hasSpck =
    norm.includes("spck") ||
    norm.includes("san pham cuoi khoa") ||
    norm.includes("do an") ||
    norm.includes("project");

  const hasTest =
    norm.includes("kiem tra") ||
    norm.includes("test") ||
    norm.includes("checkpoint") ||
    norm.includes("thi") ||
    norm.includes("danh gia dinh ky");

  const hasPresentation =
    norm.includes("thuyet trinh") ||
    norm.includes("demo day") ||
    norm.includes("demoday") ||
    norm.includes("bao cao") ||
    norm.includes("tong ket") ||
    norm.includes("be giang");

  const hasStandard =
    norm.includes("thong bao buoi hoc") ||
    norm.includes("buoi hoc") ||
    norm.includes("tieu chuan") ||
    norm.includes("mac dinh") ||
    norm.includes("thong bao") ||
    norm.includes("standard") ||
    norm.includes("default");

  switch (format) {
    case "project_period":
      if (hasSpck) return 100;
      if (hasStandard && !hasTest && !hasPresentation) return 20;
      return 1;

    case "periodic_test":
      if (hasTest) return 100;
      if (hasStandard && !hasSpck && !hasPresentation) return 20;
      return 1;

    case "final_presentation":
      if (hasPresentation) return 100;
      // Nếu chưa tạo mẫu thuyết trình riêng, ưu tiên mẫu SPCK vì buổi 14 là báo cáo SPCK
      if (hasSpck) return 50;
      if (hasStandard && !hasTest) return 20;
      return 1;

    case "standard":
    default:
      // Buổi học tiêu chuẩn: ưu tiên mẫu thông báo buổi học thông thường, không chứa từ khóa spck/test/thuyết trình
      if (hasStandard && !hasSpck && !hasTest && !hasPresentation) return 100;
      if (!hasSpck && !hasTest && !hasPresentation) return 40;
      return 1;
  }
}

/**
 * Tìm mẫu tin Zalo phù hợp nhất cho hình thức buổi học hiện tại.
 * Nếu không có mẫu tin nào thì trả về undefined.
 */
export function findBestMatchingZaloTemplate<T extends ZaloTemplateLike>(
  templates: readonly T[],
  format: SessionFormat
): T | undefined {
  if (templates.length === 0) return undefined;

  let bestTemplate: T = templates[0];
  let highestScore = -1;

  for (const t of templates) {
    const score = scoreZaloTemplateForFormat(t.name, format);
    if (score > highestScore) {
      highestScore = score;
      bestTemplate = t;
    }
  }

  return bestTemplate;
}

