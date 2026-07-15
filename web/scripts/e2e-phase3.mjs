// E2E Chấm bài (luồng mới: độc lập, không theo lớp, không lưu kết quả).
// Yêu cầu ai-service chạy ở localhost:8000. Chạy trong web/:
//   node --env-file=.env.local --env-file=../ai-service/.env scripts/e2e-phase3.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_KEY = process.env.AI_SERVICE_API_KEY;
const AI_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

const ts = Date.now();
const FAKE = "eduverse.local";
const PASSWORD = "test-password-123";
const COURSE_CODE = `EG${String(ts).slice(-2)}`;

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false } });
const results = [];
const userIds = [];
const specPaths = [];

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
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  const client = createClient(URL, ANON);
  await client.auth.signInWithPassword({
    email: `${username}@${FAKE}`,
    password: PASSWORD,
  });
  return { client, id: data.user.id };
}

/** Gọi ai-service đúng như Server Action gradeFiles làm. */
async function grade(specPath, files, title = "Tính tổng hai số") {
  const res = await fetch(`${AI_URL}/grade-submission`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": AI_KEY },
    body: JSON.stringify({
      spec_file_path: specPath,
      files: files.map((f) => ({
        name: f.name,
        mime_type: f.mime ?? null,
        content_b64: Buffer.from(f.content, "utf8").toString("base64"),
      })),
      course_name: "JavaScript Basic",
      assignment_title: title,
      instructions: null,
    }),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? await res.json() : null };
}

async function main() {
  const gv = await makeUser(`e3g.gv.${ts}`, { full_name: "GV P3", role: "teacher" });
  const teacher = gv.client;

  const { data: course } = await teacher
    .from("courses")
    .insert({ code: COURSE_CODE, name: "JavaScript Basic", teacher_id: gv.id })
    .select()
    .single();

  // 1. Upload file đề — thứ DUY NHẤT được lưu
  const specPath = `${course.id}/de-buoi-1.md`;
  specPaths.push(specPath);
  const spec = [
    "# Đề bài buổi 1: Tính tổng",
    "Viết chương trình JavaScript:",
    "1. Khai báo 2 biến a=5, b=7 bằng let hoặc const",
    "2. Tính tổng và in ra console dạng `Tong: 12`",
    "3. Đặt tên biến rõ nghĩa",
  ].join("\n");
  const { error: upErr } = await teacher.storage
    .from("assignment-specs")
    .upload(specPath, new Blob([spec], { type: "text/markdown" }));
  check("GV upload file đề lên Storage", !upErr, upErr?.message);

  // 2. Lưu đề (khóa + buổi)
  const { data: assignment, error: aErr } = await teacher
    .from("assignments")
    .insert({
      course_id: course.id,
      session_number: 1,
      title: "Tính tổng hai số",
      spec_file_path: specPath,
    })
    .select()
    .single();
  check("GV lưu đề bài", !aErr, aErr?.message);

  const { error: dupErr } = await teacher.from("assignments").insert({
    course_id: course.id,
    session_number: 1,
    title: "Đề trùng buổi",
  });
  check("Mỗi buổi một đề (unique) — đề trùng bị chặn", dupErr?.code === "23505");

  // Chụp số dòng TRƯỚC khi chấm — bảng có thể còn dữ liệu cũ từ UI chấm bài cũ,
  // nên phải đo THAY ĐỔI chứ không đòi bảng rỗng.
  const countRows = async (table) => {
    const { count } = await admin.from(table).select("id", { count: "exact", head: true });
    return count ?? 0;
  };
  const before = {
    submissions: await countRows("submissions"),
    grades: await countRows("grades"),
  };

  // 3. Chấm bài TỐT — file gửi inline, không qua Storage
  const good = await grade(specPath, [
    {
      name: "bai-lam.js",
      mime: "text/javascript",
      content: [
        "const soThuNhat = 5;",
        "const soThuHai = 7;",
        "const tong = soThuNhat + soThuHai;",
        "console.log(`Tong: ${tong}`);",
      ].join("\n"),
    },
  ]);
  const goodOk =
    good.ok &&
    Number.isInteger(good.body.score) &&
    good.body.score >= 0 &&
    good.body.score <= 100 &&
    Array.isArray(good.body.bullets) &&
    good.body.bullets.length > 0;
  check("AI chấm bài tốt (file inline)", goodOk, good.ok ? "" : `HTTP ${good.status}`);
  if (good.body) {
    console.log(`   → Điểm: ${good.body.score}/100, ${good.body.bullets.length} gạch đầu dòng`);
    good.body.bullets.forEach((b) => console.log(`     • ${b}`));
  }

  // 4. Nhận xét phải NGẮN GỌN và không tự thêm dấu gạch đầu dòng
  if (good.body) {
    const bullets = good.body.bullets;
    check(
      "Bullets ngắn gọn (mỗi ý < 300 ký tự)",
      bullets.every((b) => b.length < 300)
    );
    check(
      "Bullets không tự thêm ký tự '-' hoặc '•' ở đầu",
      bullets.every((b) => !/^\s*[-•*]/.test(b))
    );
  }

  // 5. Chấm bài KÉM → điểm phải thấp hơn bài tốt
  const bad = await grade(specPath, [
    { name: "bai-lam.js", mime: "text/javascript", content: "console.log('hello');" },
  ]);
  check(
    "Bài thiếu yêu cầu bị điểm thấp hơn bài tốt",
    bad.ok && good.body && bad.body.score < good.body.score,
    bad.ok ? `tốt=${good.body?.score} vs kém=${bad.body?.score}` : `HTTP ${bad.status}`
  );

  // 6. Không lưu gì: số dòng submissions/grades KHÔNG tăng sau khi chấm
  const after = {
    submissions: await countRows("submissions"),
    grades: await countRows("grades"),
  };
  check(
    "Chấm bài không ghi DB (submissions/grades không tăng)",
    after.submissions === before.submissions && after.grades === before.grades,
    `submissions ${before.submissions}→${after.submissions}, grades ${before.grades}→${after.grades}`
  );

  // 7. Đề sai đường dẫn → báo lỗi rõ ràng, không crash
  const missing = await grade("khong-ton-tai/de.md", [
    { name: "a.js", mime: "text/javascript", content: "console.log(1);" },
  ]);
  check("File đề không tồn tại → 404, không crash", missing.status === 404);

  // 8. Thiếu file bài làm → 422 (schema chặn)
  const empty = await grade(specPath, []);
  check("Không có file bài làm → 422", empty.status === 422);

  console.log(`   (đề bài vẫn còn: assignment id ${assignment.id})`);
}

async function cleanup() {
  if (specPaths.length) await admin.storage.from("assignment-specs").remove(specPaths);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  await admin.from("courses").delete().eq("code", COURSE_CODE);
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
