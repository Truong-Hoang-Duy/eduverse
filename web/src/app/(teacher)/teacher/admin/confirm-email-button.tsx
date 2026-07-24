"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { confirmUserEmail } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/types";

/** Mở khóa một tài khoản kẹt ở trạng thái chưa xác nhận email. Không phải hành
 *  động xóa nên không cần popup xác nhận — bấm nhầm thì chỉ mất công bấm lại. */
export function ConfirmEmailButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    confirmUserEmail,
    {}
  );

  if (state.success) {
    return <span className="text-xs text-green-600 dark:text-green-400">Đã xác nhận</span>;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Đang xử lý…" : "Xác nhận"}
      </Button>
      {state.error ? (
        <span className="text-xs text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}
