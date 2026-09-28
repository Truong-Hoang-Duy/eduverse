"use client";

import { useState } from "react";

import { isSafeHttpUrl } from "@/lib/drive-url";

/**
 * Ảnh lấy từ link NGOÀI do học viên dán vào (`projects.image_urls`).
 *
 * Dùng `<img>` chứ không phải `next/image`: link trỏ tới host ảnh bất kỳ, mà
 * `next/image` bắt khai trước từng domain trong `remotePatterns` — không thể
 * liệt kê hết trang host ảnh trên đời.
 *
 * Link ngoài chết bất cứ lúc nào nên ảnh hỏng thì ẨN HẲN: một ô ảnh vỡ giữa buổi
 * lễ còn khó coi hơn là không có ảnh.
 */
export function SafeImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [broken, setBroken] = useState(false);

  // Chặn `javascript:`/`data:` ngay tại chỗ render — cùng lý do như `LinkChip`:
  // RLS cho học viên ghi thẳng dòng của mình qua REST API, bỏ qua Server Action.
  if (broken || !isSafeHttpUrl(src)) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      onClick={onClick}
      className={className}
    />
  );
}
