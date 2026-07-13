// E2E test Giai đoạn 1 chạy trên Supabase THẬT.
// Chạy: node --env-file=.env.local scripts/e2e-phase1.mjs  (cwd = web/)
// Tạo dữ liệu test rồi TỰ DỌN SẠCH (xóa user test bằng service role).
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON) {
  console.error("FAIL: thiếu NEXT_PUBLIC_SUPABASE_URL / ANON_KEY trong .env.local");
  process.exit(1);
}

const ts = Date.now();
const teacherEmail = `eduverse.e2e.gv.${ts}@gmail.com`;
const studentEmail = `eduverse.e2e.hv.${ts}@gmail.com`;
const badStudentEmail = `eduverse.e2e.bad.${ts}@gmail.com`;
const PASSWORD = "test-password-123";
const CLASS_CODE = `E2E${String(ts).slice(-2)}`; // mã khóa test, VD E2E37

const admin = SERVICE
  ? createClient(URL, SERVICE, { auth: { autoRefreshToken: false } })
  : null;

const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${extra ? " — " + extra : ""}`);
}

const createdUserIds = [];

async function main() {
  // ---- 1. Đăng ký GIÁO VIÊN (metadata role=teacher, không cần class_code)
  const teacher = createClient(URL, ANON);
  const { data: tSign, error: tErr } = await teacher.auth.signUp({
    email: teacherEmail,
    password: PASSWORD,
    options: { data: { full_name: "GV Test E2E", role: "teacher" } },
  });
  check("Đăng ký giáo viên", !tErr && !!tSign?.user, tErr?.message);
  if (tSign?.user) createdUserIds.push(tSign.user.id);
  if (!tSign?.session) {
    check(
      "Session sau signup (cần TẮT Confirm email trong Supabase Auth settings)",
      false,
      "signUp không trả session — vào Authentication → Sign In / Providers → Email → tắt 'Confirm email'"
    );
    return;
  }

  // profile do trigger tạo
  const { data: tProfile } = await teacher
    .from("profiles")
    .select("role, full_name")
    .eq("id", tSign.user.id)
    .single();
  check(
    "Trigger tạo profile giáo viên đúng role",
    tProfile?.role === "teacher" && tProfile?.full_name === "GV Test E2E"
  );

  // ---- 2. GV tạo khóa học + lớp
  const { data: course, error: cErr } = await teacher
    .from("courses")
    .insert({
      code: CLASS_CODE,
      name: "Khóa test E2E",
      teacher_id: tSign.user.id,
    })
    .select()
    .single();
  check("GV tạo khóa học", !cErr && !!course, cErr?.message);

  const { data: cls, error: clErr } = await teacher
    .from("classes")
    .insert({
      course_id: course.id,
      class_code: `${CLASS_CODE}01`,
      teacher_id: tSign.user.id,
      total_sessions: 5,
    })
    .select()
    .single();
  check("GV mở lớp", !clErr && !!cls, clErr?.message);

  // trigger tự sinh 5 buổi
  const { data: sessions } = await teacher
    .from("sessions")
    .select("session_number")
    .eq("class_id", cls.id);
  check("Trigger tự sinh 5 buổi học", sessions?.length === 5);

  // ---- 3. Học viên đăng ký bằng MÃ LỚP SAI → phải bị chặn
  const badStudent = createClient(URL, ANON);
  const { error: badErr } = await badStudent.auth.signUp({
    email: badStudentEmail,
    password: PASSWORD,
    options: {
      data: { full_name: "HV Sai Mã", role: "student", class_code: "SAIMA99" },
    },
  });
  check("Mã lớp sai → signup bị chặn bởi trigger", !!badErr, badErr?.message);

  // ---- 4. Học viên đăng ký bằng mã lớp ĐÚNG → tự ghi danh
  const student = createClient(URL, ANON);
  const { data: sSign, error: sErr } = await student.auth.signUp({
    email: studentEmail,
    password: PASSWORD,
    options: {
      data: {
        full_name: "HV Test E2E",
        role: "student",
        class_code: `${CLASS_CODE.toLowerCase()}01`, // thử chữ thường — trigger phải tự upper
        age: "12",
        school: "THCS Test",
        hobbies: "Game",
      },
    },
  });
  check("Đăng ký học viên với mã lớp đúng", !sErr && !!sSign?.user, sErr?.message);
  if (sSign?.user) createdUserIds.push(sSign.user.id);

  const { data: enrolls } = await teacher
    .from("enrollments")
    .select("student_id")
    .eq("class_id", cls.id);
  check(
    "Trigger tự ghi danh học viên vào lớp",
    enrolls?.some((e) => e.student_id === sSign.user.id)
  );

  // ---- 5. RLS: học viên KHÔNG sửa được lớp, KHÔNG thấy khóa học của GV
  const { data: hackUpdate } = await student
    .from("classes")
    .update({ description: "hacked" })
    .eq("id", cls.id)
    .select();
  check("RLS chặn học viên sửa lớp", (hackUpdate ?? []).length === 0);

  const { data: stuCourses } = await student.from("courses").select("id");
  check("RLS ẩn bảng courses với học viên", (stuCourses ?? []).length === 0);

  const { data: stuClasses } = await student
    .from("classes")
    .select("class_code");
  check(
    "RLS: học viên thấy đúng lớp mình học",
    stuClasses?.length === 1 && stuClasses[0].class_code === `${CLASS_CODE}01`
  );

  // GV thấy profile học viên trong lớp mình
  const { data: seenProfiles } = await teacher
    .from("profiles")
    .select("id")
    .eq("id", sSign.user.id);
  check("GV xem được profile học viên lớp mình", (seenProfiles ?? []).length === 1);

  // ---- 6. Chuyển lớp: GV mở lớp 2 rồi chuyển học viên sang
  const { data: cls2 } = await teacher
    .from("classes")
    .insert({
      course_id: course.id,
      class_code: `${CLASS_CODE}02`,
      teacher_id: tSign.user.id,
      total_sessions: 3,
    })
    .select()
    .single();
  const { data: enrollRow } = await teacher
    .from("enrollments")
    .select("id")
    .eq("class_id", cls.id)
    .eq("student_id", sSign.user.id)
    .single();
  const { error: moveErr } = await teacher
    .from("enrollments")
    .update({ class_id: cls2.id })
    .eq("id", enrollRow.id);
  const { data: afterMove } = await teacher
    .from("enrollments")
    .select("class_id")
    .eq("id", enrollRow.id)
    .single();
  check("GV chuyển học viên sang lớp khác", !moveErr && afterMove?.class_id === cls2.id);
}

async function cleanup() {
  if (!admin) {
    console.log("(bỏ qua dọn dẹp: không có SUPABASE_SERVICE_ROLE_KEY)");
    return;
  }
  // Xóa user test → cascade xóa profile/enrollment; xóa course → cascade classes/sessions.
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
  await admin.from("courses").delete().eq("code", CLASS_CODE);
  console.log("Đã dọn sạch dữ liệu test.");
}

try {
  await main();
} finally {
  await cleanup();
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nKết quả: ${results.length - failed}/${results.length} PASS`);
process.exit(failed === 0 ? 0 : 1);
