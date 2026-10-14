"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CornerDownRight, MessageSquareText, Send, Sparkles, X } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { EducationalToast, useEducationalToast } from "@/components/ui/educational-toast";
import { Input } from "@/components/ui/input";
import { addComment, deleteComment } from "@/lib/actions/projects";
import {
  EDUCATIONAL_MODERATION_WARNING,
  checkEducationalContent,
} from "@/lib/content-moderation";
import { PROJECT_COMMENT_MAX } from "@/lib/project-limits";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/types";

export type { CommentItem, CommentThread } from "@/lib/project-comments";
import {
  type CommentItem,
  formatCommentTime,
  getAvatarGradient,
  groupCommentsIntoThreads,
  parseCommentContent,
  QUICK_PRAISES,
} from "@/lib/project-comments";

export function CommentSection({
  projectId,
  classId,
  comments: initialComments,
  currentUserId,
  placeholder = "Viết lời khen ngợi, góp ý cho bạn...",
  headerAction,
}: {
  projectId: string;
  classId?: string;
  comments: CommentItem[];
  currentUserId: string;
  placeholder?: string;
  headerAction?: React.ReactNode;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<ActionResult>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { toastMessage, showToast, hideToast } = useEducationalToast();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const threads = useMemo(() => groupCommentsIntoThreads(comments), [comments]);

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

  // Chọn nhanh mẫu khen ngợi
  const handleSelectQuickPraise = (text: string) => {
    if (inputRef.current) {
      inputRef.current.value = text;
      inputRef.current.focus();
    }
  };

  // Kích hoạt trả lời một bạn học
  const handleStartReply = (authorName: string) => {
    setReplyTo(authorName);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Gửi nhận xét với Optimistic UI (hiện ngay trong 0ms)
  const handleSubmit = async (fd: FormData) => {
    const rawContent = String(fd.get("content") ?? "").trim();
    if (!rawContent) return;

    // Tự động gắn tiền tố reply nếu đang trả lời bình luận
    const content =
      replyTo && !rawContent.startsWith(`@[${replyTo}]:`)
        ? `@[${replyTo}]: ${rawContent}`
        : rawContent;

    if (content.length > PROJECT_COMMENT_MAX) {
      setState({ error: `Nhận xét tối đa ${PROJECT_COMMENT_MAX} ký tự.` });
      return;
    }

    // Kiểm tra ngôn từ chuẩn mực sư phạm (< 0.1ms)
    const check = checkEducationalContent(rawContent);
    if (!check.isAppropriate) {
      showToast(check.message ?? EDUCATIONAL_MODERATION_WARNING);
      inputRef.current?.focus();
      return;
    }

    fd.set("content", content);
    const activeReply = replyTo;
    setReplyTo(null);

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
        setReplyTo(activeReply);
        setState(res);
      } else {
        setState(res);
        router.refresh();
        await fetchLatestComments();
      }
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setReplyTo(activeReply);
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
      {/* Thông báo nổi chuẩn mực sư phạm (Educational Toast) */}
      <EducationalToast message={toastMessage} onClose={hideToast} />

      {/* 1. HEADER NHẬN XÉT CỐ ĐỊNH SANG TRỌNG - THOÁNG ĐÃNG, KHÔNG SÁT MÉP */}
      <div className="shrink-0 px-6 py-4 flex items-center justify-between border-b border-border/60 bg-muted/20 backdrop-blur-xs gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                Nhận xét & Góp ý
              </h3>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow-2xs">
                {comments.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate hidden sm:block pt-0.5">
              Cùng trao đổi và động viên nhau học tập
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {headerAction}
        </div>
      </div>

      {/* 2. VÙNG CUỘN: CHỈ CHỨA DANH SÁCH NHẬN XÉT */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 scrollbar-slim">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-xs">
              <MessageSquareText className="size-7" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Chưa có nhận xét nào</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
              Hãy là người đầu tiên gửi lời khen ngợi, động viên hoặc góp ý tích cực cho dự án của bạn nhé! ✨
            </p>

            {/* Quick Suggestion Chips */}
            <div className="mt-5 w-full max-w-sm space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Gợi ý nhận xét nhanh:
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {QUICK_PRAISES.map((praise) => (
                  <button
                    key={praise}
                    type="button"
                    onClick={() => handleSelectQuickPraise(praise)}
                    className="rounded-full border border-border/80 bg-card px-3 py-1.5 text-xs text-foreground/90 shadow-2xs transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95 cursor-pointer text-left"
                  >
                    {praise}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            {threads.map((thread) => {
              const root = thread.root;
              const isRootMine = root.authorId === currentUserId;
              const { replyToName: rootReplyToName, text: rootText } = parseCommentContent(root.content);

              return (
                <div key={root.id} className="space-y-2">
                  {/* Bình luận gốc (Root Comment) dạng bubble giống Facebook */}
                  <div className="flex items-start gap-2.5 group">
                    {/* Avatar cá nhân hóa theo tên */}
                    <div
                      className={`size-8.5 shrink-0 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs bg-gradient-to-br ${getAvatarGradient(
                        root.authorName
                      )}`}
                    >
                      {root.authorName.trim().charAt(0).toUpperCase() || "?"}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Bong bóng bình luận Facebook */}
                      <div className="inline-block max-w-[95%] sm:max-w-[90%] rounded-2xl rounded-tl-xs bg-muted/60 dark:bg-muted/40 hover:bg-muted/80 dark:hover:bg-muted/50 px-3.5 py-2 transition-colors border border-border/40 shadow-2xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm text-foreground hover:underline cursor-pointer">
                            {root.authorName}
                          </span>
                          {isRootMine && (
                            <span className="rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                              bạn
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs sm:text-sm text-foreground/95 whitespace-pre-wrap break-words leading-relaxed">
                          {rootReplyToName && (
                            <button
                              type="button"
                              onClick={() => handleStartReply(rootReplyToName)}
                              className="font-semibold text-primary hover:underline cursor-pointer mr-1 inline"
                            >
                              @{rootReplyToName}
                            </button>
                          )}
                          {rootText}
                        </p>
                      </div>

                      {/* Hàng nút hành động dưới bong bóng: Thời gian · Trả lời · Xóa */}
                      <div className="flex items-center gap-3 pl-3 pt-1 text-[11px] text-muted-foreground select-none">
                        <span className="text-muted-foreground/80">
                          {formatCommentTime(root.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartReply(root.authorName)}
                          className="font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer transition-colors"
                        >
                          Trả lời
                        </button>
                        {isRootMine && (
                          <ConfirmDialog
                            trigger={
                              <button
                                type="button"
                                className="font-semibold text-muted-foreground/70 hover:text-destructive hover:underline cursor-pointer transition-colors"
                              >
                                Xóa
                              </button>
                            }
                            title="Xóa nhận xét của bạn?"
                            description="Nhận xét này sẽ bị xóa vĩnh viễn khỏi sản phẩm."
                            action={handleDeleteComment}
                            fields={{ id: root.id, class_id: classId ?? "" }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Danh sách các câu trả lời trực thuộc (Threaded replies giống Facebook) */}
                  {thread.replies.length > 0 && (
                    <div className="relative ml-4 sm:ml-4.5 pl-6 sm:pl-7 space-y-2.5 pt-1 before:absolute before:left-0 before:top-0 before:bottom-3.5 before:w-0.5 before:bg-border/60">
                      {thread.replies.map((reply) => {
                        const isReplyMine = reply.authorId === currentUserId;
                        const { replyToName: targetName, text: replyText } = parseCommentContent(reply.content);

                        return (
                          <div key={reply.id} className="relative flex items-start gap-2 group">
                            {/* Đường cong nối nhánh (L-branch connector) */}
                            <div className="absolute -left-6 sm:-left-7 top-3 w-4 sm:w-5 h-3.5 border-b-2 border-l-2 border-border/70 rounded-bl-xl pointer-events-none" />

                            {/* Avatar nhỏ hơn cho câu trả lời */}
                            <div
                              className={`size-6.5 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] shadow-2xs bg-gradient-to-br ${getAvatarGradient(
                                reply.authorName
                              )}`}
                            >
                              {reply.authorName.trim().charAt(0).toUpperCase() || "?"}
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Bong bóng reply */}
                              <div className="inline-block max-w-[95%] sm:max-w-[90%] rounded-2xl rounded-tl-xs bg-muted/60 dark:bg-muted/40 hover:bg-muted/80 dark:hover:bg-muted/50 px-3 py-1.5 transition-colors border border-border/40 shadow-2xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-xs text-foreground hover:underline cursor-pointer">
                                    {reply.authorName}
                                  </span>
                                  {isReplyMine && (
                                    <span className="rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                                      bạn
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs sm:text-[13px] text-foreground/95 whitespace-pre-wrap break-words leading-relaxed">
                                  {targetName && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartReply(targetName)}
                                      className="font-semibold text-primary hover:underline cursor-pointer mr-1 inline"
                                    >
                                      @{targetName}
                                    </button>
                                  )}
                                  {replyText}
                                </p>
                              </div>

                              {/* Hàng nút hành động dưới bong bóng reply */}
                              <div className="flex items-center gap-3 pl-2.5 pt-0.5 text-[10.5px] text-muted-foreground select-none">
                                <span className="text-muted-foreground/80">
                                  {formatCommentTime(reply.createdAt)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartReply(reply.authorName)}
                                  className="font-semibold text-muted-foreground hover:text-foreground hover:underline cursor-pointer transition-colors"
                                >
                                  Trả lời
                                </button>
                                {isReplyMine && (
                                  <ConfirmDialog
                                    trigger={
                                      <button
                                        type="button"
                                        className="font-semibold text-muted-foreground/70 hover:text-destructive hover:underline cursor-pointer transition-colors"
                                      >
                                        Xóa
                                      </button>
                                    }
                                    title="Xóa câu trả lời của bạn?"
                                    description="Câu trả lời này sẽ bị xóa vĩnh viễn khỏi sản phẩm."
                                    action={handleDeleteComment}
                                    fields={{ id: reply.id, class_id: classId ?? "" }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. KHỐI ĐÁY: CỐ ĐỊNH Ô NHẬP NHẬN XÉT DẠNG CHAT HIỆN ĐẠI CÓ HỖ TRỢ REPLY */}
      <div className="shrink-0 border-t border-border/60 bg-card/95 p-3 sm:px-5 sm:py-3.5 backdrop-blur-md space-y-2">
        {/* Thanh thông báo đang trả lời ai */}
        {replyTo && (
          <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs text-primary animate-in fade-in">
            <div className="flex items-center gap-1.5 truncate">
              <CornerDownRight className="size-3.5 shrink-0" />
              <span>
                Đang trả lời <strong className="font-semibold">@{replyTo}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="shrink-0 p-0.5 hover:bg-primary/20 rounded-md transition-colors cursor-pointer"
              title="Hủy trả lời"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <form
          ref={formRef}
          action={handleSubmit}
          className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background/90 p-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
        >
          <input type="hidden" name="project_id" value={projectId} />
          {classId && <input type="hidden" name="class_id" value={classId} />}
          <Input
            ref={inputRef}
            name="content"
            placeholder={
              replyTo ? `Viết câu trả lời cho @${replyTo}...` : placeholder
            }
            maxLength={PROJECT_COMMENT_MAX}
            disabled={isSubmitting}
            onChange={() => {
              if (state.error) setState({});
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = e.currentTarget.value.trim();
                if (val) {
                  const check = checkEducationalContent(val);
                  if (!check.isAppropriate) {
                    e.preventDefault();
                    showToast(check.message ?? EDUCATIONAL_MODERATION_WARNING);
                  }
                }
              }
            }}
            className="h-9.5 flex-1 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/70"
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            size="sm"
            className="h-9.5 shrink-0 px-4 rounded-xl font-semibold gap-1.5 shadow-xs cursor-pointer"
          >
            <Send className="size-3.5" />
            <span>{isSubmitting ? "Đang gửi..." : "Gửi"}</span>
          </Button>
        </form>
        <FormMessage result={state} />
      </div>
    </div>
  );
}


