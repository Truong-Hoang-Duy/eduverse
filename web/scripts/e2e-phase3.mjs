// E2E Giai đoạn 3: đề bài + bài nộp + chấm AI THẬT (Gemini) + RLS. Tự dọn sạch.
// Yêu cầu: ai-service chạy ở localhost:8000. Chạy trong web/:
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
const subPaths = [];

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

async function main() {
  const gv = await makeUser(`e3g.gv.${ts}`, { full_name: "GV P3", role: "teacher" });
  const teacher = gv.client;

  const { data: course } = await teacher
    .from("courses")
    .insert({ code: COURSE_CODE, name: "JavaScript Basic", teacher_id: gv.id })
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
  const hv = await makeUser(`e3g.hv.${ts}`, {
    full_name: "HV P3",
    role: "student",
    class_code: `${COURSE_CODE}01`,
  });

  // 1. GV upload file đề lên bucket assignment-specs
  const specPath = `${course.id}/de-buoi-1.md`;
  specPaths.push(specPath);
  const specContent = [
    "# Đề bài buổi 1: Tính tổng",
    "Viết chương trình JavaScript:",
    "1. Khai báo 2 biến a=5, b=7 bằng let hoặc const (2đ... tổng 100 điểm)",
    "2. Tính tổng và in ra console dạng `Tong: 12`",
    "3. Đặt tên biến rõ nghĩa",
  ].join("\n");
  const { error: upSpecErr } = await teacher.storage
    .from("assignment-specs")
    .upload(specPath, new Blob([specContent], { type: "text/markdown" }));
  check("GV upload file đề lên Storage", !upSpecErr, upSpecErr?.message);

  // 2. Tạo assignment; đề thứ 2 cùng buổi phải bị chặn (unique)
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
  check("GV tạo đề bài", !aErr, aErr?.message);

  const { error: dupErr } = await teacher.from("assignments").insert({
    course_id: course.id,
    session_number: 1,
    title: "Đề trùng buổi",
  });
  check("Mỗi buổi một đề (unique) — đề trùng bị chặn", dupErr?.code === "23505");

  // 3. GV upload bài làm của học viên (bài TỐT)
  const codePath = `${assignment.id}/${hv.id}/bai-lam.js`;
  subPaths.push(codePath);
  const goodCode = [
    "const soThuNhat = 5;",
    "const soThuHai = 7;",
    "const tong = soThuNhat + soThuHai;",
    "console.log(`Tong: ${tong}`);",
  ].join("\n");
  const { error: upCodeErr } = await teacher.storage
    .from("submissions")
    .upload(codePath, new Blob([goodCode], { type: "text/javascript" }));
  check("GV upload bài làm học viên", !upCodeErr, upCodeErr?.message);

  const { data: submission, error: subErr } = await teacher
    .from("submissions")
    .upsert(
      {
        assignment_id: assignment.id,
        class_id: cls.id,
        student_id: hv.id,
        code_file_paths: [codePath],
        uploaded_by: gv.id,
      },
      { onConflict: "assignment_id,student_id" }
    )
    .select()
    .single();
  check("Lưu submission", !subErr, subErr?.message);

  // 4. RLS: học viên KHÔNG đọc được file trong 2 bucket
  const { data: stuDownload } = await hv.client.storage
    .from("assignment-specs")
    .download(specPath)
    .catch(() => ({ data: null }));
  check("RLS Storage chặn học viên tải file đề", !stuDownload);

  // 5. Chấm AI THẬT qua ai-service (Gemini đọc đề + code)
  const res = await fetch(`${AI_URL}/grade-submission`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": AI_KEY },
    body: JSON.stringify({
      spec_file_path: specPath,
      code_file_paths: [codePath],
      course_name: "JavaScript Basic",
      assignment_title: "Tính tổng hai số",
      instructions: null,
      student_name: "HV P3",
    }),
  });
  const grade = res.ok ? await res.json() : null;
  check(
    "AI chấm bài thật (Gemini multimodal)",
    Boolean(grade && grade.score >= 0 && grade.score <= 100 && grade.comment),
    res.ok ? "" : `HTTP ${res.status}`
  );
  if (grade) {
    const sumMax = grade.criteria_breakdown.reduce((s, c) => s + c.max, 0);
    check(`Tổng max tiêu chí = 100 (thực tế ${sumMax})`, sumMax === 100);
    console.log(
      `   → Điểm: ${grade.score}/100 | ${grade.criteria_breakdown
        .map((c) => `${c.criterion}: ${c.score}/${c.max}`)
        .join(" | ")}`
    );
    console.log(`   → Nhận xét: ${grade.comment.slice(0, 160)}...`);

    // 6. Lưu grade + học viên chỉ xem điểm CỦA MÌNH, không sửa được
    const { data: savedGrade, error: gErr } = await teacher
      .from("grades")
      .upsert(
        {
          submission_id: submission.id,
          score: grade.score,
          criteria_breakdown: grade.criteria_breakdown,
          ai_comment: grade.comment,
        },
        { onConflict: "submission_id" }
      )
      .select()
      .single();
    check("Lưu điểm vào bảng grades", !gErr, gErr?.message);

    const { error: editErr } = await teacher
      .from("grades")
      .update({ score: 95, ai_comment: "GV sửa tay" })
      .eq("id", savedGrade.id);
    check("GV sửa tay điểm", !editErr, editErr?.message);

    const { data: myGrade } = await hv.client
      .from("grades")
      .select("score")
      .eq("submission_id", submission.id);
    check("HV xem được điểm của mình (đã sửa = 95)", myGrade?.[0]?.score === 95);

    const { data: hacked } = await hv.client
      .from("grades")
      .update({ score: 100 })
      .eq("id", savedGrade.id)
      .select();
    check("RLS chặn HV tự sửa điểm", (hacked ?? []).length === 0);
  }
}

async function cleanup() {
  if (specPaths.length) await admin.storage.from("assignment-specs").remove(specPaths);
  if (subPaths.length) await admin.storage.from("submissions").remove(subPaths);
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
