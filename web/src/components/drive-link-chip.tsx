import { isSafeHttpUrl, shortenDriveUrl } from "@/lib/drive-url";

/**
 * Hiển thị GỌN một link Drive: bấm là mở tab mới. Dùng chung cho khu học viên và
 * bảng học viên của giáo viên nên link dài mấy cũng không phá vỡ bố cục.
 */
export function DriveLinkChip({
  url,
  label,
}: {
  url: string;
  /** Đặt nhãn cố định (VD "Mở thư mục Drive") thay vì hiện link đã cắt ngắn. */
  label?: string;
}) {
  // Chốt chặn cuối: link tới đây có thể là dòng cũ trong DB có `javascript:`
  // (ghi trước khi có constraint). Hiện chữ trơ, KHÔNG bọc thành <a href>.
  if (!isSafeHttpUrl(url)) {
    return (
      <span className="text-xs text-destructive" title="Đường dẫn không hợp lệ">
        ⚠️ Đường dẫn không hợp lệ
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      // Link do người dùng dán vào: `noopener noreferrer` để trang đích không
      // với tới được `window.opener` của app.
      title={url}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-primary"
    >
      <span aria-hidden="true">📁</span>
      <span className="min-w-0 truncate">{label ?? shortenDriveUrl(url)}</span>
      <span aria-hidden="true" className="shrink-0 text-muted-foreground">
        ↗
      </span>
    </a>
  );
}
