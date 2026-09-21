import { describe, expect, it } from "vitest";

import {
  getSpckLevel,
  getSpckSkillGroup,
  isSpckImprovement,
  resolveDefaultSpckLevel,
  SPCK_LEVEL_CONFIGS,
  SPCK_OBSERVATION_BANK,
  SPCK_SKILL_GROUPS,
} from "./spck-evaluation";

describe("spck-evaluation", () => {
  it("chứa chính xác 44 mục nhận xét không bị trùng lặp", () => {
    expect(SPCK_OBSERVATION_BANK).toHaveLength(44);
    const labels = SPCK_OBSERVATION_BANK.map((item) => item.label.toLowerCase());
    const unique = new Set(labels);
    expect(unique.size).toBe(44);
  });

  it("phân bổ chuẩn 3 cấp độ học lực", () => {
    expect(SPCK_LEVEL_CONFIGS).toHaveLength(3);
    const yeu = SPCK_OBSERVATION_BANK.filter((i) => i.level === "yeu");
    const tb = SPCK_OBSERVATION_BANK.filter((i) => i.level === "trung_binh");
    const khaGioi = SPCK_OBSERVATION_BANK.filter((i) => i.level === "kha_gioi");

    expect(yeu).toHaveLength(17);
    expect(tb).toHaveLength(14);
    expect(khaGioi).toHaveLength(13);
  });

  it("phân bổ đủ 6 nhóm kỹ năng cho từng cấp độ", () => {
    expect(SPCK_SKILL_GROUPS).toHaveLength(6);

    const skills = [
      "attitude",
      "coding",
      "self_study",
      "project_progress",
      "soft_skills",
      "knowledge",
    ];

    for (const skill of skills) {
      expect(
        SPCK_OBSERVATION_BANK.some((i) => i.skillGroup === skill)
      ).toBe(true);
    }
  });

  it("bao hàm toàn bộ 8 mục nhận xét SPCK cũ của hệ thống", () => {
    const old8 = [
      "Tập trung làm bài, tìm hiểu thêm nhiều kiến thức lập trình",
      "Chưa có ý tưởng, còn gặp khó khăn trong việc xác định hướng làm",
      "Chủ động hỏi khi bí ý tưởng",
      "Biết chia nhỏ việc để làm dần từng phần",
      "Hoàn thành đúng tiến độ đề ra",
      "Cần hỗ trợ thêm để hoàn thiện sản phẩm",
      "Có ý tưởng nhưng triển khai còn chậm",
      "Chủ động tìm hiểu thêm kiến thức ngoài buổi học để làm sản phẩm",
    ];

    for (const oldText of old8) {
      const found = SPCK_OBSERVATION_BANK.some(
        (i) => i.label.toLowerCase() === oldText.toLowerCase()
      );
      expect(found).toBe(true);
    }
  });

  it("tra cứu getSpckLevel và getSpckSkillGroup chính xác", () => {
    expect(
      getSpckLevel("Còn thụ động, chưa chủ động đặt câu hỏi khi gặp khó khăn")
    ).toBe("yeu");
    expect(
      getSpckSkillGroup("Còn thụ động, chưa chủ động đặt câu hỏi khi gặp khó khăn")
    ).toBe("attitude");

    expect(getSpckLevel("Chủ động hỏi khi bí ý tưởng")).toBe("trung_binh");
    expect(getSpckSkillGroup("Chủ động hỏi khi bí ý tưởng")).toBe("attitude");

    expect(getSpckLevel("Sản phẩm có tính sáng tạo, vượt yêu cầu đề ra")).toBe(
      "kha_gioi"
    );
    expect(
      getSpckSkillGroup("Sản phẩm có tính sáng tạo, vượt yêu cầu đề ra")
    ).toBe("project_progress");
  });

  it("resolveDefaultSpckLevel tự động chọn tab cấp độ theo học lực học viên", () => {
    expect(resolveDefaultSpckLevel("gioi")).toBe("kha_gioi");
    expect(resolveDefaultSpckLevel("kha")).toBe("kha_gioi");
    expect(resolveDefaultSpckLevel("trung_binh")).toBe("trung_binh");
    expect(resolveDefaultSpckLevel("can_co_gang")).toBe("yeu");
    expect(resolveDefaultSpckLevel(null)).toBe("all");
    expect(resolveDefaultSpckLevel(undefined)).toBe("all");
  });

  it("nhận diện điểm cần cải thiện qua isSpckImprovement", () => {
    expect(isSpckImprovement("Còn thụ động, chưa chủ động đặt câu hỏi")).toBe(
      true
    );
    expect(isSpckImprovement("Tiến độ chậm so với kế hoạch")).toBe(true);
    expect(isSpckImprovement("Có tinh thần cầu tiến, tiếp thu góp ý tốt")).toBe(
      false
    );
    expect(isSpckImprovement("Hoàn thành đúng tiến độ đề ra")).toBe(false);
  });
});
