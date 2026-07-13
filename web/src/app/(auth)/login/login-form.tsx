"use client";

import Link from "next/link";
import { useActionState } from "react";

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
import { login } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/types";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    login,
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Eduverse</CardTitle>
        <CardDescription>Đăng nhập vào lớp học của bạn</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Tên tài khoản</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <FormMessage result={state} />
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link href="/signup" className="text-primary underline">
              Đăng ký học viên
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
