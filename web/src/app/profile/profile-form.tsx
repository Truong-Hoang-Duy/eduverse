"use client";

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
import { updateProfile } from "@/lib/actions/profile";
import type { ActionResult, Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    updateProfile,
    {}
  );

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Thông tin cá nhân</CardTitle>
        <CardDescription>
          Vai trò: {profile.role === "teacher" ? "Giáo viên" : "Học viên"}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tên tài khoản</Label>
            <Input value={profile.username ?? ""} disabled />
            <p className="text-xs text-muted-foreground">
              Tên tài khoản dùng để đăng nhập, không đổi được.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ và tên *</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name}
              required
            />
          </div>
          <FormMessage result={state} />
        </CardContent>
        <CardFooter className="mt-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
