import { PageSkeleton } from "@/components/page-skeleton";

/** Trang hồ sơ query nặng (5 truy vấn song song) nên có boundary riêng cho mượt. */
export default function Loading() {
  return <PageSkeleton stats={3} blocks={3} />;
}
