// E2E: sửa khóa/mã lớp + tìm & thêm học viên vào lớp (gồm RLS của RPC).
// Chạy trong web/: node --env-file=.env.local scripts/e2e-class-admin.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ts = Date.now();
const FAKE = "eduverse.local";
const PASSWORD = "test-password-123";
const CODE = `EA${String(ts).slice(-2)}`;
const CODE2 = `EB${String(ts).slice(-2)}`;

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false } });
const results = [];
const userIds = [];
function check(name, ok, extra = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${extra ? " — " + extra : ""}`);
}

async function makeUser(username, metadata) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${username}@${FAKE}`,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { ...metadata, username },
  });
  if (error) throw new Error(`createUser ${username}: ${error.message}`);
  userIds.push(data.user.id);
  const client = createClient(URL, ANON);
  await client.auth.signInWithPassword({
    email: `${username}@${FAKE}`,
    password: PASSWORD,
  });
  return { client, id: data.user.id };
}

async function main() {
  const gv = await makeUser(`ea.gv.${ts}`, { full_name: "GV Admin", role: "teacher" });
  const teacher = gv.client;

  const { data: course } = await teacher
    .from("courses")
    .insert({ code: CODE, name: "Khóa cũ", teacher_id: gv.id })
    .select()
    .single();
  const { data: cls } = await teacher
    .from("classes")
    .insert({
      course_id: course.id,
      class_code: `${CODE}01`,
      teacher_id: gv.id,
      total_sessions: 3,
    })
    .select()
    .single();

  // Học viên đã ở trong lớp (đăng ký bằng mã lớp)
  const inClass = await makeUser(`ea.hv1.${ts}`, {
    full_name: "Trần Văn Trong",
    role: "student",
    class_code: `${CODE}01`,
  });
  // Học viên CHƯA vào lớp nào của GV này — dùng lớp khóa khác
  const { data: course2 } = await teacher
    .from("courses")
    .insert({ code: CODE2, name: "Khóa 2", teacher_id: gv.id })
    .select()
    .single();
  await teacher.from("classes").insert({
    course_id: course2.id,
    class_code: `${CODE2}01`,
    teacher_id: gv.id,
    total_sessions: 3,
  });
  const outsider = await makeUser(`ea.hv2.${ts}`, {
    full_name: "Lê Thị Ngoài",
    role: "student",
    class_code: `${CODE2}01`,
  });

  // ---- Sửa khóa học ----
  const { error: cErr } = await teacher
    .from("courses")
    .update({ code: `${CODE}X`, name: "Khóa đã sửa" })
    .eq("id", course.id);
  const { data: courseAfter } = await teacher
    .from("courses")
    .select("code, name")
    .eq("id", course.id)
    .single();
  check(
    "GV sửa được mã + tên khóa học",
    !cErr && courseAfter.code === `${CODE}X` && courseAfter.name === "Khóa đã sửa",
    cErr?.message
  );

  // Mã khóa trùng → bị chặn
  const { error: dupCourse } = await teacher
    .from("courses")
    .update({ code: CODE2 })
    .eq("id", course.id);
  check("Mã khóa trùng khóa khác → bị chặn", dupCourse?.code === "23505");

  // ---- Sửa mã lớp ----
  const { error: clErr } = await teacher
    .from("classes")
    .update({ class_code: `${CODE}09` })
    .eq("id", cls.id);
  const { data: clsAfter } = await teacher
    .from("classes")
    .select("class_code")
    .eq("id", cls.id)
    .single();
  check("GV sửa được mã lớp", !clErr && clsAfter.class_code === `${CODE}09`, clErr?.message);

  // Học viên cũ vẫn ở trong lớp sau khi đổi mã
  const { data: stillIn } = await teacher
    .from("enrollments")
    .select("student_id")
    .eq("class_id", cls.id);
  check(
    "Đổi mã lớp không làm mất học viên đang học",
    stillIn?.some((e) => e.student_id === inClass.id)
  );

  // Mã lớp trùng → bị chặn
  const { error: dupClass } = await teacher
    .from("classes")
    .update({ class_code: `${CODE2}01` })
    .eq("id", cls.id);
  check("Mã lớp trùng lớp khác → bị chặn", dupClass?.code === "23505");

  // ---- Tìm học viên ----
  const { data: byName } = await teacher.rpc("search_students", {
    p_query: "Ngoài",
  });
  check(
    "Tìm học viên theo TÊN (kể cả em chưa vào lớp mình)",
    (byName ?? []).some((s) => s.id === outsider.id)
  );

  const { data: byUsername } = await teacher.rpc("search_students", {
    p_query: `ea.hv2.${ts}`,
  });
  check(
    "Tìm học viên theo TÊN TÀI KHOẢN",
    (byUsername ?? []).some((s) => s.id === outsider.id)
  );

  const { data: empty } = await teacher.rpc("search_students", { p_query: "  " });
  check("Query rỗng → không trả gì", (empty ?? []).length === 0);

  const { data: noHit } = await teacher.rpc("search_students", {
    p_query: "khongtontai_zzz999",
  });
  check("Không khớp ai → mảng rỗng", (noHit ?? []).length === 0);

  // RPC không trả về giáo viên
  const { data: gvHit } = await teacher.rpc("search_students", {
    p_query: "GV Admin",
  });
  check("RPC chỉ trả học viên, không trả giáo viên", (gvHit ?? []).length === 0);

  // BẢO MẬT: học viên gọi RPC → không được gì (is_teacher() chặn)
  const { data: stuSearch } = await inClass.client.rpc("search_students", {
    p_query: "Ngoài",
  });
  check(
    "Bảo mật: học viên gọi RPC tìm kiếm → rỗng",
    (stuSearch ?? []).length === 0
  );

  // ---- Thêm học viên vào lớp ----
  const { error: addErr } = await teacher
    .from("enrollments")
    .insert({ class_id: cls.id, student_id: outsider.id });
  const { data: afterAdd } = await teacher
    .from("enrollments")
    .select("student_id")
    .eq("class_id", cls.id);
  check(
    "GV thêm thẳng học viên vào lớp",
    !addErr && afterAdd?.some((e) => e.student_id === outsider.id),
    addErr?.message
  );

  // Thêm trùng → bị chặn
  const { error: dupEnroll } = await teacher
    .from("enrollments")
    .insert({ class_id: cls.id, student_id: outsider.id });
  check("Thêm học viên đã có trong lớp → bị chặn", dupEnroll?.code === "23505");
}

async function cleanup() {
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  for (const c of [CODE, `${CODE}X`, CODE2]) {
    await admin.from("courses").delete().eq("code", c);
  }
  console.log("Đã dọn sạch dữ liệu test.");
}

try {
  await main();
} finally {
  await cleanup();
}

const failed = results.filter((r) => !r).length;
console.log(`\nKết quả: ${results.length - failed}/${results.length} PASS`);
process.exit(failed === 0 ? 0 : 1);
