import { SealRing } from "./emblem";

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Chữ cái đầu tên em, đóng trong vòng triện khía — dùng chung ở thẻ, popup, và
 *  màn hình TV phía giáo viên. */
export function SealAvatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <SealRing className="absolute inset-0 size-full text-sc-brass/70" />
      <span
        className="font-display font-semibold text-sc-ink"
        style={{ fontSize: size * 0.4 }}
      >
        {initials(name)}
      </span>
    </span>
  );
}
