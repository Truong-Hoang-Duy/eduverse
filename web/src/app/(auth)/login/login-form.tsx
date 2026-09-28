"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

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
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo123");

  return (
    <Card className="border-border/60 shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="text-xl">Đăng nhập</CardTitle>
        <CardDescription>Nhập tên tài khoản và mật khẩu của bạn</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tài khoản Demo học viên (Lớp DEMO)</span>
              </div>
              <div className="text-muted-foreground">
                Tài khoản: <strong className="text-primary font-mono">demo</strong> &bull; Mật khẩu: <strong className="text-primary font-mono">demo123</strong>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
              onClick={() => {
                setUsername("demo");
                setPassword("demo123");
              }}
            >
              Điền nhanh
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Tên tài khoản</Label>
            <Input
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
