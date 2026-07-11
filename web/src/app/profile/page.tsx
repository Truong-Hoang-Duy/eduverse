import { AppNav } from "@/components/app-nav";
import { requireProfile } from "@/lib/get-profile";

import { ProfileForm } from "./profile-form";

export const metadata = { title: "Hồ sơ — Eduverse" };

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav profile={profile} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <ProfileForm profile={profile} />
      </main>
    </div>
  );
}
