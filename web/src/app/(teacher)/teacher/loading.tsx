import { PageSkeleton } from "@/components/page-skeleton";

/**
 * Ranh giới Suspense cho mọi trang /teacher/*. Ngoài việc hiện khung xương, file
 * này còn BẬT LẠI prefetch của <Link>: route dynamic chỉ được prefetch tới ranh
 * giới loading gần nhất — không có file này thì prefetch trả về rỗng.
 */
export default function Loading() {
  return <PageSkeleton />;
}
