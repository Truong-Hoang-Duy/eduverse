import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/get-profile";

import { ProfileForm } from "./profile-form";

export const metadata = { title: "Hồ sơ — Eduverse" };

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <PageHeader title="Hồ sơ" description="Thông tin tài khoản của bạn" />
        <ProfileForm profile={profile} />
      </div>
    </AppShell>
  );
}
