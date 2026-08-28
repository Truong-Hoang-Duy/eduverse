import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ACADEMIC_LEVELS, academicLevelLabel, isAcademicLevel } from "./academic-levels";

describe("academicLevelLabel", () => {
  it("should give the Vietnamese label of a known level", () => {
    expect(academicLevelLabel("gioi")).toBe("Giỏi");
    expect(academicLevelLabel("can_co_gang")).toBe("Cần cố gắng");
  });

  it("should return null when nothing is chosen", () => {
    // Web gửi NHÃN sang ai-service; null nghĩa là "không đưa ngữ cảnh xếp loại".
    expect(academicLevelLabel(null)).toBeNull();
    expect(academicLevelLabel(undefined)).toBeNull();
    expect(academicLevelLabel("")).toBeNull();
  });

  it("should return null for an unknown value instead of echoing it", () => {
    // Giá trị lạ (dữ liệu cũ, ai đó sửa request) không được lọt vào prompt.
    expect(academicLevelLabel("xuat_sac")).toBeNull();
    expect(academicLevelLabel("GIOI")).toBeNull();
  });
});

describe("isAcademicLevel", () => {
  it("should accept every declared level", () => {
    for (const level of ACADEMIC_LEVELS) {
      expect(isAcademicLevel(level.value)).toBe(true);
    }
  });

  it("should reject anything else", () => {
    // `saveReview` dùng hàm này để lọc rác trước khi ghi DB.
    expect(isAcademicLevel("yeu")).toBe(false);
    expect(isAcademicLevel("")).toBe(false);
  });
});

describe("ACADEMIC_LEVELS", () => {
  it("should deliberately avoid the harsh labels", () => {
    // Chốt 2026-07-27: cố ý tránh "Yếu"/"Kém" cho hợp TONE_RULE.
    const labels = ACADEMIC_LEVELS.map((l) => l.label).join(" ");
    expect(labels).not.toMatch(/Yếu|Kém/);
  });

  it("should match the CHECK constraint in the migration", () => {
    // Ràng buộc thật nằm ở DB. Đổi danh sách bên TS mà quên migration thì lưu
    // xong mới lỗi ở production — test này bắt ngay lúc `pnpm test`.
    const sql = readFileSync(
      join(
        process.cwd(),
        "..",
        "supabase",
        "migrations",
        "20260828000000_class_level_project_period.sql"
      ),
      "utf8"
    );
    const match = sql.match(/check \(academic_level in \(([^)]+)\)\)/);
    expect(match, "không tìm thấy CHECK academic_level trong migration").toBeTruthy();

    const inMigration = [...match![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

    expect([...inMigration].sort()).toEqual(
      ACADEMIC_LEVELS.map((l) => l.value).sort()
    );
  });
});
