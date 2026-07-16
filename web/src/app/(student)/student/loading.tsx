import { PageSkeleton } from "@/components/page-skeleton";

/** Ranh giới Suspense cho mọi trang /student/* — xem chú thích ở teacher/loading.tsx. */
export default function Loading() {
  return <PageSkeleton />;
}
