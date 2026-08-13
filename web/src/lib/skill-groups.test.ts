import { describe, expect, it } from "vitest";

import { SKILL_GROUPS, mergeSkillGroups, skillGroupLabel } from "./skill-groups";

describe("mergeSkillGroups", () => {
  it("should keep the 12 built-in groups when there are no custom ones", () => {
    expect(mergeSkillGroups([])).toEqual(SKILL_GROUPS);
  });

  it("should append custom groups after the built-in ones, in order", () => {
    const merged = mergeSkillGroups([
      { id: "abc-1", label: "🎨 Thiết kế" },
      { id: "abc-2", label: "🎵 Âm nhạc" },
    ]);
    expect(merged).toHaveLength(SKILL_GROUPS.length + 2);
    expect(merged.slice(SKILL_GROUPS.length)).toEqual([
      { value: "abc-1", label: "🎨 Thiết kế" },
      { value: "abc-2", label: "🎵 Âm nhạc" },
    ]);
  });
});

describe("skillGroupLabel", () => {
  it("should give the Vietnamese label of a built-in group", () => {
    expect(skillGroupLabel("thinking")).toBe("🧠 Tư duy");
  });

  it("should resolve a custom group by id when passed", () => {
    const customGroups = [{ id: "abc-1", label: "🎨 Thiết kế" }];
    expect(skillGroupLabel("abc-1", customGroups)).toBe("🎨 Thiết kế");
  });

  it("should fall back to 'Khác' for an unknown or unowned value", () => {
    // VD: nhóm tự thêm đã bị xóa, hoặc id của giáo viên khác lọt vào.
    expect(skillGroupLabel("not-a-real-group")).toBe("📌 Khác");
    expect(skillGroupLabel("abc-1", [])).toBe("📌 Khác");
  });
});
