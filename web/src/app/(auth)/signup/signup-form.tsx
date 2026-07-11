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
import { signupStudent } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/types";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    signupStudent,
    {}
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Đăng ký học viên</CardTitle>
        <CardDescription>
          Nhập mã lớp giáo viên đã gửi cho bạn (VD: JSB01)
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ và tên *</Label>
            <Input id="full_name" name="full_name" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class_code">Mã lớp *</Label>
              <Input
                id="class_code"
                name="class_code"
                placeholder="JSB01"
                className="uppercase"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Tuổi</Label>
              <Input id="age" name="age" type="number" min={5} max={100} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="school">Trường</Label>
            <Input id="school" name="school" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hobbies">Sở thích</Label>
            <Input id="hobbies" name="hobbies" placeholder="Game, vẽ, đá bóng..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu * (ít nhất 6 ký tự)</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <FormMessage result={state} />
        </CardContent>
        <CardFooter className="mt-4 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Đang đăng ký..." : "Đăng ký"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary underline">
              Đăng nhập
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
