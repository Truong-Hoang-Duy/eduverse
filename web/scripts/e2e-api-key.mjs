// E2E: API key riêng từng người — lưu/đọc/xóa + RLS (không ai đọc key của ai).
// Chạy trong web/: node --env-file=.env.local scripts/e2e-api-key.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ts = Date.now();
const FAKE = "eduverse.local";
const PASSWORD = "test-password-123";
const CODE = `EK${String(ts).slice(-2)}`;

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
  const gv = await makeUser(`ek.gv.${ts}`, { full_name: "GV Key", role: "teacher" });
  const { data: course } = await gv.client
    .from("courses")
    .insert({ code: CODE, name: "Khóa Key", teacher_id: gv.id })
    .select()
    .single();
  await gv.client.from("classes").insert({
    course_id: course.id,
    class_code: `${CODE}01`,
    teacher_id: gv.id,
    total_sessions: 3,
  });
  const hv = await makeUser(`ek.hv.${ts}`, {
    full_name: "HV Key",
    role: "student",
    class_code: `${CODE}01`,
  });

  const GV_KEY = "AIzaSyTEACHER_kkkkkkkkkkkkkkkkkkkkkkkkk";
  const HV_KEY = "AIzaSySTUDENT_sssssssssssssssssssssssss";

  // 1. Mỗi người tự lưu key của mình
  const { error: e1 } = await gv.client
    .from("user_secrets")
    .upsert({ user_id: gv.id, gemini_api_key: GV_KEY }, { onConflict: "user_id" });
  const { error: e2 } = await hv.client
    .from("user_secrets")
    .upsert({ user_id: hv.id, gemini_api_key: HV_KEY }, { onConflict: "user_id" });
  check("GV và HV tự lưu key của mình", !e1 && !e2, e1?.message ?? e2?.message);

  // 2. Đọc lại đúng key của mình
  const { data: gvRead } = await gv.client
    .from("user_secrets")
    .select("gemini_api_key")
    .eq("user_id", gv.id)
    .maybeSingle();
  check("Đọc lại đúng key của mình", gvRead?.gemini_api_key === GV_KEY);

  // 3. RLS: GV KHÔNG đọc được key của học viên (điểm bảo mật chính)
  const { data: gvSeesHv } = await gv.client
    .from("user_secrets")
    .select("gemini_api_key")
    .eq("user_id", hv.id);
  check("RLS: GV không đọc được key của HV", (gvSeesHv ?? []).length === 0);

  // 4. RLS: HV KHÔNG đọc được key của GV
  const { data: hvSeesGv } = await hv.client
    .from("user_secrets")
    .select("gemini_api_key")
    .eq("user_id", gv.id);
  check("RLS: HV không đọc được key của GV", (hvSeesGv ?? []).length === 0);

  // 5. RLS: select toàn bảng chỉ ra đúng 1 dòng của mình
  const { data: allRows } = await gv.client.from("user_secrets").select("user_id");
  check(
    "Select toàn bảng chỉ thấy dòng của mình",
    allRows?.length === 1 && allRows[0].user_id === gv.id
  );

  // 6. RLS: không ghi đè được key người khác
  const { data: hacked } = await hv.client
    .from("user_secrets")
    .update({ gemini_api_key: "AIzaHACKED" })
    .eq("user_id", gv.id)
    .select();
  const { data: stillGv } = await gv.client
    .from("user_secrets")
    .select("gemini_api_key")
    .eq("user_id", gv.id)
    .maybeSingle();
  check(
    "RLS: không sửa được key người khác",
    (hacked ?? []).length === 0 && stillGv?.gemini_api_key === GV_KEY
  );

  // 7. Xóa key của mình → quay về dùng key hệ thống (null)
  await gv.client.from("user_secrets").delete().eq("user_id", gv.id);
  const { data: afterDel } = await gv.client
    .from("user_secrets")
    .select("gemini_api_key")
    .eq("user_id", gv.id)
    .maybeSingle();
  check("Xóa key → không còn dòng (fallback key hệ thống)", !afterDel);

  // 8. Xóa tài khoản → cascade xóa key
  await admin.auth.admin.deleteUser(hv.id);
  userIds.splice(userIds.indexOf(hv.id), 1);
  const { data: orphan } = await admin
    .from("user_secrets")
    .select("user_id")
    .eq("user_id", hv.id);
  check("Xóa tài khoản → cascade xóa key", (orphan ?? []).length === 0);
}

async function cleanup() {
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  await admin.from("courses").delete().eq("code", CODE);
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
