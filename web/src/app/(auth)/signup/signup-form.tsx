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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signupStudent } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/types";

export interface ClassChoice {
  class_code: string;
  course_name: string;
}

export function SignupForm({ classes }: { classes: ClassChoice[] }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    signupStudent,
    {}
  );

  return (
    <Card className="gap-4 border-border/60 py-5 shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="text-lg">Đăng ký học viên</CardTitle>
        <CardDescription>
          Chọn đúng lớp giáo viên đã thông báo cho bạn
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Họ và tên *</Label>
              <Input id="full_name" name="full_name" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Tên tài khoản *</Label>
              <Input
                id="username"
                name="username"
                placeholder="VD: minh2014"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tên tài khoản dùng để đăng nhập: 3-20 ký tự gồm chữ thường, số, dấu
            chấm hoặc gạch dưới.
          </p>
          <div className="space-y-1.5">
            <Label>Lớp của bạn *</Label>
            <Select name="class_code" required>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    classes.length > 0 ? "Chọn lớp" : "Chưa có lớp nào được mở"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.class_code} value={cls.class_code}>
                    {cls.class_code} — {cls.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="password">Mật khẩu *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password_confirm">Nhập lại mật khẩu *</Label>
              <Input
                id="password_confirm"
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>
          </div>
          <FormMessage result={state} />
        </CardContent>
        <CardFooter className="mt-3 flex flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            disabled={pending || classes.length === 0}
          >
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
