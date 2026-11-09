"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setSessionSubstitute } from "@/lib/actions/sessions";

export function SubstituteToggle({
  sessionId,
  sessionNumber,
  isSubstitute,
}: {
  sessionId: string;
  sessionNumber: number;
  isSubstitute: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggle = (targetSubstitute: boolean) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await setSessionSubstitute({
        sessionId,
        isSubstitute: targetSubstitute,
      });
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setDialogOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      {isSubstitute ? (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-950 sm:flex-row sm:items-center sm:justify-between dark:text-emerald-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl">🧑‍🏫</span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                Buổi học này có thầy (cô) khác dạy thay
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-600/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                ✓ Đã hoàn thành
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Buổi học được tính là hoàn thành do người dạy thay phụ trách. Dữ liệu buổi này không đưa vào chống lặp AI, copy nhận xét hay tổng hợp học bạ.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={isPending}
            className="shrink-0 border-emerald-600/30 text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-300"
          >
            <span>↩️</span>
            <span>Hủy dạy thay (Tự nhận xét)</span>
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={isPending}
            className="gap-1.5 border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-foreground"
          >
            <span>🧑‍🏫</span>
            <span>Tôi nghỉ dạy (Nhờ người dạy thay)</span>
          </Button>
        </div>
      )}

      {/* Dialog xác nhận */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isSubstitute
                ? `Hủy trạng thái người dạy thay (Buổi ${sessionNumber})?`
                : `Xác nhận có người dạy thay Buổi ${sessionNumber}?`}
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-left">
              {isSubstitute ? (
                <span>
                  Buổi học sẽ trở lại trạng thái bình thường để bạn có thể tự nhập nhận xét cho từng học viên.
                </span>
              ) : (
                <span className="block space-y-1.5">
                  <span className="block">
                    Bạn xác nhận hôm đó đã nghỉ dạy và có thầy (cô) khác dạy thay:
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    • Buổi học sẽ được đánh dấu <strong>ĐÃ HOÀN THÀNH</strong> trong tiến độ lớp.<br />
                    • Dữ liệu buổi này sẽ <strong>KHÔNG</strong> đưa vào gợi ý nhận xét AI, chống lặp văn phong hay tổng kết toàn khóa.<br />
                    • Bạn có thể bấm hủy trạng thái này bất kỳ lúc nào nếu muốn tự nhận xét.
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <p className="text-xs font-medium text-destructive">{errorMessage}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant={isSubstitute ? "secondary" : "default"}
              onClick={() => handleToggle(!isSubstitute)}
              disabled={isPending}
            >
              {isPending
                ? "Đang lưu..."
                : isSubstitute
                ? "Xác nhận chuyển sang tự nhận xét"
                : "Xác nhận có người dạy thay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
