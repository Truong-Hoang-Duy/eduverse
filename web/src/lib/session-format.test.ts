import { describe, expect, it } from "vitest";

import {
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
});
