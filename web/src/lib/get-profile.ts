import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Lấy profile của user đang đăng nhập; chưa đăng nhập → về /login. */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) {
    redirect("/login");
  }
  return profile as Profile;
}

/** Guard cho route theo vai trò — sai vai trò thì đưa về dashboard đúng. */
export async function requireRole(role: Profile["role"]): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== role) {
    redirect(profile.role === "teacher" ? "/teacher" : "/student");
  }
  return profile;
}
