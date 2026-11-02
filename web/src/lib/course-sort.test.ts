import { describe, expect, it } from "vitest";

import {
  compareCoursesByRoadmap,
  detectCourseDomainRank,
  detectCourseLevelRank,
  sortCoursesByRoadmap,
} from "./course-sort";

describe("course-sort (MindX K12 roadmap ordering)", () => {
  it("sorts Computer Science courses as Basic -> Advance -> Intensive (CSB -> CSA -> CSI)", () => {
    const input = [
      { code: "CSA", name: "Computer Science Advance" },
      { code: "CSI", name: "Computer Science Intensive" },
      { code: "CSB", name: "Computer Science Basic" },
    ];

    const sorted = sortCoursesByRoadmap(input);
    expect(sorted.map((c) => c.code)).toEqual(["CSB", "CSA", "CSI"]);
  });

  it("sorts full roadmap from youngest to oldest (Scratch -> Game -> App -> Web -> CS) and Basic -> Advance -> Intensive within each", () => {
    const shuffled = [
      { code: "CSI", name: "Computer Science Intensive" },
      { code: "CSA", name: "Computer Science Advance" },
      { code: "JSI", name: "Web Intensive" },
      { code: "GMA", name: "GameMaker Advance" },
      { code: "SA", name: "Scratch Advance" },
      { code: "PTI", name: "Python App Intensive" },
      { code: "CSB", name: "Computer Science Basic" },
      { code: "SB", name: "Scratch Basic" },
      { code: "JSB", name: "Web Basic" },
      { code: "PTB", name: "Python App Basic" },
      { code: "GMB", name: "GameMaker Basic" },
      { code: "SI", name: "Scratch Intensive" },
      { code: "PTA", name: "Python App Advance" },
      { code: "GMI", name: "GameMaker Intensive" },
      { code: "JSA", name: "Web Advance" },
    ];

    const sorted = sortCoursesByRoadmap(shuffled);
    expect(sorted.map((c) => c.code)).toEqual([
      "SB",
      "SA",
      "SI",
      "GMB",
      "GMA",
      "GMI",
      "PTB",
      "PTA",
      "PTI",
      "JSB",
      "JSA",
      "JSI",
      "CSB",
      "CSA",
      "CSI",
    ]);
  });

  it("detects domain and level purely from course code when name is absent", () => {
    expect(detectCourseDomainRank("SB")).toBe(0);
    expect(detectCourseDomainRank("GB")).toBe(1);
    expect(detectCourseDomainRank("PTB")).toBe(2);
    expect(detectCourseDomainRank("JSB")).toBe(3);
    expect(detectCourseDomainRank("CSB")).toBe(4);

    expect(detectCourseLevelRank("CSB")).toBe(0);
    expect(detectCourseLevelRank("CSA")).toBe(1);
    expect(detectCourseLevelRank("CSI")).toBe(2);

    const codesOnly = [
      { code: "CSA" },
      { code: "CSB" },
      { code: "JSA" },
      { code: "JSB" },
      { code: "SA" },
      { code: "SB" },
    ];
    expect(sortCoursesByRoadmap(codesOnly).map((c) => c.code)).toEqual([
      "SB",
      "SA",
      "JSB",
      "JSA",
      "CSB",
      "CSA",
    ]);
  });

  it("groups unknown custom course families together while keeping B -> A -> I order", () => {
    const custom = [
      { code: "ROBOA", name: "Robotics Nâng cao" },
      { code: "ROBOI", name: "Robotics Chuyên sâu" },
      { code: "ROBOB", name: "Robotics Cơ bản" },
    ];
    expect([...custom].sort(compareCoursesByRoadmap).map((c) => c.code)).toEqual([
      "ROBOB",
      "ROBOA",
      "ROBOI",
    ]);
  });
});

