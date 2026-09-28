"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addComment, deleteComment } from "@/lib/actions/projects";
import { PROJECT_COMMENT_MAX } from "@/lib/project-limits";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/types";

export interface CommentItem {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: string;
}

export function CommentSection({
  projectId,
  classId,
  comments: initialComments,
  currentUserId,
  placeholder = "Viết nhận xét cho bạn...",
}: {
  projectId: string;
  classId?: string;
  comments: CommentItem[];
  currentUserId: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<ActionResult>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Đồng bộ khi props từ Server Component thay đổi
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  // Tải danh sách nhận xét mới nhất từ Supabase
  const fetchLatestComments = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_comments")
        .select(
          "id, project_id, content, author_id, created_at, profiles!project_comments_author_id_fkey(full_name)"
        )
        .eq("project_id", projectId)
        .order("created_at");

      if (!error && data) {
        const mapped: CommentItem[] = (
          data as unknown as {
            id: string;
            project_id: string;
            content: string;
            author_id: string;
            created_at: string;
            profiles: { full_name: string } | null;
          }[]
        ).map((c) => ({
          id: c.id,
          content: c.content,
          authorName: c.profiles?.full_name ?? "Học viên",
          authorId: c.author_id,
          createdAt: c.created_at,
        }));
        setComments(mapped);
      }
    } catch {
      // Bỏ qua lỗi kết nối ngầm
    }
  }, [projectId]);

  // Kết nối Supabase Realtime + Polling dự phòng (4s) để cả lớp nhận bình luận của nhau tức thì
  useEffect(() => {
    const supabase = createClient();
    const channelName = `realtime_project_comments_${projectId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_comments",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchLatestComments();
        }
      )
      .subscribe();

    // Fallback polling mỗi 4s trong trường hợp mạng local hoặc firewall chặn WebSocket
    const interval = setInterval(() => {
      fetchLatestComments();
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [projectId, fetchLatestComments]);

  // Gửi nhận xét với Optimistic UI (hiện ngay trong 0ms)
  const handleSubmit = async (fd: FormData) => {
    const content = String(fd.get("content") ?? "").trim();
    if (!content) return;

    if (content.length > PROJECT_COMMENT_MAX) {
      setState({ error: `Nhận xét tối đa ${PROJECT_COMMENT_MAX} ký tự.` });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: CommentItem = {
      id: tempId,
      content,
      authorName: "Bạn",
      authorId: currentUserId,
      createdAt: new Date().toISOString(),
    };

    // Hiện ngay lập tức cho người gửi
    setComments((prev) => [...prev, optimisticComment]);
    formRef.current?.reset();
    setIsSubmitting(true);
    setState({});

    try {
      const res = await addComment({}, fd);
      if (res.error) {
        // Rollback nếu server báo lỗi
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setState(res);
      } else {
        setState(res);
        router.refresh();
        await fetchLatestComments();
      }
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setState({ error: "Không gửi được nhận xét. Vui lòng thử lại." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa nhận xét với Optimistic UI (biến mất ngay trong 0ms)
  const handleDeleteComment = async (fd: FormData) => {
    const id = String(fd.get("id") ?? "");
    if (!id) return;

    const previousComments = [...comments];
    setComments((prev) => prev.filter((c) => c.id !== id));

    try {
      await deleteComment(fd);
      router.refresh();
      await fetchLatestComments();
    } catch {
      setComments(previousComments);
      setState({ error: "Không xóa được nhận xét. Vui lòng thử lại." });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        💬 Nhận xét ({comments.length})
      </p>

      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((c) => {
            const mine = c.authorId === currentUserId;
            return (
              <li
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium">{c.authorName}</span>
                  {mine && (
                    <span className="ml-1 text-xs text-muted-foreground">(bạn)</span>
                  )}{" "}
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                  <p className="break-words text-muted-foreground">{c.content}</p>
                </div>
                {/* Chỉ chủ nhận xét xóa được (RLS project_comments_delete_own). */}
                {mine && (
                  <ConfirmDialog
                    trigger={
                      <button
                        type="button"
                        aria-label="Xóa nhận xét"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      >
                        ✕
                      </button>
                    }
                    title="Xóa nhận xét của bạn?"
                    description="Nhận xét này sẽ bị xóa vĩnh viễn khỏi sản phẩm."
                    action={handleDeleteComment}
                    fields={{ id: c.id, class_id: classId ?? "" }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        ref={formRef}
        action={handleSubmit}
        className="flex gap-2"
      >
        <input type="hidden" name="project_id" value={projectId} />
        {classId && <input type="hidden" name="class_id" value={classId} />}
        <Input
          name="content"
          placeholder={placeholder}
          maxLength={PROJECT_COMMENT_MAX}
          disabled={isSubmitting}
          className="h-9 text-base sm:text-sm"
        />
        <Button type="submit" disabled={isSubmitting} className="h-9 shrink-0">
          {isSubmitting ? "Đang gửi..." : "Gửi"}
        </Button>
      </form>
      <FormMessage result={state} />
    </div>
  );
}
