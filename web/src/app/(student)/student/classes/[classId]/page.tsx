import { redirect } from "next/navigation";

/** Vào lớp là vào ngay tab đầu tiên — không có trang tổng quan riêng cho lớp. */
export default async function StudentClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  redirect(`/student/classes/${classId}/projects`);
}
