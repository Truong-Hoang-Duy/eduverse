import { describe, expect, it } from "vitest";

import {
  filterCopySessionsByFormat,
  formatToFlags,
  getSessionFormatBadge,
  resolveSessionFormat,
  SESSION_FORMATS,
} from "./session-format";

describe("session-format", () => {
  describe("resolveSessionFormat", () => {
    it("mặc định trả về standard khi tất cả cờ là false hoặc null/undefined", () => {
      expect(resolveSessionFormat({})).toBe("standard");
      expect(
        resolveSessionFormat({
          is_periodic_test: false,
          is_project_period: false,
          is_final_presentation: false,
        })
      ).toBe("standard");
    });

    it("nhận diện final_presentation khi có cờ is_final_presentation = true", () => {
      expect(
        resolveSessionFormat({
          is_final_presentation: true,
          is_periodic_test: false,
          is_project_period: false,
        })
      ).toBe("final_presentation");
    });

    it("nhận diện periodic_test khi có cờ is_periodic_test = true", () => {
      expect(
        resolveSessionFormat({
          is_final_presentation: false,
          is_periodic_test: true,
          is_project_period: false,
        })
      ).toBe("periodic_test");
    });

    it("nhận diện project_period khi có cờ is_project_period = true", () => {
      expect(
        resolveSessionFormat({
          is_final_presentation: false,
          is_periodic_test: false,
          is_project_period: true,
        })
      ).toBe("project_period");
    });

    it("ưu tiên final_presentation nếu cả final_presentation và periodic_test đều true", () => {
      expect(
        resolveSessionFormat({
          is_final_presentation: true,
          is_periodic_test: true,
        })
      ).toBe("final_presentation");
    });

    it("graceful fallback cho buổi 14 khi cột is_final_presentation chưa có trong DB (undefined)", () => {
      // Khi DB chưa dán migration, is_final_presentation là undefined
      // Nếu là buổi 14 và không có cờ khác:
      expect(
        resolveSessionFormat({
          session_number: 14,
        })
      ).toBe("final_presentation");

      // Nhưng nếu đã chọn kiểm tra (is_periodic_test = true), phải trả về periodic_test:
      expect(
        resolveSessionFormat({
          session_number: 14,
          is_periodic_test: true,
        })
      ).toBe("periodic_test");

      // Hoặc nếu đã chọn SPCK (is_project_period = true), phải trả về project_period:
      expect(
        resolveSessionFormat({
          session_number: 14,
          is_project_period: true,
        })
      ).toBe("project_period");
    });
  });

  describe("formatToFlags", () => {
    it("chuyển standard sang bộ cờ toàn false", () => {
      expect(formatToFlags("standard")).toEqual({
        isPeriodicTest: false,
        isProjectPeriod: false,
        isFinalPresentation: false,
      });
    });

    it("chuyển periodic_test sang bộ cờ đúng", () => {
      expect(formatToFlags("periodic_test")).toEqual({
        isPeriodicTest: true,
        isProjectPeriod: false,
        isFinalPresentation: false,
      });
    });

    it("chuyển project_period sang bộ cờ đúng", () => {
      expect(formatToFlags("project_period")).toEqual({
        isPeriodicTest: false,
        isProjectPeriod: true,
        isFinalPresentation: false,
      });
    });

    it("chuyển final_presentation sang bộ cờ đúng", () => {
      expect(formatToFlags("final_presentation")).toEqual({
        isPeriodicTest: false,
        isProjectPeriod: false,
        isFinalPresentation: true,
      });
    });
  });

  describe("getSessionFormatBadge", () => {
    it("standard trả về null (không hiện badge)", () => {
      expect(getSessionFormatBadge("standard")).toBeNull();
    });

    it("final_presentation trả về badge Demo Day", () => {
      const badge = getSessionFormatBadge("final_presentation");
      expect(badge?.label).toBe("🎤 Demo Day");
    });

    it("periodic_test trả về Kiểm tra cho các buổi thường", () => {
      const badge = getSessionFormatBadge("periodic_test", 5, 14);
      expect(badge?.label).toBe("📝 Kiểm tra");
    });

    it("periodic_test trả về Thi cuối khóa khi là buổi 14 hoặc buổi cuối", () => {
      const badgeB14 = getSessionFormatBadge("periodic_test", 14, 14);
      expect(badgeB14?.label).toBe("📝 Thi cuối khóa");

      const badgeLast = getSessionFormatBadge("periodic_test", 10, 10);
      expect(badgeLast?.label).toBe("📝 Thi cuối khóa");
    });

    it("project_period trả về badge SPCK", () => {
      const badge = getSessionFormatBadge("project_period");
      expect(badge?.label).toBe("💻 SPCK");
    });
  });

  describe("SESSION_FORMATS config", () => {
    it("có đủ cấu hình cho cả 4 loại hình", () => {
      expect(SESSION_FORMATS.standard).toBeDefined();
      expect(SESSION_FORMATS.periodic_test).toBeDefined();
      expect(SESSION_FORMATS.project_period).toBeDefined();
      expect(SESSION_FORMATS.final_presentation).toBeDefined();
    });
  });

  describe("filterCopySessionsByFormat", () => {
    const mockSessions = [
      { id: "s1", sessionNumber: 1, format: "standard" as const, students: 10 },
      { id: "s2", sessionNumber: 2, format: "standard" as const, students: 10 },
      { id: "s3", sessionNumber: 3, format: "standard" as const, students: 10 },
      { id: "s4", sessionNumber: 4, format: "standard" as const, students: 10 },
      { id: "s5", sessionNumber: 5, format: "periodic_test" as const, students: 10 },
      { id: "s6", sessionNumber: 6, format: "standard" as const, students: 10 },
      { id: "s7", sessionNumber: 7, format: "standard" as const, students: 10 },
      { id: "s8", sessionNumber: 8, format: "standard" as const, students: 10 },
      { id: "s9", sessionNumber: 9, format: "periodic_test" as const, students: 10 },
      { id: "s10", sessionNumber: 10, format: "project_period" as const, students: 10 },
      { id: "s11", sessionNumber: 11, format: "project_period" as const, students: 10 },
      { id: "s12", sessionNumber: 12, format: "project_period" as const, students: 10 },
      { id: "s13", sessionNumber: 13, format: "project_period" as const, students: 10 },
      { id: "s14_test", sessionNumber: 14, format: "periodic_test" as const, students: 10 },
      { id: "s14_demo", sessionNumber: 14, format: "final_presentation" as const, students: 10 },
    ];

    it("lọc chính xác các buổi tiêu chuẩn: 1, 2, 3, 4, 6, 7, 8", () => {
      const result = filterCopySessionsByFormat(mockSessions, "standard");
      expect(result.map((s) => s.sessionNumber)).toEqual([1, 2, 3, 4, 6, 7, 8]);
    });

    it("lọc chính xác các buổi bài kiểm tra: 5, 9, 14", () => {
      const result = filterCopySessionsByFormat(mockSessions, "periodic_test");
      expect(result.map((s) => s.sessionNumber)).toEqual([5, 9, 14]);
    });

    it("lọc chính xác các buổi làm đồ án (SPCK): 10, 11, 12, 13", () => {
      const result = filterCopySessionsByFormat(mockSessions, "project_period");
      expect(result.map((s) => s.sessionNumber)).toEqual([10, 11, 12, 13]);
    });

    it("lọc chính xác buổi thuyết trình demo: 14", () => {
      const result = filterCopySessionsByFormat(mockSessions, "final_presentation");
      expect(result.map((s) => s.sessionNumber)).toEqual([14]);
    });

    it("trả về mảng rỗng nếu không có buổi nào cùng hình thức", () => {
      const onlyStandard = [
        { id: "s1", sessionNumber: 1, format: "standard" as const, students: 10 },
      ];
      expect(filterCopySessionsByFormat(onlyStandard, "periodic_test")).toEqual([]);
      expect(filterCopySessionsByFormat(onlyStandard, "project_period")).toEqual([]);
      expect(filterCopySessionsByFormat(onlyStandard, "final_presentation")).toEqual([]);
    });
  });
});
