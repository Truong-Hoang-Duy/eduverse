"use client";

import { useActionState, useRef } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeMyPassword } from "@/lib/actions/password";
import type { ActionResult } from "@/lib/types";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    changeMyPassword,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">🔒 Đổi mật khẩu</CardTitle>
        <CardDescription>
          Chỉ cần nhập mật khẩu mới — không cần mật khẩu cũ.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={async (fd) => {
            await formAction(fd);
            formRef.current?.reset();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Mật khẩu mới</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              placeholder="Ít nhất 6 ký tự"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Nhập lại mật khẩu mới</Label>
            <Input
              id="confirm-password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Đang đổi..." : "Đổi mật khẩu"}
            </Button>
            <FormMessage result={state} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
