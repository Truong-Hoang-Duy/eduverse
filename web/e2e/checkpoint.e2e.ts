import { describe, expect, it } from "vitest";

import { isCheckpointAssignment } from "@/lib/assignment-utils";
import { loadPublicCheckpoint } from "@/lib/checkpoint-data";

describe("Public Checkpoints E2E", () => {
  it("nhận diện đúng đề bài checkpoint lớp CSA buổi 5", () => {
    const title = "[CSA - Checkpoints] Buổi 5 Đề bài";
    expect(isCheckpointAssignment(title)).toBe(true);
  });

  it("loadPublicCheckpoint đọc được dữ liệu thật của buổi 5 CSA qua UUID", async () => {
    const data = await loadPublicCheckpoint("69318418-114e-4a7c-bbfb-27f43f7bb72e");
    expect(data).not.toBeNull();
    const jsonStr = JSON.stringify(data);
    expect(jsonStr).toBeDefined();
    expect(jsonStr.length).toBeGreaterThan(100);
    expect(data?.sessionNumber).toBe(5);
    expect(data?.title).toContain("Checkpoints");
    expect(data?.files.length).toBeGreaterThan(0);
    expect(data?.files[0].kind).toBe("text");
    expect(data?.files[0].content).toContain("CÂU HỎI 1");
  });


  it("loadPublicCheckpoint giải quyết được alias csa-5", async () => {
    const data = await loadPublicCheckpoint("csa-5");
    expect(data).not.toBeNull();
    expect(data?.id).toBe("69318418-114e-4a7c-bbfb-27f43f7bb72e");
  });
});


