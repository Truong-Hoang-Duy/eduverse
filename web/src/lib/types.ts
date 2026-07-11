// Types tạm cho các bảng DB. TODO: thay bằng database.types.ts sinh từ
// `supabase gen types typescript` khi đã có Supabase project thật.

export type Role = "teacher" | "student";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  age: number | null;
  school: string | null;
  hobbies: string | null;
  avatar_url: string | null;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  teacher_id: string;
}

export interface Class {
  id: string;
  course_id: string;
  class_code: string;
  teacher_id: string;
  total_sessions: number;
  description: string | null;
}

export interface Enrollment {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
}

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
