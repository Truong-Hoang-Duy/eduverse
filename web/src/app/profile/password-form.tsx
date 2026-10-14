"use client";

import { useActionState, useRef } from "react";
import { Lock } from "lucide-react";

import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
    <Card className="flex h-full flex-col shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4 text-primary" />
          <span>Đổi mật khẩu</span>
        </CardTitle>
        <CardDescription>
          Chỉ cần nhập mật khẩu mới — không cần mật khẩu cũ.
        </CardDescription>
      </CardHeader>
      <form
        ref={formRef}
        action={async (fd) => {
          await formAction(fd);
          formRef.current?.reset();
        }}
        className="flex flex-1 flex-col justify-between"
      >
        <CardContent className="space-y-4 pb-6">
          <div className="space-y-2">
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
            <p className="text-xs text-muted-foreground">
              Mật khẩu cần tối thiểu 6 ký tự để bảo mật tài khoản.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Nhập lại mật khẩu mới</Label>
            <Input
              id="confirm-password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>
        </CardContent>
        <CardFooter className="mt-auto flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Đang đổi..." : "Đổi mật khẩu"}
          </Button>
          <FormMessage result={state} />
        </CardFooter>
      </form>
    </Card>
  );
}
