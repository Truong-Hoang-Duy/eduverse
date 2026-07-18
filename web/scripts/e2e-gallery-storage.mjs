// E2E: GV xem/nhận xét sản phẩm học viên + xóa đề/khóa phải dọn sạch file Storage.
// Chạy trong web/: node --env-file=.env.local scripts/e2e-gallery-storage.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ts = Date.now();
const FAKE = "eduverse.local";
const PASSWORD = "test-password-123";
const CODE = `GA${String(ts).slice(-2)}`;
const CODE2 = `GB${String(ts).slice(-2)}`;
const BUCKET = "assignment-specs";

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false } });
const results = [];
const userIds = [];
const uploadedPaths = [];

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

/** Tạo đề kèm file thật trong bucket, mô phỏng createAssignment. */
async function makeAssignment(teacher, courseId, sessionNumber, body) {
  const path = `${courseId}/${Date.now()}-de-buoi-${sessionNumber}.txt`;
  const { error: upErr } = await teacher.storage
    .from(BUCKET)
    .upload(path, new Blob([body], { type: "text/plain" }));
  if (upErr) throw new Error(`upload ${path}: ${upErr.message}`);
  uploadedPaths.push(path);

  const { data, error } = await teacher
    .from("assignments")
    .insert({
      course_id: courseId,
      session_number: sessionNumber,
      title: `Đề buổi ${sessionNumber}`,
      spec_file_path: path,
    })
    .select()
    .single();
  if (error) throw new Error(`insert assignment: ${error.message}`);
  return { assignment: data, path };
}

/** File còn trong bucket không? Dùng service key để nhìn xuyên RLS. */
async function fileExists(path) {
  const { data } = await admin.storage.from(BUCKET).download(path);
  return Boolean(data);
}

async function main() {
  const gv = await makeUser(`ga.gv.${ts}`, { full_name: "GV Gallery", role: "teacher" });
  const teacher = gv.client;
  const gv2 = await makeUser(`ga.gv2.${ts}`, { full_name: "GV Khác", role: "teacher" });
  const other = gv2.client;

  const { data: course } = await teacher
    .from("courses")
    .insert({ code: CODE, name: "Khóa Gallery", teacher_id: gv.id })
    .select()
    .single();
  const { data: cls } = await teacher
    .from("classes")
    .insert({
      course_id: course.id,
      class_code: `${CODE}01`,
      teacher_id: gv.id,
      total_sessions: 2,
    })
    .select()
    .single();

  const hv = await makeUser(`ga.hv.${ts}`, {
    full_name: "Lê Học Viên",
    role: "student",
    class_code: `${CODE}01`,
  });

  const { data: project } = await hv.client
    .from("projects")
    .insert({
      student_id: hv.id,
      class_id: cls.id,
      name: "Game rắn săn mồi",
      description: "Viết bằng JS",
      features: ["Di chuyển", "Tính điểm"],
    })
    .select()
    .single();

  // ---------- 1. GV xem sản phẩm ----------
  const { data: seen } = await teacher
    .from("projects")
    .select("id, name")
    .eq("id", project.id);
  check("GV xem được sản phẩm của lớp mình", seen?.length === 1);

  const { data: seenByOther } = await other
    .from("projects")
    .select("id")
    .eq("id", project.id);
  check("GV lớp khác KHÔNG xem được sản phẩm", (seenByOther ?? []).length === 0);

  // ---------- 2. GV nhận xét ----------
  const { data: gvComment, error: gvCommentErr } = await teacher
    .from("project_comments")
    .insert({ project_id: project.id, author_id: gv.id, content: "Em làm tốt lắm!" })
    .select()
    .single();
  check("GV nhận xét được sản phẩm của em", !gvCommentErr && Boolean(gvComment), gvCommentErr?.message);

  const { error: otherCommentErr } = await other
    .from("project_comments")
    .insert({ project_id: project.id, author_id: gv2.id, content: "Xen ngang" });
  check("GV lớp khác KHÔNG nhận xét được", Boolean(otherCommentErr));

  // HV thấy nhận xét của GV
  const { data: hvSees } = await hv.client
    .from("project_comments")
    .select("id, content")
    .eq("project_id", project.id);
  check(
    "Học viên đọc được nhận xét của GV",
    hvSees?.some((c) => c.id === gvComment.id)
  );

  // ---------- 3. Chỉ CHỦ nhận xét mới xóa được (policy
  // project_comments_delete_own, migration 20260721000000 — hết moderation) ----------
  const { data: hvComment } = await hv.client
    .from("project_comments")
    .insert({ project_id: project.id, author_id: hv.id, content: "Tự khen mình" })
    .select()
    .single();
  await teacher.from("project_comments").delete().eq("id", hvComment.id);
  const { data: afterGvDelete } = await admin
    .from("project_comments")
    .select("id")
    .eq("id", hvComment.id);
  check("GV KHÔNG xóa được nhận xét của học viên", (afterGvDelete ?? []).length === 1);

  await hv.client.from("project_comments").delete().eq("id", hvComment.id);
  const { data: afterOwnDelete } = await admin
    .from("project_comments")
    .select("id")
    .eq("id", hvComment.id);
  check("HV xóa được nhận xét của chính mình", (afterOwnDelete ?? []).length === 0);

  // ---------- 4. Xóa đề → file trong Storage cũng phải mất ----------
  const { assignment: a1, path: p1 } = await makeAssignment(
    teacher,
    course.id,
    1,
    "Đề buổi 1: in ra dãy Fibonacci"
  );
  check("Tạo đề + upload file đề thành công", await fileExists(p1));

  // GV đọc lại được nội dung đề (nền tảng của nút "Xem đề")
  const { data: specBlob } = await teacher.storage.from(BUCKET).download(p1);
  const specText = specBlob ? await specBlob.text() : "";
  check(
    "GV đọc được nội dung file đề để xem trên giao diện",
    specText.includes("Fibonacci"),
    specText.slice(0, 40)
  );

  // Mô phỏng deleteAssignment: xóa file TRƯỚC rồi xóa dòng
  await teacher.storage.from(BUCKET).remove([p1]);
  await teacher.from("assignments").delete().eq("id", a1.id);
  const { data: rowGone } = await admin
    .from("assignments")
    .select("id")
    .eq("id", a1.id);
  check("Xóa đề: dòng trong DB biến mất", (rowGone ?? []).length === 0);
  check("Xóa đề: file trong Storage cũng biến mất", !(await fileExists(p1)));

  // ---------- 5. Xóa khóa → cascade dòng + dọn mọi file đề ----------
  const { path: p2 } = await makeAssignment(teacher, course.id, 2, "Đề buổi 2");
  const { data: course2 } = await teacher
    .from("courses")
    .insert({ code: CODE2, name: "Khóa 2", teacher_id: gv.id })
    .select()
    .single();
  const { path: pOther } = await makeAssignment(teacher, course2.id, 1, "Đề khóa khác");

  // Mô phỏng deleteCourse: gom path của khóa rồi xóa khóa + file
  const { data: specRows } = await teacher
    .from("assignments")
    .select("spec_file_path")
    .in("course_id", [course.id]);
  const paths = (specRows ?? []).map((r) => r.spec_file_path).filter(Boolean);
  check("Gom đúng file đề của khóa sắp xóa", paths.length === 1 && paths[0] === p2);

  await teacher.from("courses").delete().eq("id", course.id);
  await teacher.storage.from(BUCKET).remove(paths);

  const { data: cascaded } = await admin
    .from("assignments")
    .select("id")
    .eq("course_id", course.id);
  check("Xóa khóa: đề bài cascade theo", (cascaded ?? []).length === 0);
  check("Xóa khóa: file đề trong Storage cũng bị dọn", !(await fileExists(p2)));
  check("Xóa khóa: KHÔNG đụng file đề của khóa khác", await fileExists(pOther));

  // Lớp + sản phẩm + nhận xét cũng phải cascade sạch theo khóa
  const { data: clsGone } = await admin.from("classes").select("id").eq("id", cls.id);
  const { data: projGone } = await admin
    .from("projects")
    .select("id")
    .eq("id", project.id);
  const { data: cmtGone } = await admin
    .from("project_comments")
    .select("id")
    .eq("project_id", project.id);
  check("Xóa khóa: lớp cascade theo", (clsGone ?? []).length === 0);
  check("Xóa khóa: sản phẩm cascade theo", (projGone ?? []).length === 0);
  check("Xóa khóa: nhận xét cascade theo", (cmtGone ?? []).length === 0);
}

async function cleanup() {
  // Dọn file trước: xóa khóa xong là mất đường tra path.
  const leftovers = [];
  for (const p of uploadedPaths) {
    if (await fileExists(p)) leftovers.push(p);
  }
  if (leftovers.length) await admin.storage.from(BUCKET).remove(leftovers);

  for (const c of [CODE, CODE2]) {
    await admin.from("courses").delete().eq("code", c);
  }
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
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
