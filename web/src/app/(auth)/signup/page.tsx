import { createClient } from "@/lib/supabase/server";

import { SignupForm, type ClassChoice } from "./signup-form";

export const metadata = { title: "Đăng ký học viên — Eduverse" };

// Danh sách lớp đổi khi GV mở lớp mới → không cache tĩnh.
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_available_classes");
  const classes = (data ?? []) as ClassChoice[];

  return <SignupForm classes={classes} />;
}
