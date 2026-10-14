"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { suggestSessionContent } from "@/lib/actions/sessions";

/** Popup gợi ý nội dung buổi học từ ghi chú thô — không lưu gì, chỉ để copy
 *  hoặc điền thẳng vào ô "Nội dung buổi học" chính (GV vẫn tự bấm Lưu). */
export function SessionContentSuggestDialog({
  sessionId,
  onApply,
}: {
  sessionId: string;
  onApply: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSuggest() {
    setError("");
    startTransition(async () => {
      const res = await suggestSessionContent({ sessionId, draftText: draft });
      if (res.error) setError(res.error);
      else setSuggestion(res.content ?? "");
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleUse() {
    onApply(suggestion);
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSuggestion("");
      setError("");
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          ✨ Gợi ý nội dung
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[92dvh] sm:h-[640px] max-h-[700px] w-[calc(100%-1.5rem)] sm:max-w-2xl lg:max-w-3xl flex flex-col p-4 sm:p-6 gap-3">
        <DialogHeader className="shrink-0 space-y-1">
          <DialogTitle className="text-base sm:text-lg">Gợi ý nội dung buổi học</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-xs text-muted-foreground pt-0.5">
              <p>AI tự động nhận diện môn học và nối tiếp tiến trình các buổi trước:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong>Nhập ghi chú:</strong> Gõ từ khóa, bài tập hoặc dán giáo trình — AI biên soạn thành các mục sư phạm rõ ràng.</li>
                <li><strong>Để trống:</strong> AI tự đề xuất nội dung bài học tiếp theo dựa trên mạch kiến thức các buổi trước.</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Khu vực nhập ghi chú cố định không làm nhảy khung */}
        <div className="shrink-0 space-y-2">
          <Textarea
            rows={3}
            className="h-24 sm:h-24 resize-none text-xs sm:text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`VD:\n- Kiến thức: Biến, vòng lặp, thiết kế widget trên Qt Designer...\n- Bài tập: Lập trình máy tính bỏ túi, xử lý va chạm game...\n- Hoặc dán giáo trình thô (để trống để AI tự đề xuất tiếp theo).`}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSuggest}
              disabled={pending}
              className="gap-1.5"
            >
              {pending ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span>AI đang biên soạn...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Tạo gợi ý</span>
                </>
              )}
            </Button>
            <span className="text-[11px] text-muted-foreground italic hidden sm:inline">
              * Không tự động lưu vào hệ thống
            </span>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Khung kết quả cố định chiếm toàn bộ không gian còn lại (flex-1 min-h-0), không bao giờ co giãn nhảy khung */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-dashed bg-muted/30 p-3 sm:p-4 overflow-hidden">
          {suggestion ? (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text font-sans">
                  {suggestion}
                </p>
              </div>
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground">
                  Bấm &quot;Dùng gợi ý này&quot; để điền vào ô chính rồi lưu
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? "✓ Đã copy" : "📋 Copy"}
                  </Button>
                  <Button type="button" size="sm" onClick={handleUse}>
                    ✅ Dùng gợi ý này
                  </Button>
                </div>
              </div>
            </>
          ) : pending ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs sm:text-sm text-muted-foreground animate-pulse">
                AI đang phân tích tiến trình các buổi trước và biên soạn nội dung sư phạm...
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted-foreground/70 space-y-1.5">
              <span className="text-2xl">✨</span>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Khung hiển thị gợi ý bài học
              </p>
              <p className="text-xs max-w-sm">
                Nhập ghi chú hoặc để trống, sau đó bấm nút <strong>&quot;Tạo gợi ý&quot;</strong> ở trên để AI biên soạn nội dung tại đây.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
