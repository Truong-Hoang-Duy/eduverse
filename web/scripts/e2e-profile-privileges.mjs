// E2E quyền trên bảng `profiles` — CHỐNG LEO THANG QUYỀN.
// ⚠️ Cần migration 20260731030000_profiles_column_privileges.sql.
// Chạy trong web/: node --env-file=.env.local scripts/e2e-profile-privileges.mjs
//
// Vì sao có script riêng: `profiles_update_own` chỉ giới hạn DÒNG, không giới hạn
// CỘT (RLS Postgres không có khái niệm cột). Trước migration trên, học viên tự sửa
// `role` thành 'teacher' được, và chuỗi đó dẫn tới chiếm tài khoản học viên khác.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ts = Date.now();
const FAKE = "eduverse.local";
const PASSWORD = "test-password-123";
const CODE = `EK${String(ts).slice(-4)}`;

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false } });
const results = [];
const userIds = [];
const courseIds = [];

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

async function roleOf(id) {
  const { data } = await admin.from("profiles").select("role").eq("id", id).single();
  return data.role;
}

async function main() {
  const gv = await makeUser(`ek.gv.${ts}`, { full_name: "GV That", role: "teacher" });
  const { data: course, error: courseErr } = await gv.client
    .from("courses")
    .insert({ code: CODE, name: "Khoa quyen", teacher_id: gv.id })
    .select("id")
    .single();
  if (courseErr) throw new Error(`courses: ${courseErr.message}`);
  courseIds.push(course.id);

  for (const suffix of ["01", "02"]) {
    const { error } = await gv.client.from("classes").insert({
      course_id: course.id,
      class_code: `${CODE}${suffix}`,
      total_sessions: 2,
      teacher_id: gv.id,
    });
    if (error) throw new Error(`classes ${suffix}: ${error.message}`);
  }

  const hv = await makeUser(`ek.hv.${ts}`, {
    full_name: "Hoc Vien",
    role: "student",
    class_code: `${CODE}01`,
  });
  const victim = await makeUser(`ek.victim.${ts}`, {
    full_name: "Nan Nhan",
    role: "student",
    class_code: `${CODE}02`,
  });

  // Nạn nhân (lớp khác) có link Drive riêng — để ca "đọc được link lớp khác" ở
  // dưới KHÔNG pass suông vì đơn giản là chẳng có dữ liệu nào.
  const VICTIM_LINK = "https://drive.google.com/drive/folders/RIENG-TU-LOP-B";
  const { error: victimLinkErr } = await victim.client
    .from("student_drive_links")
    .upsert({ student_id: victim.id, drive_url: VICTIM_LINK });
  if (victimLinkErr) throw new Error(`victim drive link: ${victimLinkErr.message}`);

  // ---------- 1. KHÔNG tự nâng quyền ----------
  const { error: roleErr } = await hv.client
    .from("profiles")
    .update({ role: "teacher" })
    .eq("id", hv.id);
  const roleAfter = await roleOf(hv.id);
  check(
    "HV KHÔNG tự sửa được role thành teacher",
    roleAfter === "student",
    roleErr ? "bị chặn ngay" : `role hiện tại: ${roleAfter}`
  );

  // ---------- 2. KHÔNG tự đổi username (UI để read-only) ----------
  const { error: unameErr } = await hv.client
    .from("profiles")
    .update({ username: `doi.${ts}` })
    .eq("id", hv.id);
  const { data: unameRow } = await admin
    .from("profiles")
    .select("username")
    .eq("id", hv.id)
    .single();
  check(
    "HV KHÔNG tự đổi được username",
    unameRow.username === `ek.hv.${ts}`,
    unameErr ? "bị chặn ngay" : `username hiện tại: ${unameRow.username}`
  );

  // ---------- 3. NHƯNG vẫn sửa được họ tên (đừng revoke quá tay) ----------
  const { error: nameErr } = await hv.client
    .from("profiles")
    .update({ full_name: "Ten Moi Hop Le" })
    .eq("id", hv.id);
  const { data: nameRow } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", hv.id)
    .single();
  check(
    "HV VẪN sửa được họ tên của mình",
    !nameErr && nameRow.full_name === "Ten Moi Hop Le",
    nameErr?.message ?? ""
  );

  // ---------- 4. Họ tên quá dài bị DB chặn ----------
  const { error: longNameErr } = await hv.client
    .from("profiles")
    .update({ full_name: "N".repeat(500) })
    .eq("id", hv.id);
  check("DB chặn họ tên quá dài", Boolean(longNameErr));

  const { error: blankNameErr } = await hv.client
    .from("profiles")
    .update({ full_name: "   " })
    .eq("id", hv.id);
  check("DB chặn họ tên rỗng", Boolean(blankNameErr));

  // ---------- 5. KHÔNG sửa được profile người khác ----------
  await hv.client.from("profiles").update({ full_name: "Bi doi ten" }).eq("id", victim.id);
  const { data: victimRow } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", victim.id)
    .single();
  check("HV KHÔNG sửa được profile của HV khác", victimRow.full_name === "Nan Nhan");

  // ---------- 6. Vai trò student KHÔNG mở được đường của giáo viên ----------
  // Kể cả không đổi được role, policy `courses_teacher_all` chỉ kiểm
  // `teacher_id = auth.uid()` chứ không kiểm role — nên phải canh riêng.
  const { error: ownCourseErr } = await hv.client
    .from("courses")
    .insert({ code: `${CODE}X`, name: "Khoa cua HV", teacher_id: hv.id });
  check(
    "HV KHÔNG tự tạo được khóa học",
    Boolean(ownCourseErr),
    ownCourseErr ? "" : "🔴 HV tạo được khóa — policy courses không kiểm role!"
  );
  if (!ownCourseErr) {
    await admin.from("courses").delete().eq("code", `${CODE}X`);
  }

  // ---------- 7. Không ghi danh được HV lớp khác vào đâu cả ----------
  const { data: myClass } = await admin
    .from("classes")
    .select("id")
    .eq("class_code", `${CODE}01`)
    .single();
  const { error: enrollErr } = await hv.client
    .from("enrollments")
    .insert({ class_id: myClass.id, student_id: victim.id });
  check("HV KHÔNG ghi danh được người khác vào lớp", Boolean(enrollErr));

  // ---------- 8. KHÔNG tự ghi danh mình vào lớp khác ----------
  // Mã lớp rất dễ đoán và `get_class_id_by_code` (SECURITY DEFINER) đổi mã → UUID,
  // nên nếu còn policy insert trần thì HV tự vào lớp bất kỳ rồi đọc sản phẩm,
  // roster và LINK DRIVE riêng của các em lớp đó (migration 20260731040000).
  const { data: otherClassId } = await hv.client.rpc("get_class_id_by_code", {
    p_class_code: `${CODE}02`,
  });
  const { error: selfEnrollErr } = await hv.client
    .from("enrollments")
    .insert({ class_id: otherClassId, student_id: hv.id });
  check(
    "HV KHÔNG tự ghi danh mình vào lớp khác",
    Boolean(selfEnrollErr),
    selfEnrollErr ? "" : "🔴 tự vào được lớp khác → đọc được dữ liệu lớp đó"
  );

  // Và vẫn không đọc được link Drive riêng của em lớp đó
  const { data: leaked } = await hv.client
    .from("student_drive_links")
    .select("drive_url")
    .eq("student_id", victim.id);
  check(
    "HV KHÔNG đọc được link Drive của HV lớp khác",
    (leaked ?? []).length === 0,
    leaked?.length ? `🔴 đọc được: ${leaked[0].drive_url}` : "thấy 0 dòng"
  );

  // Dọn: xóa khóa TRƯỚC tài khoản, rồi xóa user.
  for (const id of courseIds) await admin.from("courses").delete().eq("id", id);
  for (const id of userIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error(`Không xóa được user ${id}: ${error.message}`);
  }
  console.log("Đã dọn sạch dữ liệu test.");

  const passed = results.filter(Boolean).length;
  console.log(`\nKết quả: ${passed}/${results.length} PASS`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error("LỖI:", err.message);
  process.exit(1);
});
