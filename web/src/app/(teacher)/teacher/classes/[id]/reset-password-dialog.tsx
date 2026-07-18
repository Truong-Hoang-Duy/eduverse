"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetStudentPassword } from "@/lib/actions/password";
import type { ActionResult } from "@/lib/types";

/** Mật khẩu ngẫu nhiên 8 ký tự chữ thường + số — dễ đọc cho phụ huynh/học viên. */
function randomPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    crypto.getRandomValues(new Uint32Array(8)),
    (n) => chars[n % chars.length]
  ).join("");
}

/** GV đặt mật khẩu mới cho học viên quên mật khẩu (auth username không có
 *  email khôi phục). Mật khẩu hiện dạng text để GV copy gửi lại cho em. */
export function ResetPasswordDialog({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    resetStudentPassword,
    {}
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setPassword(randomPassword());
      setCopied(false);
    }
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          🔑 Mật khẩu
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đặt mật khẩu mới cho {studentName}</DialogTitle>
          <DialogDescription>
            Dùng khi em quên mật khẩu — không cần mật khẩu cũ. Đặt xong nhớ
            Copy gửi cho em (hệ thống không lưu lại để xem sau).
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="student_id" value={studentId} />
          <input type="hidden" name="confirm" value={password} />
          <div className="space-y-1.5">
            <Label htmlFor={`reset-pw-${studentId}`}>Mật khẩu mới</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`reset-pw-${studentId}`}
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setCopied(false);
                }}
                minLength={6}
                required
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPassword(randomPassword());
                  setCopied(false);
                }}
              >
                🎲
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                {copied ? "✓ Đã copy" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Đang đặt..." : "Đặt mật khẩu"}
            </Button>
            <FormMessage result={state} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
