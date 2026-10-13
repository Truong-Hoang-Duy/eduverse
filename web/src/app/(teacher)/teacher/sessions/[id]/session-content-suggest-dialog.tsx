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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gợi ý nội dung buổi học</DialogTitle>
          <DialogDescription>
            Gõ ý muốn dạy (ngắn gọn hoặc mô tả chi tiết bài học/bài tập) — AI biên soạn lại thành các
            mục bài học sư phạm sinh động, có tham khảo 5 buổi gần nhất để nối đúng tiến trình. Để
            trống ô này thì AI tự dựa hoàn toàn vào các buổi trước để đề xuất nội dung tiếp theo.
            Không lưu gì cả — bạn tự copy hoặc dùng rồi bấm &quot;Lưu nội dung&quot; ở form chính.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            rows={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="VD: Nhập tự do ngắn hoặc dài (kiến thức cần dạy, bài tập/dự án thực hành, thử thách mở rộng, hoặc dán giáo trình) — AI sẽ biên soạn thành các gạch đầu dòng bài học sư phạm chuẩn mực. Để trống thì AI tự đề xuất tiếp theo."
          />
          <Button type="button" size="sm" onClick={handleSuggest} disabled={pending}>
            {pending ? "AI đang viết..." : "✨ Tạo gợi ý"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}

          {suggestion && (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <p className="text-sm whitespace-pre-wrap">{suggestion}</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? "✓ Đã copy" : "📋 Copy"}
                </Button>
                <Button type="button" size="sm" onClick={handleUse}>
                  ✅ Dùng gợi ý này
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
