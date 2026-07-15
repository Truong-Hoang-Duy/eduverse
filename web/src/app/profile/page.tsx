import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { getMyApiKeyMasked } from "@/lib/actions/api-key";
import { requireProfile } from "@/lib/get-profile";

import { ApiKeyForm } from "./api-key-form";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Hồ sơ — Eduverse" };

export default async function ProfilePage() {
  const profile = await requireProfile();
  const maskedKey = await getMyApiKeyMasked();

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <PageHeader title="Hồ sơ" description="Thông tin tài khoản của bạn" />
        <ProfileForm profile={profile} />
        <ApiKeyForm maskedKey={maskedKey} />
      </div>
    </AppShell>
  );
}
