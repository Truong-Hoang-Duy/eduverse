import { PageSkeleton } from "@/components/page-skeleton";

/** Hồ sơ không có thẻ số liệu, chỉ 2 khối form. */
export default function Loading() {
  return <PageSkeleton stats={0} blocks={2} />;
}
