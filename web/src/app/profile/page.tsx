import { PageHeader } from "@/components/page-header";
import { getMyApiKeyMasked } from "@/lib/actions/api-key";
import { requireProfile } from "@/lib/get-profile";

import { ApiKeyForm } from "./api-key-form";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Hồ sơ — Eduverse" };

export default async function ProfilePage() {
  // Layout cũng gọi requireProfile; cache() trong get-profile.ts gộp lại thành
  // một lượt getUser + một query cho cả request.
  const [profile, maskedKey] = await Promise.all([
    requireProfile(),
    getMyApiKeyMasked(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Hồ sơ" description="Thông tin tài khoản của bạn" />
      {/* Full chiều rộng; máy rộng thì xếp 2 cột cho đỡ trống. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ProfileForm profile={profile} />
        <ApiKeyForm maskedKey={maskedKey} />
        <PasswordForm />
      </div>
    </div>
  );
}
