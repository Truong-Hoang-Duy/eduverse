"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  listSessionContentReferences,
  type SessionContentReference,
} from "@/lib/actions/sessions";

/** Một buổi trong popup: nội dung + nút copy / dùng lại. */
function ReferenceItem({
  item,
  onUse,
}: {
  item: SessionContentReference;
  onUse: (content: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          Buổi {item.sessionNumber}
          {item.title ? `: ${item.title}` : ""}
        </span>
        {item.classCode && (
          <Badge variant="secondary" className="rounded-md text-xs font-normal">
            {item.classCode}
          </Badge>
        )}
        {item.sessionDate && (
          <span className="text-xs text-muted-foreground">
            {new Date(item.sessionDate).toLocaleDateString("vi-VN")}
          </span>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
        {item.content}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "✓ Đã copy" : "📋 Copy"}
        </Button>
        <Button type="button" size="sm" onClick={() => onUse(item.content)}>
          ✅ Dùng nội dung này
        </Button>
      </div>
    </li>
  );
}

/**
 * Popup XEM nội dung các buổi khác để tham khảo khi soạn buổi hiện tại — buổi
 * trước của chính lớp này, và cùng buổi số ở lớp song song cùng khóa (yêu cầu
 * user 2026-08-06).
 *
 * Chỉ ĐỌC: "Dùng nội dung này" chỉ điền vào ô nội dung chính, GV vẫn phải tự
 * bấm "Lưu nội dung" — giống `SessionContentSuggestDialog`.
 *
 * Nạp dữ liệu lúc MỞ chứ không đổ sẵn từ server component: popup này ít dùng
 * hơn phần nhận xét, đổ sẵn là tốn query mỗi lần vào trang buổi học.
 */
export function SessionContentReferenceDialog({
  sessionId,
  onApply,
}: {
  sessionId: string;
  onApply: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [priorInClass, setPriorInClass] = useState<SessionContentReference[]>([]);
  const [otherClasses, setOtherClasses] = useState<SessionContentReference[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    // Nạp lại mỗi lần mở — GV có thể vừa sửa nội dung buổi khác ở tab kia.
    setError("");
    setLoaded(false);
    startTransition(async () => {
      const res = await listSessionContentReferences({ sessionId });
      if (res.error) setError(res.error);
      else {
        setPriorInClass(res.priorInClass);
        setOtherClasses(res.otherClasses);
      }
      setLoaded(true);
    });
  }

  function handleUse(content: string) {
    onApply(content);
    setOpen(false);
  }

  const isEmpty =
    loaded && priorInClass.length === 0 && otherClasses.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          📚 Xem buổi khác
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nội dung các buổi khác</DialogTitle>
          <DialogDescription>
            Tham khảo buổi trước của lớp này và cùng buổi số ở lớp song song
            trong khóa. Không lưu gì — bấm &quot;Dùng nội dung này&quot; chỉ
            điền vào ô chính, bạn vẫn tự bấm &quot;Lưu nội dung&quot;.
          </DialogDescription>
        </DialogHeader>

        {pending && (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {isEmpty && (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Chưa có buổi nào đã điền nội dung để tham khảo.
          </p>
        )}

        {otherClasses.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              🏫 Cùng buổi này ở lớp khác trong khóa
            </p>
            <ul className="space-y-2">
              {otherClasses.map((item) => (
                <ReferenceItem key={item.id} item={item} onUse={handleUse} />
              ))}
            </ul>
          </div>
        )}

        {priorInClass.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">📅 Buổi trước của lớp này</p>
            <ul className="space-y-2">
              {priorInClass.map((item) => (
                <ReferenceItem key={item.id} item={item} onUse={handleUse} />
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
