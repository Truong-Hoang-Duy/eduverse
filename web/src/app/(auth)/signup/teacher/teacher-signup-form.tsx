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
import { signupTeacher } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/types";

export function TeacherSignupForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    signupTeacher,
    {}
  );

  return (
    <Card className="border-border/60 shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="text-xl">Đăng ký giáo viên</CardTitle>
        <CardDescription>Cần mã mời để tạo tài khoản giáo viên</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite_code">Mã mời *</Label>
            <Input id="invite_code" name="invite_code" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ và tên *</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Tên tài khoản *</Label>
            <Input
              id="username"
              name="username"
              placeholder="VD: thayduy"
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu * (ít nhất 6 ký tự)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirm">Nhập lại mật khẩu *</Label>
            <Input
              id="password_confirm"
              name="password_confirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <FormMessage result={state} />
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Đang đăng ký..." : "Đăng ký"}
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-primary underline">
              Quay lại đăng nhập
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
