import { PageHeader } from "@/components/page-header";
import { getMyApiKeyInfo } from "@/lib/actions/api-key";
import { requireProfile } from "@/lib/get-profile";

import { ApiKeyForm } from "./api-key-form";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Hồ sơ — Eduverse" };

export default async function ProfilePage() {
  const profile = await requireProfile();
  // Học viên không dùng AI nên không hiện card Provider AI; chỉ giáo viên mới cấu hình key riêng
  const apiKeyInfo = profile.role === "teacher" ? await getMyApiKeyInfo() : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Hồ sơ" description="Thông tin tài khoản của bạn" />
      {apiKeyInfo ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ProfileForm profile={profile} />
            <PasswordForm />
          </div>
          <div>
            <ApiKeyForm info={apiKeyInfo} />
          </div>
        </div>
      ) : (
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          <ProfileForm profile={profile} />
          <PasswordForm />
        </div>
      )}
    </div>
  );
}
