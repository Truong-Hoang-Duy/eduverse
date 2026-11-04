import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/get-profile";

export default async function Home() {
  const profile = await requireProfile();

  redirect(profile.role === "teacher" ? "/teacher" : "/student");
}
