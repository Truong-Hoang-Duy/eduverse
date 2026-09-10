import { describe, expect, it } from "vitest";

import {
  arrangeShowcaseProjects,
  expiryFromPreset,
  hasRated,
  normalizeVi,
  overallScore,
  formatRemaining,
  generateShowcaseToken,
  isShowcaseExpired,
  isShowcaseToken,
  showcasePath,
  showcaseStatus,
} from "./showcase";

const NOW = new Date("2026-08-29T10:00:00.000Z");

describe("generateShowcaseToken", () => {
  it("should produce a token the DB constraint accepts", () => {
    expect(isShowcaseToken(generateShowcaseToken())).toBe(true);
  });

  it("should be url-safe (no characters needing escaping)", () => {
    for (let i = 0; i < 50; i++) {
      const token = generateShowcaseToken();
      expect(encodeURIComponent(token)).toBe(token);
    }
  });

  it("should not repeat across calls", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateShowcaseToken));
    expect(tokens.size).toBe(200);
  });
});

describe("isShowcaseToken", () => {
  it("should reject a token that is too short to be unguessable", () => {
    expect(isShowcaseToken("abc123")).toBe(false);
  });

  it("should reject path traversal and other junk on the url", () => {
    expect(isShowcaseToken("../../etc/passwd")).toBe(false);
    expect(isShowcaseToken("token with space")).toBe(false);
    expect(isShowcaseToken("")).toBe(false);
  });
});

describe("expiryFromPreset", () => {
  it("should return null for the no-expiry preset", () => {
    expect(expiryFromPreset("none", NOW)).toBeNull();
  });

  it("should add the right number of days", () => {
    expect(expiryFromPreset("7", NOW)).toBe("2026-09-05T10:00:00.000Z");
    expect(expiryFromPreset("1", NOW)).toBe("2026-08-30T10:00:00.000Z");
    expect(expiryFromPreset("30", NOW)).toBe("2026-09-28T10:00:00.000Z");
  });
});

describe("isShowcaseExpired", () => {
  it("should treat a null expiry as never expiring", () => {
    expect(isShowcaseExpired(null, NOW)).toBe(false);
  });

  it("should expire exactly at the deadline, not a moment later", () => {
    expect(isShowcaseExpired("2026-08-29T10:00:00.000Z", NOW)).toBe(true);
  });

  it("should not expire before the deadline", () => {
    expect(isShowcaseExpired("2026-08-29T10:00:01.000Z", NOW)).toBe(false);
  });
});

describe("showcaseStatus", () => {
  it("should report off when there is no showcase row yet", () => {
    expect(showcaseStatus(null, NOW)).toBe("off");
  });

  it("should report off when the teacher switched it off", () => {
    expect(
      showcaseStatus({ is_enabled: false, expires_at: null }, NOW)
    ).toBe("off");
  });

  it("should report expired for an enabled but out-of-date link", () => {
    expect(
      showcaseStatus({ is_enabled: true, expires_at: "2026-08-28T10:00:00.000Z" }, NOW)
    ).toBe("expired");
  });

  it("should report live for an enabled link still in date", () => {
    expect(
      showcaseStatus({ is_enabled: true, expires_at: "2026-09-05T10:00:00.000Z" }, NOW)
    ).toBe("live");
  });
});

describe("formatRemaining", () => {
  it("should say it never expires", () => {
    expect(formatRemaining(null, NOW)).toBe("không hết hạn");
  });

  it("should count whole days down", () => {
    expect(formatRemaining("2026-09-05T10:00:00.000Z", NOW)).toBe("còn 7 ngày");
  });

  it("should switch to hours under a day", () => {
    expect(formatRemaining("2026-08-29T15:00:00.000Z", NOW)).toBe("còn 5 giờ");
  });

  it("should switch to minutes under an hour", () => {
    expect(formatRemaining("2026-08-29T10:20:00.000Z", NOW)).toBe("còn 20 phút");
  });

  it("should report a past deadline as expired", () => {
    expect(formatRemaining("2026-08-01T10:00:00.000Z", NOW)).toBe("đã hết hạn");
  });
});

describe("showcasePath", () => {
  it("should build the public route from the token", () => {
    expect(showcasePath("abc")).toBe("/showcase/abc");
  });
});

describe("overallScore", () => {
  it("should return null when the teacher keeps results hidden", () => {
    expect(overallScore(null)).toBeNull();
  });

  it("should return null when nobody has scored any criterion yet", () => {
    expect(
      overallScore({ product: null, presentation: null, creativity: null })
    ).toBeNull();
  });

  it("should average only the criteria that actually have a score", () => {
    // Bỏ trống KHÔNG được tính là 0 — phụ huynh không nghe thuyết trình thì
    // điểm chung vẫn phải phản ánh đúng những gì họ có chấm.
    expect(
      overallScore({ product: 5, presentation: null, creativity: 4 })
    ).toBe(4.5);
  });

  it("should round to one decimal place", () => {
    expect(overallScore({ product: 5, presentation: 4, creativity: 4 })).toBe(4.3);
  });
});

describe("hasRated", () => {
  const blank = {
    id: "r1",
    project_id: "p1",
    score_product: null,
    score_presentation: null,
    score_creativity: null,
    comment: null,
    created_at: "2026-08-29T10:00:00.000Z",
  };

  it("should be false when this browser never rated the student", () => {
    expect(hasRated(undefined)).toBe(false);
  });

  it("should be true when only a comment was left", () => {
    expect(hasRated({ ...blank, comment: "Con lam tot" })).toBe(true);
  });

  it("should be true when only one criterion was scored", () => {
    expect(hasRated({ ...blank, score_presentation: 4 })).toBe(true);
  });

  it("should be false for an all-blank row", () => {
    expect(hasRated(blank)).toBe(false);
  });
});

describe("normalizeVi", () => {
  it("should let a parent type without diacritics and still find their child", () => {
    expect(normalizeVi("Nguyễn Thị Ánh")).toBe("nguyen thi anh");
  });

  it("should fold đ/Đ, which NFD does not decompose", () => {
    expect(normalizeVi("Đặng Đức")).toBe("dang duc");
  });

  it("should trim and lowercase", () => {
    expect(normalizeVi("  AN  ")).toBe("an");
  });
});

describe("arrangeShowcaseProjects", () => {
  const base = {
    description: null,
    features: [],
    image_urls: [],
    repo_url: null,
    demo_url: null,
    extra_notes: null,
    reaction_count: 0,
    rating_count: 0,
    rating_avg: null,
    guest_notes: [],
    comments: [],
  };
  const an = { ...base, id: "an", author_name: "Ánh", name: "Game rắn", updated_at: "2026-09-01T00:00:00Z" };
  const binh = { ...base, id: "binh", author_name: "Bình", name: "Máy tính", updated_at: "2026-09-03T00:00:00Z" };
  const cuong = { ...base, id: "cuong", author_name: "Cường", name: "Web bán hàng", updated_at: "2026-09-02T00:00:00Z" };
  const projects = [cuong, an, binh];

  const opts = {
    query: "",
    sort: "name" as const,
    onlyUnrated: false,
    ratedIds: [] as string[],
  };

  it("should sort by author name in Vietnamese order by default", () => {
    expect(arrangeShowcaseProjects(projects, opts).map((p) => p.id)).toEqual([
      "an",
      "binh",
      "cuong",
    ]);
  });

  it("should sort by most recently updated first", () => {
    expect(
      arrangeShowcaseProjects(projects, { ...opts, sort: "recent" }).map((p) => p.id)
    ).toEqual(["binh", "cuong", "an"]);
  });

  it("should sort by hearts, falling back to name on a tie", () => {
    const hearts = { cuong: 5, an: 2, binh: 2 };
    expect(
      arrangeShowcaseProjects(projects, { ...opts, sort: "hearts", hearts }).map(
        (p) => p.id
      )
    ).toEqual(["cuong", "an", "binh"]);
  });

  it("should keep only the students this device has not rated yet", () => {
    expect(
      arrangeShowcaseProjects(projects, {
        ...opts,
        onlyUnrated: true,
        ratedIds: ["an"],
      }).map((p) => p.id)
    ).toEqual(["binh", "cuong"]);
  });

  it("should search by name without diacritics, across author and project name", () => {
    expect(
      arrangeShowcaseProjects(projects, { ...opts, query: "anh" }).map((p) => p.id)
    ).toEqual(["an"]);
    expect(
      arrangeShowcaseProjects(projects, { ...opts, query: "ban hang" }).map((p) => p.id)
    ).toEqual(["cuong"]);
  });

  it("should handle uppercase query and trailing spaces when searching by name", () => {
    expect(
      arrangeShowcaseProjects(projects, { ...opts, query: "  ÁNH  " }).map((p) => p.id)
    ).toEqual(["an"]);
    expect(
      arrangeShowcaseProjects(projects, { ...opts, query: "BINH" }).map((p) => p.id)
    ).toEqual(["binh"]);
  });

  it("should return empty array when query does not match any author or project name", () => {
    expect(
      arrangeShowcaseProjects(projects, { ...opts, query: "khong co ai" })
    ).toEqual([]);
  });

  it("should not mutate the array it was given", () => {
    const input = [...projects];
    arrangeShowcaseProjects(input, opts);
    expect(input.map((p) => p.id)).toEqual(["cuong", "an", "binh"]);
  });
});
