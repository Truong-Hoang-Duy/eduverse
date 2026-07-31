// E2E Giai đoạn 4: sản phẩm cuối khóa + bình luận + AI gợi ý + RLS. Tự dọn sạch.
// Chạy trong web/:
//   node --env-file=.env.local --env-file=../ai-service/.env scripts/e2e-phase4.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_KEY = process.env.AI_SERVICE_API_KEY;
const AI_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

const ts = Date.now();
const FAKE = "eduverse.local";
const PASSWORD = "test-password-123";
const CODE = `EP${String(ts).slice(-2)}`;

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
  const gv = await makeUser(`e4.gv.${ts}`, { full_name: "GV P4", role: "teacher" });
  const teacher = gv.client;
  const { data: course } = await teacher
    .from("courses")
    .insert({ code: CODE, name: "Web Nâng cao", teacher_id: gv.id })
    .select()
    .single();
  const { data: clsA } = await teacher
    .from("classes")
    .insert({ course_id: course.id, class_code: `${CODE}01`, teacher_id: gv.id, total_sessions: 3 })
    .select()
    .single();
  // Lớp thứ 2 để test RLS khác lớp (Carol tham gia qua class_code).
  await teacher
    .from("classes")
    .insert({ course_id: course.id, class_code: `${CODE}02`, teacher_id: gv.id, total_sessions: 3 });

  const alice = await makeUser(`e4.alice.${ts}`, { full_name: "Alice", role: "student", class_code: `${CODE}01` });
  const bob = await makeUser(`e4.bob.${ts}`, { full_name: "Bob", role: "student", class_code: `${CODE}01` });
  const carol = await makeUser(`e4.carol.${ts}`, { full_name: "Carol", role: "student", class_code: `${CODE}02` });

  // 1. Alice tạo sản phẩm
  const { data: proj, error: pErr } = await alice.client
    .from("projects")
    .insert({
      student_id: alice.id,
      class_id: clsA.id,
      name: "Thư viện online",
      description: "Web quản lý mượn trả sách",
      features: ["Đăng nhập", "Tìm sách"],
      repo_url: "https://github.com/alice/lib",
    })
    .select()
    .single();
  check("Học viên tạo sản phẩm", !pErr, pErr?.message);

  // 2. UNIQUE(class_id, student_id): tạo sản phẩm thứ 2 cùng lớp bị chặn
  const { error: dupErr } = await alice.client.from("projects").insert({
    student_id: alice.id,
    class_id: clsA.id,
    name: "Trùng",
  });
  check("Mỗi HV 1 sản phẩm/lớp (unique)", dupErr?.code === "23505");

  // 3. Bob (cùng lớp) xem được sản phẩm của Alice
  const { data: bobSees } = await bob.client
    .from("projects")
    .select("id, name")
    .eq("id", proj.id);
  check("Bạn cùng lớp xem được sản phẩm", bobSees?.length === 1);

  // 4. Carol (khác lớp) KHÔNG xem được
  const { data: carolSees } = await carol.client
    .from("projects")
    .select("id")
    .eq("id", proj.id);
  check("RLS: khác lớp không xem được sản phẩm", (carolSees ?? []).length === 0);

  // 5. Bob bình luận sản phẩm Alice
  const { data: comment, error: cErr } = await bob.client
    .from("project_comments")
    .insert({ project_id: proj.id, author_id: bob.id, content: "Dự án hay!" })
    .select()
    .single();
  check("Bạn cùng lớp bình luận được", !cErr, cErr?.message);

  // 6. Carol (khác lớp) KHÔNG bình luận được
  const { error: carolCErr } = await carol.client
    .from("project_comments")
    .insert({ project_id: proj.id, author_id: carol.id, content: "hack" });
  check("RLS: khác lớp không bình luận được", !!carolCErr);

  // 7. Bob KHÔNG sửa được sản phẩm của Alice
  const { data: hackProj } = await bob.client
    .from("projects")
    .update({ name: "hacked" })
    .eq("id", proj.id)
    .select();
  check("RLS: không sửa được sản phẩm người khác", (hackProj ?? []).length === 0);

  // 8. Bob xóa được comment của chính mình
  const { error: delErr } = await bob.client
    .from("project_comments")
    .delete()
    .eq("id", comment.id);
  check("HV xóa được comment của mình", !delErr, delErr?.message);

  // 9. Giáo viên xem được sản phẩm lớp mình
  const { data: gvSees } = await teacher
    .from("projects")
    .select("id")
    .eq("class_id", clsA.id);
  check("GV xem được sản phẩm lớp mình", (gvSees ?? []).length === 1);

  // 9b. RLS: Bob KHÔNG xóa được sản phẩm của Alice (deleteProject dựa RLS này)
  await bob.client.from("projects").delete().eq("id", proj.id);
  const { data: stillThere } = await admin.from("projects").select("id").eq("id", proj.id);
  check("RLS: HV khác KHÔNG xóa được sản phẩm", (stillThere ?? []).length === 1);

  // 9c. Alice xóa được sản phẩm của chính mình (đường của nút Xóa mới thêm)
  await alice.client.from("projects").delete().eq("id", proj.id);
  const { data: gone } = await admin.from("projects").select("id").eq("id", proj.id);
  check("HV xóa được sản phẩm của mình", (gone ?? []).length === 0);

  // 9c-bis. Giới hạn nhập liệu phải do DB ép, KHÔNG chỉ `saveProject`: RLS cho HV
  // ghi thẳng dòng của mình qua API nên trước migration 20260731020000, một em ghi
  // được mô tả 200.000 ký tự / 500 chức năng và làm vỡ gallery của CẢ LỚP.
  const overLimit = [
    ["name quá dài", { name: "N".repeat(200) }],
    ["mô tả quá dài", { description: "D".repeat(2000) }],
    ["ghi chú quá dài", { extra_notes: "E".repeat(2000) }],
    ["quá nhiều chức năng", { features: Array.from({ length: 30 }, (_, i) => `cn${i}`) }],
    ["một chức năng quá dài", { features: ["x".repeat(200)] }],
    ["repo_url không phải http", { repo_url: "javascript:alert(1)" }],
    ["demo_url không phải http", { demo_url: "javascript:alert(1)" }],
    ["name rỗng", { name: "   " }],
  ];
  for (const [label, patch] of overLimit) {
    const { error } = await alice.client.from("projects").insert({
      student_id: alice.id,
      class_id: clsA.id,
      name: "Ten hop le",
      ...patch,
    });
    check(`DB chặn ${label}`, Boolean(error), error ? "" : "DB NHẬN — thiếu constraint!");
    if (!error) await admin.from("projects").delete().eq("student_id", alice.id);
  }

  // 9c-ter. Bình luận quá dài cũng phải bị DB chặn (trước đây không có giới hạn nào).
  const { data: cmtProj } = await alice.client
    .from("projects")
    .insert({ student_id: alice.id, class_id: clsA.id, name: "SP cho binh luan" })
    .select("id")
    .single();
  const { error: longCmtErr } = await bob.client.from("project_comments").insert({
    project_id: cmtProj.id,
    author_id: bob.id,
    content: "C".repeat(5000),
  });
  check("DB chặn bình luận quá dài", Boolean(longCmtErr));
  const { error: okCmtErr } = await bob.client.from("project_comments").insert({
    project_id: cmtProj.id,
    author_id: bob.id,
    content: "Nhận xét bình thường, dài vừa phải.",
  });
  check("Bình luận bình thường vẫn gửi được", !okCmtErr, okCmtErr?.message ?? "");
  await alice.client.from("projects").delete().eq("id", cmtProj.id);

  // 9d. Roster lớp (policy enrollments_classmates_select, migration 20260720000000):
  // Bob thấy cả ghi danh của Alice → gallery hiện được bạn CHƯA có sản phẩm.
  const { data: bobRoster } = await bob.client
    .from("enrollments")
    .select("student_id")
    .eq("class_id", clsA.id);
  check(
    "HV thấy ghi danh của bạn cùng lớp (roster gallery)",
    (bobRoster ?? []).length === 2,
    `thấy ${(bobRoster ?? []).length}/2 dòng`
  );

  // 9e. Join profiles của roster trả được tên bạn cùng lớp (nhánh classmate
  // trong profiles_select chỉ hoạt động khi enrollments đã mở cho bạn cùng lớp).
  const { data: bobRosterNames } = await bob.client
    .from("enrollments")
    .select("student_id, profiles(full_name)")
    .eq("class_id", clsA.id);
  const aliceRow = (bobRosterNames ?? []).find((r) => r.student_id === alice.id);
  check(
    "Roster join được tên bạn cùng lớp",
    aliceRow?.profiles?.full_name === "Alice",
    `full_name=${aliceRow?.profiles?.full_name}`
  );

  // 9f. Carol (khác lớp) KHÔNG thấy ghi danh lớp A.
  const { data: carolRoster } = await carol.client
    .from("enrollments")
    .select("student_id")
    .eq("class_id", clsA.id);
  check("RLS: khác lớp không thấy roster", (carolRoster ?? []).length === 0);

  // 10. AI gợi ý tính năng (thật)
  const res = await fetch(`${AI_URL}/suggest-features`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": AI_KEY },
    body: JSON.stringify({
      project_name: "Thư viện online",
      description: "Web quản lý mượn trả sách cho trường học",
      existing_features: ["Đăng nhập", "Tìm sách"],
      course_code: CODE,
      desired_difficulty: "easy",
    }),
  });
  const data = res.ok ? await res.json() : null;
  const ok = Boolean(
    data && Array.isArray(data.suggestions) && data.suggestions.length >= 1 &&
    data.suggestions.every((s) => s.name && ["easy", "medium", "hard"].includes(s.difficulty))
  );
  check("AI gợi ý tính năng (thật)", ok, res.ok ? "" : `HTTP ${res.status}`);
  if (data) {
    console.log("   → " + data.suggestions.map((s) => `${s.name} (${s.difficulty})`).join(", "));
  }
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
