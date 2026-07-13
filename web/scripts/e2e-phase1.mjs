// E2E test Giai đoạn 1 (luồng USERNAME) chạy trên Supabase THẬT.
// Chạy: node --env-file=.env.local scripts/e2e-phase1.mjs  (cwd = web/)
// Mô phỏng đúng Server Action: tạo user qua admin API với email ảo
// <username>@eduverse.local, đăng nhập bằng username. TỰ DỌN SẠCH khi xong.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error("FAIL: thiếu SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const ts = Date.now();
const FAKE_DOMAIN = "eduverse.local";
const teacherUsername = `e2e.gv.${ts}`;
const studentUsername = `e2e.hv.${ts}`;
const PASSWORD = "test-password-123";
const COURSE_CODE = `EE${String(ts).slice(-2)}`;

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false } });

const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${extra ? " — " + extra : ""}`);
}

const createdUserIds = [];

/** Mô phỏng Server Action đăng ký: admin.createUser + đăng nhập username. */
async function signupAndLogin(username, metadata) {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: `${username}@${FAKE_DOMAIN}`,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { ...metadata, username },
  });
  if (createErr) return { error: createErr };
  createdUserIds.push(created.user.id);

  const client = createClient(URL, ANON);
  const { data: email } = await client.rpc("get_email_by_username", {
    p_username: username,
  });
  if (!email) return { error: new Error("get_email_by_username trả null") };
  const { error: loginErr } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (loginErr) return { error: loginErr };
  return { client, userId: created.user.id };
}

async function main() {
  // ---- 1. Đăng ký + đăng nhập GIÁO VIÊN bằng username
  const gv = await signupAndLogin(teacherUsername, {
    full_name: "GV Test E2E",
    role: "teacher",
  });
  check("Đăng ký + đăng nhập giáo viên bằng username", !gv.error, gv.error?.message);
  if (gv.error) return;
  const teacher = gv.client;

  const { data: tProfile } = await teacher
    .from("profiles")
    .select("role, username")
    .eq("id", gv.userId)
    .single();
  check(
    "Trigger lưu username vào profile",
    tProfile?.role === "teacher" && tProfile?.username === teacherUsername
  );

  // ---- 2. GV tạo khóa + lớp
  const { data: course, error: cErr } = await teacher
    .from("courses")
    .insert({ code: COURSE_CODE, name: "Khóa test E2E", teacher_id: gv.userId })
    .select()
    .single();
  check("GV tạo khóa học", !cErr, cErr?.message);

  const { data: cls, error: clErr } = await teacher
    .from("classes")
    .insert({
      course_id: course.id,
      class_code: `${COURSE_CODE}01`,
      teacher_id: gv.userId,
      total_sessions: 5,
    })
    .select()
    .single();
  check("GV mở lớp", !clErr, clErr?.message);

  // ---- 3. Combo box: lớp vừa mở phải xuất hiện trong list_available_classes (anon)
  const anonClient = createClient(URL, ANON);
  const { data: choices } = await anonClient.rpc("list_available_classes");
  check(
    "Combo box (anon) thấy lớp vừa mở kèm tên khóa",
    (choices ?? []).some(
      (c) => c.class_code === `${COURSE_CODE}01` && c.course_name === "Khóa test E2E"
    )
  );

  // ---- 4. Username trùng phải bị phát hiện (pre-check của Server Action)
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("username", teacherUsername)
    .limit(1);
  check("Phát hiện username trùng", (taken ?? []).length === 1);

  // ---- 5. HV đăng ký với mã lớp sai → trigger chặn
  const bad = await signupAndLogin(`e2e.bad.${ts}`, {
    full_name: "HV Sai Mã",
    role: "student",
    class_code: "SAIMA99",
  });
  check("Mã lớp sai → bị chặn", !!bad.error);

  // ---- 6. HV đăng ký đúng lớp → tự ghi danh; đăng nhập bằng username
  const hv = await signupAndLogin(studentUsername, {
    full_name: "HV Test E2E",
    role: "student",
    class_code: `${COURSE_CODE}01`,
  });
  check("Đăng ký + đăng nhập học viên bằng username", !hv.error, hv.error?.message);
  const student = hv.client;

  const { data: enrolls } = await teacher
    .from("enrollments")
    .select("student_id")
    .eq("class_id", cls.id);
  check("Trigger tự ghi danh học viên", enrolls?.some((e) => e.student_id === hv.userId));

  // ---- 7. RLS vẫn đúng
  const { data: hackUpdate } = await student
    .from("classes")
    .update({ description: "hacked" })
    .eq("id", cls.id)
    .select();
  check("RLS chặn học viên sửa lớp", (hackUpdate ?? []).length === 0);

  const { data: stuCourses } = await student.from("courses").select("id");
  check("RLS ẩn bảng courses với học viên", (stuCourses ?? []).length === 0);

  // GV thấy username học viên trong bảng danh sách lớp
  const { data: seen } = await teacher
    .from("enrollments")
    .select("profiles(username)")
    .eq("class_id", cls.id);
  check(
    "GV thấy username học viên lớp mình",
    seen?.some((e) => e.profiles?.username === studentUsername)
  );

  // ---- 8. Đăng nhập sai username → RPC trả null
  const { data: noEmail } = await anonClient.rpc("get_email_by_username", {
    p_username: "khong.ton.tai.999",
  });
  check("Username không tồn tại → không tra được email", !noEmail);
}

async function cleanup() {
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
  await admin.from("courses").delete().eq("code", COURSE_CODE);
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
