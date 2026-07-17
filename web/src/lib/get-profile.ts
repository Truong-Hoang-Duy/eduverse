import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Đọc profile của user đang đăng nhập, null nếu chưa.
 *
 * Bọc cache() để layout và page trong CÙNG một request chỉ tốn 1 lượt
 * auth.getUser() + 1 query profiles (trước đây mỗi bên tự gọi = gấp đôi
 * roundtrip mỗi lần tải trang).
 *
 * cache() có phạm vi MỘT request, bị xóa khi request kết thúc — không phải
 * unstable_cache, không ghi đĩa, không sống qua request → không có chuyện
 * profile của người này rò sang người khác.
 */
const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
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
