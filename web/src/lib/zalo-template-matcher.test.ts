import { describe, expect, it } from "vitest";

import { findBestMatchingZaloTemplate } from "./zalo-template-matcher";

describe("zalo-template-matcher", () => {
  const teacherTemplates = [
    { id: "spck-1", name: "SPCK" },
    { id: "std-1", name: "Thông báo buổi học" },
  ];

  it("selects 'Thông báo buổi học' for standard session format", () => {
    const match = findBestMatchingZaloTemplate(teacherTemplates, "standard");
    expect(match?.id).toBe("std-1");
    expect(match?.name).toBe("Thông báo buổi học");
  });

  it("selects 'SPCK' for project_period session format", () => {
    const match = findBestMatchingZaloTemplate(teacherTemplates, "project_period");
    expect(match?.id).toBe("spck-1");
    expect(match?.name).toBe("SPCK");
  });

  it("falls back gracefully when specialized templates do not exist yet", () => {
    // For periodic_test, if no test template exists, falls back to standard
    const testMatch = findBestMatchingZaloTemplate(teacherTemplates, "periodic_test");
    expect(testMatch?.id).toBe("std-1");

    // For final_presentation, if no presentation template exists, falls back to SPCK
    const presMatch = findBestMatchingZaloTemplate(teacherTemplates, "final_presentation");
    expect(presMatch?.id).toBe("spck-1");
  });

  it("selects dedicated test and presentation templates when they exist", () => {
    const allTemplates = [
      { id: "std", name: "Thông báo buổi học" },
      { id: "test", name: "Thông báo kiểm tra định kỳ" },
      { id: "spck", name: "Tiến độ SPCK" },
      { id: "demo", name: "Buổi thuyết trình Demo Day" },
    ];

    expect(findBestMatchingZaloTemplate(allTemplates, "standard")?.id).toBe("std");
    expect(findBestMatchingZaloTemplate(allTemplates, "periodic_test")?.id).toBe("test");
    expect(findBestMatchingZaloTemplate(allTemplates, "project_period")?.id).toBe("spck");
    expect(findBestMatchingZaloTemplate(allTemplates, "final_presentation")?.id).toBe("demo");
  });

  it("returns undefined for empty template list", () => {
    expect(findBestMatchingZaloTemplate([], "standard")).toBeUndefined();
  });
});

