// E2E Giai đoạn 2: buổi học + nhận xét + danh mục + mẫu Zalo (DB thật, tự dọn).
// Chạy: node --env-file=.env.local scripts/e2e-phase2.mjs  (cwd = web/)
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ts = Date.now();
const FAKE = "eduverse.local";
const PASSWORD = "test-password-123";
const COURSE_CODE = `EF${String(ts).slice(-2)}`;

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
  const gv = await makeUser(`e2f.gv.${ts}`, {
    full_name: "GV P2",
    role: "teacher",
  });
  const teacher = gv.client;

  const { data: course } = await teacher
    .from("courses")
    .insert({ code: COURSE_CODE, name: "Khóa P2", teacher_id: gv.id })
    .select()
    .single();
  const { data: cls } = await teacher
    .from("classes")
    .insert({
      course_id: course.id,
      class_code: `${COURSE_CODE}01`,
      teacher_id: gv.id,
      total_sessions: 3,
    })
    .select()
    .single();

  const hv = await makeUser(`e2f.hv.${ts}`, {
    full_name: "HV P2",
    role: "student",
    class_code: `${COURSE_CODE}01`,
  });
  const student = hv.client;

  // 1. GV điền nội dung buổi 1
  const { data: sessions } = await teacher
    .from("sessions")
    .select("id, session_number")
    .eq("class_id", cls.id)
    .order("session_number");
  const session1 = sessions[0];
  const { error: updErr } = await teacher
    .from("sessions")
    .update({
      title: "Biến và kiểu dữ liệu",
      content: "Học let/const, number, string",
      session_date: "2026-07-15",
    })
    .eq("id", session1.id);
  check("GV cập nhật nội dung buổi học", !updErr, updErr?.message);

  // 2. Danh mục nhận xét
  const { error: optErr } = await teacher.from("review_options").insert([
    { teacher_id: gv.id, category: "strength", label: "Tiếp thu nhanh" },
    { teacher_id: gv.id, category: "improvement", label: "Cần tập trung hơn" },
  ]);
  check("GV thêm danh mục nhận xét", !optErr, optErr?.message);

  // 3. Lưu nhận xét học viên (upsert 2 lần — lần 2 ghi đè)
  const { error: rev1Err } = await teacher.from("student_reviews").upsert(
    {
      session_id: session1.id,
      student_id: hv.id,
      strengths: ["Tiếp thu nhanh"],
      improvements: ["Cần tập trung hơn"],
      ai_generated_comment: "Nhận xét lần 1",
      created_by: gv.id,
    },
    { onConflict: "session_id,student_id" }
  );
  const { error: rev2Err } = await teacher.from("student_reviews").upsert(
    {
      session_id: session1.id,
      student_id: hv.id,
      strengths: ["Tiếp thu nhanh"],
      improvements: [],
      ai_generated_comment: "Nhận xét đã sửa",
      created_by: gv.id,
    },
    { onConflict: "session_id,student_id" }
  );
  check("GV lưu + ghi đè nhận xét (upsert)", !rev1Err && !rev2Err, rev1Err?.message ?? rev2Err?.message);

  // 4. FK join dùng trong generateZaloSummary phải hoạt động
  const { data: joined, error: joinErr } = await teacher
    .from("student_reviews")
    .select(
      "strengths, improvements, profiles!student_reviews_student_id_fkey(full_name)"
    )
    .eq("session_id", session1.id);
  check(
    "FK join student_reviews → profiles (cho tin Zalo)",
    !joinErr && joined?.[0]?.profiles?.full_name === "HV P2",
    joinErr?.message
  );

  // 5. Mẫu Zalo
  const { error: tplErr } = await teacher.from("zalo_templates").insert({
    teacher_id: gv.id,
    name: "Mẫu test",
    template_text: "Lớp {ten_lop} {buoi}: {tom_tat} — {loi_nhan}",
  });
  check("GV tạo mẫu tin Zalo", !tplErr, tplErr?.message);

  // 6. RLS phía học viên
  const { data: stuSessions } = await student
    .from("sessions")
    .select("title")
    .eq("class_id", cls.id);
  check("HV xem được buổi học lớp mình", stuSessions?.length === 3);

  const { data: myReview } = await student
    .from("student_reviews")
    .select("ai_generated_comment")
    .eq("student_id", hv.id);
  check(
    "HV xem được nhận xét CỦA MÌNH",
    myReview?.[0]?.ai_generated_comment === "Nhận xét đã sửa"
  );

  const { data: stuOptions } = await student.from("review_options").select("id");
  check("RLS ẩn danh mục nhận xét với HV", (stuOptions ?? []).length === 0);

  const { data: stuTpl } = await student.from("zalo_templates").select("id");
  check("RLS ẩn mẫu Zalo với HV", (stuTpl ?? []).length === 0);

  const { data: hackReview } = await student
    .from("student_reviews")
    .update({ ai_generated_comment: "hacked" })
    .eq("student_id", hv.id)
    .select();
  check("RLS chặn HV sửa nhận xét", (hackReview ?? []).length === 0);
}

async function cleanup() {
  // Khóa học TRƯỚC, tài khoản SAU: student_reviews.created_by trỏ tới profiles mà
  // KHÔNG có on delete cascade → còn nhận xét là xóa GV không nổi, và
  // deleteUser nuốt lỗi nên tài khoản rác nằm lại im ru trong auth.
  await admin.from("courses").delete().eq("code", COURSE_CODE);
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
