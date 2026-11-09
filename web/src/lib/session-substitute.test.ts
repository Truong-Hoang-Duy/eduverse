import { describe, expect, it } from "vitest";

import {
  addSubstituteMarker,
  cleanContextForDisplay,
  isSubstituteSession,
  removeSubstituteMarker,
  SUBSTITUTE_MARKER,
} from "./session-substitute";

describe("session-substitute", () => {
  it("detects substitute when is_substitute flag is true", () => {
    expect(isSubstituteSession({ is_substitute: true })).toBe(true);
    expect(isSubstituteSession({ is_substitute: false })).toBe(false);
    expect(isSubstituteSession(null)).toBe(false);
    expect(isSubstituteSession(undefined)).toBe(false);
  });

  it("detects substitute via review_context fallback marker", () => {
    expect(
      isSubstituteSession({
        is_substitute: false,
        review_context: `Buổi học vui vẻ\n${SUBSTITUTE_MARKER}`,
      })
    ).toBe(true);

    expect(
      isSubstituteSession({
        review_context: SUBSTITUTE_MARKER,
      })
    ).toBe(true);

    expect(
      isSubstituteSession({
        review_context: "Học sinh làm bài tốt",
      })
    ).toBe(false);
  });

  it("adds and removes substitute marker correctly", () => {
    const original = "Kiểm tra giữa kỳ";
    const withMarker = addSubstituteMarker(original);
    expect(withMarker).toContain(SUBSTITUTE_MARKER);
    expect(withMarker).toContain(original);

    // Duplicate add does not repeat marker
    const twice = addSubstituteMarker(withMarker);
    expect(twice).toBe(withMarker);

    // Remove restores original text
    const removed = removeSubstituteMarker(withMarker);
    expect(removed).toBe(original);

    // Remove from standalone marker returns null
    expect(removeSubstituteMarker(SUBSTITUTE_MARKER)).toBeNull();
  });

  it("cleans context for display", () => {
    expect(cleanContextForDisplay(`Lớp học chăm\n${SUBSTITUTE_MARKER}`)).toBe(
      "Lớp học chăm"
    );
    expect(cleanContextForDisplay(SUBSTITUTE_MARKER)).toBe("");
    expect(cleanContextForDisplay(null)).toBe("");
  });
});
