import { redirect } from "next/navigation";

/**
 * Route cũ (gộp mọi lớp) đã tách thành `/student/classes/[classId]/gallery`.
 * Không xóa hẳn để link/bookmark cũ không 404 — đưa về danh sách lớp để chọn.
 */
export default function LegacyGalleryPage() {
  redirect("/student");
}
