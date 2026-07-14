// Kiểm tra toàn vẹn dữ liệu sau khi xóa tay trên Supabase.
// Chạy: node --env-file=.env.local scripts/check-integrity.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false } }
);

const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
const authUsers = authData?.users ?? [];
const { data: profiles } = await admin
  .from("profiles")
  .select("id, username, full_name, role");
const { data: courses } = await admin
  .from("courses")
  .select("id, code, name, teacher_id");
const { data: classes } = await admin
  .from("classes")
  .select("id, class_code, teacher_id, course_id");
const { data: enrollments } = await admin
  .from("enrollments")
  .select("id, class_id, student_id");

console.log("=== TÀI KHOẢN AUTH ===");
for (const u of authUsers) {
  const p = profiles?.find((x) => x.id === u.id);
  console.log(
    `- ${u.email} | profile: ${p ? `${p.username} / ${p.full_name} (${p.role})` : "❌ ĐÃ MẤT"}`
  );
}

const profileIds = new Set((profiles ?? []).map((p) => p.id));
const authIds = new Set(authUsers.map((u) => u.id));

const orphanProfiles = (profiles ?? []).filter((p) => !authIds.has(p.id));
if (orphanProfiles.length) {
  console.log("\n=== PROFILE MỒ CÔI (không còn auth user) ===");
  orphanProfiles.forEach((p) => console.log(`- ${p.username} (${p.role})`));
}

console.log("\n=== KHÓA HỌC ===");
(courses ?? []).forEach((c) =>
  console.log(
    `- ${c.code} (${c.name}) | GV: ${profileIds.has(c.teacher_id) ? "OK" : "❌ MẤT GV"}`
  )
);

console.log("\n=== LỚP ===");
(classes ?? []).forEach((c) => {
  const enrollCount = (enrollments ?? []).filter(
    (e) => e.class_id === c.id
  ).length;
  console.log(
    `- ${c.class_code} | GV: ${profileIds.has(c.teacher_id) ? "OK" : "❌ MẤT GV"} | ${enrollCount} học viên`
  );
});

const orphanEnrolls = (enrollments ?? []).filter(
  (e) => !profileIds.has(e.student_id)
);
if (orphanEnrolls.length) {
  console.log(`\n❌ ${orphanEnrolls.length} enrollment mồ côi (mất profile học viên)`);
}

console.log("\nTổng: %d auth user, %d profile, %d khóa, %d lớp, %d enrollment",
  authUsers.length, profiles?.length ?? 0, courses?.length ?? 0,
  classes?.length ?? 0, enrollments?.length ?? 0);
