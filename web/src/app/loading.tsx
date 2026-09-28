import { PageSkeleton } from "@/components/page-skeleton";

/**
 * Ranh giới Suspense cấp gốc (root).
 * Giúp hiển thị khung xương giao diện ngay lập tức trong 0.1s khi bắt đầu truy cập
 * tránh hiện tượng màn hình trắng trong lúc middleware và Server Components kiểm tra phiên đăng nhập.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <PageSkeleton />
    </div>
  );
}
