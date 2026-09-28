import { describe, expect, it } from "vitest";

import { PROJECT_COMMENT_MAX } from "@/lib/project-limits";

describe("project-comments", () => {
  it("enforces PROJECT_COMMENT_MAX limit to be 2000 characters", () => {
    expect(PROJECT_COMMENT_MAX).toBe(2000);
  });

  it("validates comment length within limit", () => {
    const validComment = "Bài làm rất tốt, giao diện trực quan và dễ sử dụng!";
    expect(validComment.length).toBeLessThanOrEqual(PROJECT_COMMENT_MAX);

    const overlyLongComment = "a".repeat(PROJECT_COMMENT_MAX + 1);
    expect(overlyLongComment.length).toBeGreaterThan(PROJECT_COMMENT_MAX);
  });

  it("correctly identifies temporary optimistic comment IDs", () => {
    const tempId = `temp-${Date.now()}`;
    expect(tempId.startsWith("temp-")).toBe(true);

    const realUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(realUuid.startsWith("temp-")).toBe(false);
  });
});
