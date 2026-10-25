import { describe, expect, it } from "vitest";

import { isCheckpointAssignment } from "./assignment-utils";

describe("checkpoint-data helper checks", () => {
  it("nhận diện đúng đề bài checkpoint lớp CSA buổi 5", () => {
    const title = "[CSA - Checkpoints] Buổi 5 Đề bài";
    expect(isCheckpointAssignment(title)).toBe(true);
  });
});


