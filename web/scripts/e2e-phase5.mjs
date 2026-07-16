// E2E Giai đoạn 5: random nhóm thuyết trình (chia đều, lưu/ghi đè, RLS). Tự dọn.
// Chạy trong web/: node --env-file=.env.local scripts/e2e-phase5.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ts = Date.now();
const FAKE = "eduverse.local";
const PASSWORD = "test-password-123";
const CODE = `EQ${String(ts).slice(-2)}`;

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

// Cùng thuật toán chia trong group-randomizer.tsx
function buildGroups(members, count) {
  const groups = Array.from({ length: count }, (_, i) => ({
    name: `Nhóm ${i + 1}`,
    members: [],
  }));
  members.forEach((m, i) => groups[i % count].members.push(m));
  return groups;
}

async function main() {
  const gv = await makeUser(`e5.gv.${ts}`, { full_name: "GV P5", role: "teacher" });
  const teacher = gv.client;
  const { data: course } = await teacher
    .from("courses")
    .insert({ code: CODE, name: "Khóa P5", teacher_id: gv.id })
    .select()
    .single();
  const { data: clsA } = await teacher
    .from("classes")
    .insert({ course_id: course.id, class_code: `${CODE}01`, teacher_id: gv.id, total_sessions: 3 })
    .select()
    .single();
  const { data: clsB } = await teacher
    .from("classes")
    .insert({ course_id: course.id, class_code: `${CODE}02`, teacher_id: gv.id, total_sessions: 3 })
    .select()
    .single();

  // 5 học viên lớp A, 1 học viên lớp B
  const students = [];
  for (const name of ["An", "Binh", "Chi", "Dung", "Em"]) {
    const s = await makeUser(`e5.${name.toLowerCase()}.${ts}`, {
      full_name: name,
      role: "student",
      class_code: `${CODE}01`,
    });
    students.push({ id: s.id, name, client: s.client });
  }
  const outsider = await makeUser(`e5.out.${ts}`, {
    full_name: "Outsider",
    role: "student",
    class_code: `${CODE}02`,
  });

  const members = students.map((s) => ({ id: s.id, name: s.name }));

  // 1. Chia 5 người vào 2 nhóm → chênh nhau tối đa 1 (3 và 2)
  const g2 = buildGroups(members, 2);
  const sizes = g2.map((g) => g.members.length).sort();
  check("Chia đều: 5 HV / 2 nhóm → 2+3", sizes[0] === 2 && sizes[1] === 3);

  // 2. Không mất/trùng học viên
  const allIds = g2.flatMap((g) => g.members.map((m) => m.id));
  check(
    "Không mất/trùng học viên khi chia",
    allIds.length === 5 && new Set(allIds).size === 5
  );

  // 3. GV lưu kết quả
  const { error: saveErr } = await teacher.from("presentation_groups").upsert(
    { class_id: clsA.id, groups: g2 },
    { onConflict: "class_id" }
  );
  check("GV lưu kết quả chia nhóm", !saveErr, saveErr?.message);

  // 4. Random lại + lưu → GHI ĐÈ (vẫn 1 dòng/lớp)
  const g3 = buildGroups(members, 3);
  const { error: overErr } = await teacher.from("presentation_groups").upsert(
    { class_id: clsA.id, groups: g3, updated_at: new Date().toISOString() },
    { onConflict: "class_id" }
  );
  const { data: rows } = await teacher
    .from("presentation_groups")
    .select("groups")
    .eq("class_id", clsA.id);
  check(
    "Lưu lại ghi đè, mỗi lớp 1 kết quả",
    !overErr && rows?.length === 1 && rows[0].groups.length === 3,
    overErr?.message
  );

  // 5. HV trong lớp xem được nhóm của mình
  const { data: stuSees } = await students[0].client
    .from("presentation_groups")
    .select("groups")
    .eq("class_id", clsA.id);
  check("HV trong lớp xem được kết quả", stuSees?.length === 1);

  // 6. HV lớp khác KHÔNG xem được
  const { data: outSees } = await outsider.client
    .from("presentation_groups")
    .select("groups")
    .eq("class_id", clsA.id);
  check("RLS: HV lớp khác không xem được", (outSees ?? []).length === 0);

  // 7. HV KHÔNG tự sửa được kết quả
  const { data: hacked } = await students[0].client
    .from("presentation_groups")
    .update({ groups: [] })
    .eq("class_id", clsA.id)
    .select();
  check("RLS: HV không sửa được kết quả", (hacked ?? []).length === 0);

  // 8. Xóa lớp → cascade xóa kết quả nhóm
  await teacher.from("classes").delete().eq("id", clsB.id);
  const { data: afterDel } = await admin
    .from("presentation_groups")
    .select("id")
    .eq("class_id", clsB.id);
  check("Xóa lớp → cascade xóa kết quả nhóm", (afterDel ?? []).length === 0);
}

async function cleanup() {
  // Khóa học TRƯỚC, tài khoản SAU: student_reviews.created_by trỏ tới profiles mà
  // KHÔNG có on delete cascade → còn nhận xét là xóa GV không nổi, và
  // deleteUser nuốt lỗi nên tài khoản rác nằm lại im ru trong auth.
  await admin.from("courses").delete().eq("code", CODE);
  for (const id of userIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error(`Không xóa được user ${id}: ${error.message}`);
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
