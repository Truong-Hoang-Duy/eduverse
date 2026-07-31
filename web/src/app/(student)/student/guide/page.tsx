import { redirect } from "next/navigation";

/** Route cũ (gộp mọi lớp) — giờ nằm trong từng lớp. Đưa về danh sách lớp. */
export default function LegacyPage() {
  redirect("/student");
}
