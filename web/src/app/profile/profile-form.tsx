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
            <Label htmlFor="full_name">Họ và tên *</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Tuổi</Label>
              <Input
                id="age"
                name="age"
                type="number"
                min={5}
                max={100}
                defaultValue={profile.age ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school">Trường</Label>
              <Input id="school" name="school" defaultValue={profile.school ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hobbies">Sở thích</Label>
            <Input
              id="hobbies"
              name="hobbies"
              defaultValue={profile.hobbies ?? ""}
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
