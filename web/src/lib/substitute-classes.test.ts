import { describe, expect, it } from "vitest";

import {
  countHandledInSubstituteSession,
  decodeSubstituteClassFallback,
  encodeSubstituteClassFallback,
  mergeSubstituteStudents,
  normalizeSubstituteClassCode,
  parseBulkStudentNames,
  sanitizeSubstituteReviews,
  sanitizeSubstituteStudents,
  SUBSTITUTE_TEACHING_AI_NOTE,
  type SubstituteClass,
  withSubstituteTeachingContext,
} from "./substitute-classes";

describe("substitute-classes domain helpers", () => {
  it("normalizes free-form substitute class codes", () => {
    expect(normalizeSubstituteClassCode("  bh-csa06  ")).toBe("BH-CSA06");
    expect(normalizeSubstituteClassCode("onl-jsb12")).toBe("ONL-JSB12");
  });

  it("parses bulk pasted student names, stripping numbering and deduplicating", () => {
    const raw = `
      1. Nguyễn Văn An
      2) Trần Thị Bình
      - Lê Đỗ Minh Khôi
      • nguyễn văn an
      
      4: Võ Hoài Gia Phúc; Hoàng Minh
    `;
    expect(parseBulkStudentNames(raw)).toEqual([
      "Nguyễn Văn An",
      "Trần Thị Bình",
      "Lê Đỗ Minh Khôi",
      "Võ Hoài Gia Phúc",
      "Hoàng Minh",
    ]);
  });

  it("merges new students without duplicating existing roster entries", () => {
    const existing = [
      { id: "s1", full_name: "Nguyễn Văn An", academic_level: "gioi" },
    ];
    let seq = 2;
    const merged = mergeSubstituteStudents(
      existing,
      ["nguyễn văn an", "Trần Minh", "Lê Khôi"],
      () => `s${seq++}`
    );

    expect(merged).toEqual([
      { id: "s1", full_name: "Nguyễn Văn An", academic_level: "gioi" },
      { id: "s2", full_name: "Trần Minh", academic_level: null },
      { id: "s3", full_name: "Lê Khôi", academic_level: null },
    ]);
  });

  it("sanitizes students and reviews JSONB safely", () => {
    expect(
      sanitizeSubstituteStudents([
        { id: "s1", full_name: "An", academic_level: "kha" },
        { id: "s1", full_name: "Duplicate", academic_level: "gioi" },
        { id: "s2", full_name: "Bình", academic_level: "invalid_level" },
        { id: "", full_name: "NoId" },
      ])
    ).toEqual([
      { id: "s1", full_name: "An", academic_level: "kha" },
      { id: "s2", full_name: "Bình", academic_level: null },
    ]);

    expect(
      sanitizeSubstituteReviews({
        s1: {
          strengths: ["Tập trung"],
          improvements: ["Cần cẩn thận"],
          ai_generated_comment: "Em học tốt",
          is_absent: false,
        },
        s2: {
          strengths: ["Should clear"],
          improvements: [],
          ai_generated_comment: "Should clear",
          is_absent: true,
        },
      })
    ).toEqual({
      s1: {
        strengths: ["Tập trung"],
        improvements: ["Cần cẩn thận"],
        ai_generated_comment: "Em học tốt",
        is_absent: false,
      },
      s2: {
        strengths: [],
        improvements: [],
        ai_generated_comment: null,
        is_absent: true,
      },
    });
  });

  it("counts handled students and round-trips fallback encoding", () => {
    const cls: SubstituteClass = {
      id: "cls-1",
      courseId: null,
      courseName: "Computer Science Advance",
      classCode: "BH-CSA06",
      notes: "Dạy thay thầy Minh",
      students: [
        { id: "s1", full_name: "An", academic_level: "gioi" },
        { id: "s2", full_name: "Bình", academic_level: null },
        { id: "s3", full_name: "Chi", academic_level: null },
      ],
      sessions: [
        {
          id: "sess-1",
          substituteClassId: "cls-1",
          sessionNumber: 9,
          title: "Buổi 9: Kiểm tra",
          content: "Ôn tập dữ liệu",
          reviewContext: null,
          sessionDate: "2026-11-26",
          isPeriodicTest: true,
          isProjectPeriod: false,
          isFinalPresentation: false,
          reviews: {
            s1: {
              strengths: ["Tốt"],
              improvements: [],
              ai_generated_comment: "Em làm tốt.",
              is_absent: false,
            },
            s2: {
              strengths: [],
              improvements: [],
              ai_generated_comment: null,
              is_absent: true,
            },
          },
          createdAt: "2026-11-26T00:00:00Z",
          updatedAt: "2026-11-26T00:00:00Z",
        },
      ],
      createdAt: "2026-11-26T00:00:00Z",
      updatedAt: "2026-11-26T00:00:00Z",
    };

    expect(countHandledInSubstituteSession(cls.sessions[0], cls.students)).toBe(2);

    const encoded = encodeSubstituteClassFallback(cls);
    const decoded = decodeSubstituteClassFallback({
      id: "cls-1",
      name: encoded.name,
      template_text: encoded.template_text,
    });
    expect(decoded).toEqual(cls);
  });

  it("appends substitute teaching AI note once when flag is enabled", () => {
    expect(withSubstituteTeachingContext("Kiểm tra giữa khóa", false)).toBe(
      "Kiểm tra giữa khóa"
    );
    const withNote = withSubstituteTeachingContext("Kiểm tra giữa khóa", true);
    expect(withNote).toContain("Kiểm tra giữa khóa");
    expect(withNote).toContain(SUBSTITUTE_TEACHING_AI_NOTE);
    expect(withSubstituteTeachingContext(withNote, true)).toBe(withNote);
  });
});
