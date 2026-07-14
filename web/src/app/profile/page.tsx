import { AppNav } from "@/components/app-nav";
import { requireProfile } from "@/lib/get-profile";

import { ProfileForm } from "./profile-form";

export const metadata = { title: "Hồ sơ — Eduverse" };

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav profile={profile} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Hồ sơ</h1>
          <p className="text-sm text-muted-foreground">
            Thông tin tài khoản của bạn
          </p>
        </div>
        <ProfileForm profile={profile} />
      </main>
    </div>
  );
}
