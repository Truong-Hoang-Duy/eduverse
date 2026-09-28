import { describe, expect, it } from "vitest";

import {
  type CommentItem,
  groupCommentsIntoThreads,
  parseCommentContent,
} from "@/lib/project-comments";
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

  it("parses bracketed mention format @[Name]: content", () => {
    const res = parseCommentContent("@[Nguyễn Văn B]: cảm ơn bạn rất nhiều");
    expect(res.replyToName).toBe("Nguyễn Văn B");
    expect(res.text).toBe("cảm ơn bạn rất nhiều");
  });

  it("parses simple mention format @Name: content", () => {
    const res = parseCommentContent("@Trần Nam: Dự án tuyệt vời");
    expect(res.replyToName).toBe("Trần Nam");
    expect(res.text).toBe("Dự án tuyệt vời");
  });

  it("handles normal comment without mention tag", () => {
    const res = parseCommentContent("👏 Dự án rất ấn tượng!");
    expect(res.replyToName).toBeNull();
    expect(res.text).toBe("👏 Dự án rất ấn tượng!");
  });

  it("groups comments into Facebook-style threads with parent and replies", () => {
    const mockComments: CommentItem[] = [
      {
        id: "1",
        authorName: "Nguyễn Văn B",
        authorId: "user-b",
        content: "👏 Dự án rất ấn tượng!",
        createdAt: "2026-09-28T10:00:00Z",
      },
      {
        id: "2",
        authorName: "Lê Thị C",
        authorId: "user-c",
        content: "💡 Ý tưởng rất sáng tạo",
        createdAt: "2026-09-28T10:05:00Z",
      },
      {
        id: "3",
        authorName: "Nguyễn Văn B",
        authorId: "user-b",
        content: "@[Nguyễn Văn B]: Cảm ơn bạn nhé",
        createdAt: "2026-09-28T10:10:00Z",
      },
    ];

    const threads = groupCommentsIntoThreads(mockComments);
    expect(threads).toHaveLength(2);

    // Thread 1: Root by Nguyễn Văn B, contains reply 3
    expect(threads[0].root.id).toBe("1");
    expect(threads[0].replies).toHaveLength(1);
    expect(threads[0].replies[0].id).toBe("3");

    // Thread 2: Root by Lê Thị C, no replies
    expect(threads[1].root.id).toBe("2");
    expect(threads[1].replies).toHaveLength(0);
  });
});

