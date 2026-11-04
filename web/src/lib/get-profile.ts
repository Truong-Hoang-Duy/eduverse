import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Đọc profile của user đang đăng nhập, null nếu chưa.
 *
 * Bọc cache() để layout và page trong CÙNG một request chỉ tốn 1 query profiles.
 * Nếu middleware đã xác thực `auth.getUser()` và gắn header `x-eduverse-user-id`,
 * tái sử dụng ngay `userId` đó để tiết kiệm 1 vòng gọi mạng sang Supabase Auth.
 */
const getProfile = cache(async (): Promise<Profile | null> => {
  const [supabase, reqHeaders] = await Promise.all([
    createClient(),
    headers(),
  ]);

  let userId = reqHeaders.get("x-eduverse-user-id");
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return (profile as Profile | null) ?? null;
});

/**
 * Lấy profile của user đang đăng nhập; chưa đăng nhập → về /login.
 *
 * redirect() phải nằm NGOÀI cache(): nó hoạt động bằng cách throw NEXT_REDIRECT,
 * mà cache() ghi nhớ cả promise bị reject rồi ném lại đúng object cũ — để cache
 * giữ error nội bộ của framework là vùng hành vi không được bảo đảm.
 */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

/** Guard cho route theo vai trò — sai vai trò thì đưa về dashboard đúng. */
export async function requireRole(role: Profile["role"]): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== role) {
    redirect(profile.role === "teacher" ? "/teacher" : "/student");
  }
  return profile;
}
