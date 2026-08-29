import type { Metadata } from "next";

import { loadShowcase } from "@/lib/showcase-data";

import { showcaseFontClass } from "../fonts";
import { GraduationSeal } from "./emblem";
import { ShowcaseView } from "./showcase-view";

/**
 * Trang triển lãm sản phẩm cuối khóa dành cho PHỤ HUYNH — không cần đăng nhập.
 *
 * Luôn dựng lại mỗi lượt truy cập: trong buổi lễ học viên vẫn có thể sửa sản
 * phẩm, và trang này còn hiện nhận xét/tim của khách khác gửi vài giây trước.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const showcase = await loadShowcase(token);

  return {
    title: showcase
      ? `Sản phẩm cuối khóa · Lớp ${showcase.class_code} — Eduverse`
      : "Link không còn hiệu lực — Eduverse",
    // Hàng rào CHÍNH chống lên Google. `robots.ts` chỉ là lớp phụ.
    robots: { index: false, follow: false },
  };
}

export default async function ShowcasePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const showcase = await loadShowcase(token);

  if (!showcase) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md space-y-3 rounded-2xl border border-sc-brass/30 bg-sc-raised p-8 text-center">
          <GraduationSeal size={56} className="mx-auto text-sc-brass/60" />
          <h1 className="font-display text-xl font-semibold">
            Link không còn hiệu lực
          </h1>
          <p className="text-sm text-sc-ink-soft">
            Đường dẫn này đã hết hạn hoặc được giáo viên gỡ xuống. Quý phụ huynh
            vui lòng liên hệ giáo viên chủ nhiệm lớp để nhận link mới.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ShowcaseView
      token={token}
      showcase={showcase}
      fontClass={showcaseFontClass}
    />
  );
}
