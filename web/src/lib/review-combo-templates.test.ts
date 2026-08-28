import { describe, expect, it } from "vitest";

import { SKILL_GROUPS, type SkillGroup } from "./skill-groups";
import {
  COMBO_TEMPLATES,
  LABELS_PER_GROUP,
  MAX_LABELS_PER_FIELD,
  pickRotating,
  rotateSlice,
} from "./review-combo-templates";

/** Danh mục giả lập: mỗi nhóm 10 nhãn, đúng cỡ danh mục thật của GV (≥10/nhóm). */
function catalog(labelsPerGroup = 10): Map<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const category of ["strength", "improvement"]) {
    for (const group of SKILL_GROUPS) {
      byKey.set(
        `${category}:${group.value}`,
        Array.from(
          { length: labelsPerGroup },
          (_, i) => `${category}-${group.value}-${i}`
        )
      );
    }
  }
  return byKey;
}

describe("rotateSlice", () => {
  it("should take consecutive items from the start position", () => {
    expect(rotateSlice(["a", "b", "c", "d"], 1, 2)).toEqual(["b", "c"]);
  });

  it("should wrap around the end instead of returning fewer items", () => {
    // Đây là điểm khác `.slice()`: tới cuối mảng thì quay lại đầu, nên bộ mẫu ở
    // cuối danh sách vẫn nhận đủ nhãn.
    expect(rotateSlice(["a", "b", "c"], 2, 3)).toEqual(["c", "a", "b"]);
  });

  it("should never return more items than the pool has", () => {
    expect(rotateSlice(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });

  it("should survive an empty pool", () => {
    // Nhóm kỹ năng GV chưa có nhãn nào — không được ném lỗi giữa lúc seed.
    expect(rotateSlice([], 3, 2)).toEqual([]);
  });

  it("should normalise a start position past the end", () => {
    expect(rotateSlice(["a", "b", "c"], 7, 1)).toEqual(["b"]);
  });
});

describe("pickRotating", () => {
  const byKey = catalog();

  it("should take LABELS_PER_GROUP labels from each group", () => {
    const picked = pickRotating(byKey, "strength", ["thinking", "coding"], 0);

    expect(picked).toHaveLength(LABELS_PER_GROUP * 2);
  });

  it("should give DIFFERENT labels to different templates from the same group", () => {
    // 🔴 Đây là bug bản cũ: mọi bộ đều `.slice(0, 2)` nên luôn nhận đúng 2 nhãn
    // đầu, phần còn lại của danh mục không bao giờ được dùng (user phản ánh
    // 2026-08-28 "chưa tận dụng hết kỹ năng đã nhập").
    const first = pickRotating(byKey, "strength", ["thinking"], 0);
    const second = pickRotating(byKey, "strength", ["thinking"], 1);

    expect(second).not.toEqual(first);
    expect(first.some((l) => second.includes(l))).toBe(false);
  });

  it("should not repeat a label inside one combo", () => {
    // Hai nhóm có thể chồng nhãn nếu GV đặt trùng — badge trùng nhìn rất kỳ.
    const shared = new Map<string, string[]>([
      ["strength:thinking", ["a", "b", "c"]],
      ["strength:coding", ["b", "c", "d"]],
    ]);
    const picked = pickRotating(shared, "strength", ["thinking", "coding"], 0);

    expect(new Set(picked).size).toBe(picked.length);
  });

  it("should cap a many-group combo at MAX_LABELS_PER_FIELD", () => {
    const picked = pickRotating(
      byKey,
      "strength",
      ["thinking", "coding", "attitude", "discipline"],
      0
    );

    expect(picked.length).toBeLessThanOrEqual(MAX_LABELS_PER_FIELD);
  });

  it("should skip groups the teacher has no labels for", () => {
    // `thinking` rỗng → bộ vẫn dựng được từ mình `coding`, không ném lỗi và
    // không chèn chỗ trống. (Thứ tự do xoay vòng quyết định nên so theo TẬP.)
    const sparse = new Map<string, string[]>([["strength:coding", ["x", "y"]]]);
    const picked = pickRotating(sparse, "strength", ["thinking", "coding"], 0);

    expect([...picked].sort()).toEqual(["x", "y"]);
  });

  it("should return nothing when the whole category is empty", () => {
    expect(pickRotating(new Map(), "strength", ["thinking"], 0)).toEqual([]);
  });
});

describe("COMBO_TEMPLATES", () => {
  it("should have unique names so seeding twice cannot duplicate", () => {
    // `seedDefaultCombos` bỏ qua bộ TRÙNG TÊN — hai mẫu cùng tên nghĩa là một
    // cái không bao giờ được tạo.
    const names = COMBO_TEMPLATES.map((t) => t.name.toLowerCase());

    expect(new Set(names).size).toBe(names.length);
  });

  it("should give every template something to fill in", () => {
    for (const t of COMBO_TEMPLATES) {
      const hasContent =
        (t.strengths?.length ?? 0) > 0 ||
        (t.improvements?.length ?? 0) > 0 ||
        t.project === true;
      expect(hasContent, `bộ rỗng: ${t.name}`).toBe(true);
    }
  });

  it("should only reference real skill groups", () => {
    // Nhóm gõ sai chính tả sẽ lặng lẽ rút ra 0 nhãn — bộ mẫu trống mà không báo.
    const valid = new Set<string>(SKILL_GROUPS.map((g) => g.value));
    for (const t of COMBO_TEMPLATES) {
      for (const group of [...(t.strengths ?? []), ...(t.improvements ?? [])]) {
        expect(valid.has(group), `nhóm lạ "${group}" ở bộ ${t.name}`).toBe(true);
      }
    }
  });

  it("should use EVERY skill group somewhere across the templates", () => {
    // Chính là yêu cầu "tận dụng hết các kỹ năng đưa vào" (2026-08-28): nhóm nào
    // không bộ nào nhắc tới thì nhãn của nhóm đó chẳng bao giờ được áp.
    const used = new Set<SkillGroup>();
    for (const t of COMBO_TEMPLATES) {
      for (const group of [...(t.strengths ?? []), ...(t.improvements ?? [])]) {
        used.add(group);
      }
    }

    // "other" là catch-all, cố ý không đưa vào bộ mẫu nào.
    const expected = SKILL_GROUPS.map((g) => g.value).filter(
      (v) => v !== "other"
    );
    for (const group of expected) {
      expect(used.has(group as SkillGroup), `nhóm chưa dùng: ${group}`).toBe(true);
    }
  });

  it("should cover both strengths and improvements in most templates", () => {
    // Mục đích của "chân dung": áp 1 lần điền được cả 2 ô. Bộ chỉ có 1 vế là
    // ngoại lệ, không nên thành đa số.
    const both = COMBO_TEMPLATES.filter(
      (t) => (t.strengths?.length ?? 0) > 0 && (t.improvements?.length ?? 0) > 0
    );

    expect(both.length).toBe(COMBO_TEMPLATES.length);
  });

  it("should keep the SPCK templates recognisable by name", () => {
    // GV lọc bằng mắt trong dropdown phẳng — bộ SPCK phải tự nói nó là SPCK.
    for (const t of COMBO_TEMPLATES.filter((t) => t.project)) {
      expect(t.name, `bộ SPCK không có nhãn SPCK: ${t.name}`).toContain("SPCK");
    }
  });
});
