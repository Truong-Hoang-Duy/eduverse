// Alias từ types sinh tự động (supabase gen types typescript --linked).
// Chạy lại lệnh đó khi schema đổi — không tự khai tay.
import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];

export type Role = "teacher" | "student";

export type Profile = Tables["profiles"]["Row"] & { role: Role };
export type Course = Tables["courses"]["Row"];
export type Class = Tables["classes"]["Row"];
export type Enrollment = Tables["enrollments"]["Row"];

export interface ClassWithCourse extends Class {
  courses: Pick<Course, "code" | "name"> | null;
}

export interface EnrollmentWithStudent extends Enrollment {
  profiles: Pick<Profile, "id" | "full_name" | "age" | "school"> | null;
}

/** Kết quả chuẩn của Server Action cho form (hiển thị lỗi tiếng Việt). */
export interface ActionResult {
  error?: string;
  success?: string;
}
