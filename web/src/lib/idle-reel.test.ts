import { describe, expect, it } from "vitest";

import { buildIdleReel } from "./idle-reel";

const an = { id: "an", image_urls: ["an-1.png", "an-2.png", "an-3.png"] };
const binh = { id: "binh", image_urls: ["binh-1.png"] };
const cuong = { id: "cuong", image_urls: [] };

describe("buildIdleReel", () => {
  it("should show every student once before repeating anyone", () => {
    const reel = buildIdleReel([an, binh, cuong]);
    expect(reel.slice(0, 3).map((i) => i.project.id)).toEqual([
      "an",
      "binh",
      "cuong",
    ]);
  });

  it("should never place two scenes of the same student back to back", () => {
    const reel = buildIdleReel([an, binh, cuong]);
    for (let i = 1; i < reel.length; i++) {
      expect(reel[i].project.id).not.toBe(reel[i - 1].project.id);
    }
  });

  it("should not repeat a student across the loop seam either", () => {
    // Vòng chiếu chạy lặp vô hạn: cảnh cuối nối thẳng vào cảnh đầu.
    const reel = buildIdleReel([an, binh, cuong]);
    expect(reel.at(-1)?.project.id).not.toBe(reel[0].project.id);
  });

  it("should drop later images no one else can be interleaved with", () => {
    // Chỉ mình `an` có ảnh thứ 2 và 3 → giữ lại là chiếu an liên tiếp.
    expect(buildIdleReel([an, binh, cuong]).map((i) => i.imageUrl)).toEqual([
      "an-1.png",
      "binh-1.png",
      null,
    ]);
  });

  it("should keep a later round when two students can alternate in it", () => {
    const hai = { id: "hai", image_urls: ["hai-1.png", "hai-2.png"] };
    expect(buildIdleReel([an, hai]).map((i) => i.imageUrl)).toEqual([
      "an-1.png",
      "hai-1.png",
      "an-2.png",
      "hai-2.png",
    ]);
  });

  it("should still give a student with no image one text-only scene", () => {
    const reel = buildIdleReel([cuong]);
    expect(reel).toHaveLength(1);
    expect(reel[0].imageUrl).toBeNull();
  });

  it("should give each scene a unique key even when a student repeats", () => {
    const keys = buildIdleReel([an, binh, cuong]).map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("should return nothing for an empty class", () => {
    expect(buildIdleReel([])).toEqual([]);
  });
});
