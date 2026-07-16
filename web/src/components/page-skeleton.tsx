import { Skeleton } from "@/components/ui/skeleton";

/**
 * Khung xương dùng chung cho các loading.tsx. Cố ý TRUNG TÍNH, không cố khớp
 * pixel từng trang: khung khớp gần đúng gây "nhảy" khi nội dung thật vào, khó
 * chịu hơn khung trung tính đọc rõ là "đang tải".
 *
 * Kích thước bám theo PageHeader (h1 text-2xl + p text-sm) và StatCard
 * (rounded-xl border p-4 ≈ h-28) để bố cục không xô lệch lúc chuyển.
 */
export function PageSkeleton({
  stats = 3,
  blocks = 4,
}: {
  /** Số thẻ số liệu; 0 = không hiện hàng này. */
  stats?: number;
  /** Số khối nội dung bên dưới. */
  blocks?: number;
}) {
  return (
    <div className="space-y-8" aria-busy="true">
      {/* Người dùng screen reader cũng phải biết trang đang tải, không chỉ người nhìn. */}
      <span className="sr-only" role="status">
        Đang tải nội dung trang…
      </span>

      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {stats > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: stats }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: blocks }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
