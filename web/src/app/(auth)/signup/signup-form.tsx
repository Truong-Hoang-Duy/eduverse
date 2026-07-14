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
    <Card className="border-border/60 shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="text-xl">Đăng ký học viên</CardTitle>
        <CardDescription>Chọn đúng lớp giáo viên đã thông báo cho bạn</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ và tên *</Label>
            <Input id="full_name" name="full_name" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Tên tài khoản *</Label>
            <Input
              id="username"
              name="username"
              placeholder="VD: minh2014"
              autoComplete="username"
              required
            />
            <p className="text-xs text-muted-foreground">
              3-20 ký tự: chữ thường, số, dấu chấm hoặc gạch dưới. Dùng để đăng nhập.
            </p>
          </div>
          <div className="space-y-2">
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
