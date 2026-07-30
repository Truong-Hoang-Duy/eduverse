// E2E link Drive nộp bài của học viên (bảng `student_drive_links`).
// ⚠️ CHẠY ĐƯỢC SAU KHI đã dán migration 20260730000000_student_drive_links.sql.
// Chạy trong web/:
//   node --env-file=.env.local scripts/e2e-drive-link.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ts = Date.now();
const FAKE = "eduverse.local";
const PASSWORD = "test-password-123";
const CODE = `DL${String(ts).slice(-4)}`;

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
  if (error) {
    console.error("createUser raw:", error.status, error.code, error.message, JSON.stringify(error));
    throw new Error(`createUser ${username}: ${error.message}`);
  }
  userIds.push(data.user.id);
  const client = createClient(URL, ANON);
  await client.auth.signInWithPassword({
    email: `${username}@${FAKE}`,
    password: PASSWORD,
  });
  return { client, id: data.user.id };
}

async function main() {
  const gv = await makeUser(`dl.gv.${ts}`, { full_name: "GV Drive", role: "teacher" });
  const gvKhac = await makeUser(`dl.gv2.${ts}`, { full_name: "GV Khac", role: "teacher" });

  // Lớp phải có TRƯỚC học viên: trigger `handle_new_user` tự ghi danh theo
  // `class_code` trong user_metadata, nên tạo học viên trước là lỗi 500.
  const { data: newCourse, error: courseErr } = await gv.client
    .from("courses")
    .insert({ code: CODE, name: "Khoa test drive", teacher_id: gv.id })
    .select("id")
    .single();
  if (courseErr) throw new Error(`courses: ${courseErr.message}`);
  courseIds.push(newCourse.id);

  const { data: cls, error: clsErr } = await gv.client
    .from("classes")
    .insert({
      course_id: newCourse.id,
      class_code: `${CODE}01`,
      total_sessions: 4,
      teacher_id: gv.id,
    })
    .select("id")
    .single();
  if (clsErr) throw new Error(`classes: ${clsErr.message}`);
  void cls;

  // Cả 2 học viên vào CÙNG lớp — trigger tự ghi danh theo class_code.
  const hv = await makeUser(`dl.hv.${ts}`, {
    full_name: "HV Drive",
    role: "student",
    class_code: `${CODE}01`,
  });
  const ban = await makeUser(`dl.ban.${ts}`, {
    full_name: "Ban Cung Lop",
    role: "student",
    class_code: `${CODE}01`,
  });

  const LINK = "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz";

  // 1. Học viên tự lưu link của mình
  const { error: saveErr } = await hv.client
    .from("student_drive_links")
    .upsert({ student_id: hv.id, drive_url: LINK });
  check("Học viên lưu được link Drive của mình", !saveErr, saveErr?.message ?? "");

  // 2. Học viên đọc lại được
  const { data: mine } = await hv.client
    .from("student_drive_links")
    .select("drive_url")
    .eq("student_id", hv.id)
    .maybeSingle();
  check("Học viên đọc lại được link của mình", mine?.drive_url === LINK);

  // 3. GV CỦA LỚP đọc được — yêu cầu nghiệp vụ chính
  const { data: seenByTeacher } = await gv.client
    .from("student_drive_links")
    .select("student_id, drive_url")
    .eq("student_id", hv.id);
  check(
    "GV của lớp xem được link của học viên",
    seenByTeacher?.length === 1 && seenByTeacher[0].drive_url === LINK,
    `thấy ${seenByTeacher?.length ?? 0} dòng`
  );

  // 4. BẠN CÙNG LỚP KHÔNG được thấy — lý do đặt bảng riêng thay vì cột trong profiles
  const { data: seenByPeer } = await ban.client
    .from("student_drive_links")
    .select("student_id")
    .eq("student_id", hv.id);
  check(
    "Bạn cùng lớp KHÔNG thấy link của bạn khác",
    (seenByPeer?.length ?? 0) === 0,
    `thấy ${seenByPeer?.length ?? 0} dòng`
  );

  // 5. GV lớp khác không thấy
  const { data: seenByOther } = await gvKhac.client
    .from("student_drive_links")
    .select("student_id")
    .eq("student_id", hv.id);
  check(
    "GV lớp khác KHÔNG thấy link",
    (seenByOther?.length ?? 0) === 0,
    `thấy ${seenByOther?.length ?? 0} dòng`
  );

  // 6. GV không sửa được link của học viên (policy chỉ cho SELECT)
  const { error: gvUpdateErr } = await gv.client
    .from("student_drive_links")
    .update({ drive_url: "https://evil.example.com" })
    .eq("student_id", hv.id);
  const { data: afterGvUpdate } = await hv.client
    .from("student_drive_links")
    .select("drive_url")
    .eq("student_id", hv.id)
    .maybeSingle();
  check(
    "GV KHÔNG sửa được link của học viên",
    afterGvUpdate?.drive_url === LINK,
    gvUpdateErr ? "bị chặn ngay" : "update không đổi được dòng"
  );

  // 7. Học viên khác không ghi đè được link của bạn
  const { error: peerWriteErr } = await ban.client
    .from("student_drive_links")
    .upsert({ student_id: hv.id, drive_url: "https://evil.example.com" });
  check("Học viên khác KHÔNG ghi được link của bạn", Boolean(peerWriteErr));

  // 8. Xóa link (ô rỗng = xóa) — chính chủ làm được
  const { error: delErr } = await hv.client
    .from("student_drive_links")
    .delete()
    .eq("student_id", hv.id);
  const { data: afterDelete } = await hv.client
    .from("student_drive_links")
    .select("student_id")
    .eq("student_id", hv.id);
  check(
    "Học viên xóa được link của mình",
    !delErr && (afterDelete?.length ?? 0) === 0
  );

  // Dọn: xóa khóa TRƯỚC tài khoản (FK không cascade hết), rồi xóa user.
  for (const cid of courseIds) await admin.from("courses").delete().eq("id", cid);
  for (const uid of userIds) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) console.error(`Không xóa được user ${uid}: ${error.message}`);
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
