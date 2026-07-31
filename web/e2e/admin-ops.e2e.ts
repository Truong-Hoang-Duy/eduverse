// E2E trang vận hành `/teacher/admin` — trước đây KHÔNG có test tự động nào,
// chỉ lint/typecheck/build + bấm tay (nợ kỹ thuật từ Đợt 18).
//
// Vì sao khu này đáng test nhất: nó chạy bằng SERVICE ROLE, tức bỏ qua RLS —
// không còn lưới an toàn nào phía dưới, mọi ràng buộc nằm hết trong
// `denyIfNotAdmin()` và `requireAdmin()`. Sai một dòng ở đó là bất kỳ giáo viên
// nào cũng xóa được tài khoản và file của người khác.
//
// Chạy: pnpm test:e2e (cần .env.local + mạng). Dữ liệu tự tạo, tự dọn.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cleanupOrphanSpecFiles,
  confirmUserEmail,
  purgeTestUsers,
} from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/admin-access";
import { buildOpsReport, findOrphanSpecFiles } from "@/lib/admin-report";
import { SPEC_BUCKET } from "@/lib/spec-storage";

import {
  admin,
  cleanupAll,
  clientFor,
  createUser,
  emailOf,
  expectRedirect,
  forgetTracked,
  runAs,
  signIn,
  TEST_PASSWORD,
  trackCourseCode,
  trackFile,
  trackUser,
  uniqueSuffix,
  type TestUser,
} from "./_harness";

const ts = uniqueSuffix();
const COURSE_CODE = `AO${String(ts).slice(-4)}`;

/**
 * Bù giờ để giả làm file CŨ. `findOrphanSpecFiles` chừa 1 giờ ân hạn cho file
 * vừa upload (`createAssignment` upload TRƯỚC rồi mới insert dòng), nên trong
 * một lần chạy test không thể có file đủ già theo giờ thật.
 */
const PAST_GRACE_MS = 2 * 60 * 60 * 1000;

/**
 * File còn trong bucket không — hỏi qua `list()` (metadata nằm trong Postgres,
 * nhất quán mạnh) chứ KHÔNG qua `download()`: đường tải đi qua CDN nên có thể
 * trả bản cũ sau khi xóa, và đó đúng là kiểu đọc lệch đã làm
 * `e2e-gallery-storage` flake nhiều lần.
 */
async function fileExists(path: string): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  const { data } = await admin()
    .storage.from(SPEC_BUCKET)
    .list(path.slice(0, slash), { limit: 1000 });
  return (data ?? []).some((f) => f.name === path.slice(slash + 1));
}

/** Chạy `fn` như thể đang ở 2 giờ sau — chỉ đổi Date, không đụng timer/mạng. */
async function asIfHoursLater<T>(fn: () => Promise<T>): Promise<T> {
  const realNow = Date.now;
  Date.now = () => realNow.call(Date) + PAST_GRACE_MS;
  try {
    return await fn();
  } finally {
    Date.now = realNow;
  }
}

let adminGv: TestUser;
let plainGv: TestUser;
let student: TestUser;
let courseId: string;
/** File có dòng `assignments` trỏ tới — TUYỆT ĐỐI không được bị dọn nhầm. */
let usedPath: string;
/** File không dòng nào trỏ tới — đúng thứ nút "Dọn file" phải xóa. */
let orphanPath: string;

const originalAdminUsernames = process.env.ADMIN_USERNAMES;

beforeAll(async () => {
  adminGv = await createUser(`ao.ad.${ts}`, { full_name: "GV Admin", role: "teacher" });
  plainGv = await createUser(`ao.gv.${ts}`, { full_name: "GV Thuong", role: "teacher" });

  // Chỉ GV admin được khai — GV thường phải bị chặn dù cũng là teacher.
  process.env.ADMIN_USERNAMES = adminGv.username;

  const teacher = await clientFor(adminGv);
  const { data: course, error: courseErr } = await teacher
    .from("courses")
    .insert({ code: COURSE_CODE, name: "Khoa Van Hanh", teacher_id: adminGv.id })
    .select("id")
    .single();
  if (courseErr) throw new Error(`Tạo khóa: ${courseErr.message}`);
  courseId = course.id;
  trackCourseCode(COURSE_CODE);

  const { error: classErr } = await teacher.from("classes").insert({
    course_id: courseId,
    class_code: `${COURSE_CODE}01`,
    total_sessions: 2,
    teacher_id: adminGv.id,
  });
  if (classErr) throw new Error(`Mở lớp: ${classErr.message}`);

  student = await createUser(`ao.hv.${ts}`, {
    full_name: "Hoc Vien",
    role: "student",
    class_code: `${COURSE_CODE}01`,
  });

  // Hai file trong bucket: một CÓ đề trỏ tới, một mồ côi.
  usedPath = `${courseId}/${ts}-de-dang-dung.txt`;
  orphanPath = `${courseId}/${ts}-rac-mo-coi.txt`;
  for (const path of [usedPath, orphanPath]) {
    const { error } = await teacher.storage
      .from(SPEC_BUCKET)
      .upload(path, new Blob(["noi dung de"], { type: "text/plain" }));
    if (error) throw new Error(`Upload ${path}: ${error.message}`);
    trackFile(path);
  }

  const { error: assignErr } = await teacher.from("assignments").insert({
    course_id: courseId,
    session_number: 1,
    title: "De buoi 1",
    spec_file_path: usedPath,
  });
  if (assignErr) throw new Error(`Tạo đề: ${assignErr.message}`);
});

afterAll(async () => {
  if (originalAdminUsernames === undefined) delete process.env.ADMIN_USERNAMES;
  else process.env.ADMIN_USERNAMES = originalAdminUsernames;
  await cleanupAll();
});

describe("requireAdmin — cổng vào /teacher/admin", () => {
  it("should send a signed-out visitor to /login", async () => {
    expect(await expectRedirect(() => runAs(null, () => requireAdmin()))).toBe("/login");
  });

  it("should send a student to /student", async () => {
    expect(await expectRedirect(() => runAs(student, () => requireAdmin()))).toBe(
      "/student"
    );
  });

  it("should send a teacher who is not declared admin back to /teacher", async () => {
    expect(await expectRedirect(() => runAs(plainGv, () => requireAdmin()))).toBe(
      "/teacher"
    );
  });

  it("should let the declared admin in", async () => {
    const profile = await runAs(adminGv, () => requireAdmin());
    expect(profile.username).toBe(adminGv.username);
    expect(profile.role).toBe("teacher");
  });

  it("should fail closed when ADMIN_USERNAMES is missing", async () => {
    // Quên cấu hình biến (VD thêm biến trên Vercel SAU khi deploy) phải dẫn tới
    // MẤT quyền, không phải mở cửa cho mọi giáo viên.
    delete process.env.ADMIN_USERNAMES;
    try {
      expect(await expectRedirect(() => runAs(adminGv, () => requireAdmin()))).toBe(
        "/teacher"
      );
    } finally {
      process.env.ADMIN_USERNAMES = adminGv.username;
    }
  });
});

describe("denyIfNotAdmin — chặn 3 action chạy service-role", () => {
  it("should refuse purgeTestUsers for a student and delete nobody", async () => {
    const result = await runAs(student, () => purgeTestUsers());
    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();

    // Không pass suông: chính tài khoản của bộ test này khớp tiền tố test, nên
    // nếu chặn hỏng thì chúng đã biến mất ở dòng dưới.
    const { data } = await admin().auth.admin.getUserById(plainGv.id);
    expect(data?.user?.id).toBe(plainGv.id);
  });

  it("should refuse cleanupOrphanSpecFiles for a plain teacher and keep the file", async () => {
    const result = await asIfHoursLater(() =>
      runAs(plainGv, () => cleanupOrphanSpecFiles())
    );
    expect(result.error).toBeTruthy();

    const { data } = await admin().storage.from(SPEC_BUCKET).download(orphanPath);
    expect(data, "file mồ côi phải còn nguyên khi người không có quyền bấm dọn").toBeTruthy();
  });

  it("should tell a signed-out caller the session expired", async () => {
    const form = new FormData();
    form.set("user_id", plainGv.id);
    const result = await runAs(null, () => confirmUserEmail({}, form));
    expect(result.error).toContain("Phiên đăng nhập");
  });

  it("should stop a student from confirming somebody else's account", async () => {
    // Leo thang quyền thật nếu thủng: xác nhận email hộ = mở khóa đăng nhập cho
    // một tài khoản đang kẹt.
    const victim = await admin().auth.admin.createUser({
      email: emailOf(`ao.kep.${ts}`),
      password: TEST_PASSWORD,
      email_confirm: false,
      user_metadata: { full_name: "Nan Nhan", role: "teacher", username: `ao.kep.${ts}` },
    });
    if (victim.error) throw new Error(`Tạo nạn nhân: ${victim.error.message}`);
    trackUser(victim.data.user.id);

    const form = new FormData();
    form.set("user_id", victim.data.user.id);
    const result = await runAs(student, () => confirmUserEmail({}, form));
    expect(result.error).toBeTruthy();

    const { data } = await admin().auth.admin.getUserById(victim.data.user.id);
    expect(data?.user?.email_confirmed_at ?? null).toBeNull();
  });
});

describe("confirmUserEmail — mở khóa tài khoản kẹt", () => {
  it("should reject an empty user id", async () => {
    const result = await runAs(adminGv, () => confirmUserEmail({}, new FormData()));
    expect(result.error).toContain("Thiếu tài khoản");
  });

  it("should actually let the account log in afterwards", async () => {
    const username = `ao.ket.${ts}`;
    const created = await admin().auth.admin.createUser({
      email: emailOf(username),
      password: TEST_PASSWORD,
      email_confirm: false,
      user_metadata: { full_name: "Bi Ket", role: "teacher", username },
    });
    if (created.error) throw new Error(`Tạo tài khoản kẹt: ${created.error.message}`);
    trackUser(created.data.user.id);

    // Đo TRƯỚC: nếu tài khoản chưa xác nhận vẫn đăng nhập được thì ca dưới là
    // pass suông, phải biết ngay chứ không im lặng cho qua.
    await expect(signIn(username)).rejects.toThrow();

    const form = new FormData();
    form.set("user_id", created.data.user.id);
    const result = await runAs(adminGv, () => confirmUserEmail({}, form));
    expect(result.success, result.error).toBeTruthy();

    // Bằng chứng thật: đăng nhập được, không chỉ là một cột đổi giá trị.
    await expect(signIn(username)).resolves.toBeDefined();
  });
});

describe("buildOpsReport — số liệu của trang", () => {
  it("should mark this suite's accounts as test accounts", async () => {
    const report = await buildOpsReport();
    const row = report.accounts.find((a) => a.username === adminGv.username);
    expect(row, "tài khoản vừa tạo phải có trong báo cáo").toBeDefined();
    expect(row?.isTest).toBe(true);
    expect(row?.role).toBe("teacher");
    expect(row?.profileName).toBe("GV Admin");
    expect(report.testAccountCount).toBeGreaterThan(0);
    expect(report.authUserCount).toBeGreaterThanOrEqual(report.accounts.length);
  });

  it("should count the course this suite created", async () => {
    const report = await buildOpsReport();
    const courses = report.counts.find((c) => c.table === "courses");
    expect(courses?.label).toBe("Khóa học");
    expect(courses?.count ?? 0).toBeGreaterThan(0);
  });

  it("should raise the unconfirmed-email warning with the stuck account listed", async () => {
    const username = `ao.chua.${ts}`;
    const created = await admin().auth.admin.createUser({
      email: emailOf(username),
      password: TEST_PASSWORD,
      email_confirm: false,
      user_metadata: { full_name: "Chua Xac Nhan", role: "teacher", username },
    });
    if (created.error) throw new Error(`Tạo tài khoản: ${created.error.message}`);
    trackUser(created.data.user.id);

    const report = await buildOpsReport();
    const issue = report.issues.find((i) => i.key === "unconfirmed-email");
    expect(issue?.severity).toBe("warning");
    expect(issue?.items).toContain(username);
  });
});

describe("findOrphanSpecFiles — dò file rác trong bucket", () => {
  it("should never list a file an assignment still points to", async () => {
    const orphans = await asIfHoursLater(() => findOrphanSpecFiles(admin()));
    expect(orphans.map((f) => f.path)).not.toContain(usedPath);
  });

  it("should spare a freshly uploaded orphan (1-hour grace)", async () => {
    // Có một khoảnh khắc file đã lên Storage mà dòng `assignments` chưa insert
    // xong. Dọn trong khoảnh khắc đó là xóa mất đề bài GV đang tạo.
    const orphans = await findOrphanSpecFiles(admin());
    expect(orphans.map((f) => f.path)).not.toContain(orphanPath);
  });

  it("should list the orphan once it is older than the grace period", async () => {
    const orphans = await asIfHoursLater(() => findOrphanSpecFiles(admin()));
    expect(orphans.map((f) => f.path)).toContain(orphanPath);
  });

  it("should surface the orphan as an issue on the report", async () => {
    const report = await asIfHoursLater(() => buildOpsReport());
    const issue = report.issues.find((i) => i.key === "orphan-spec-file");
    expect(issue?.severity).toBe("warning");
    expect(issue?.items).toContain(orphanPath);
    expect(report.orphanFiles.map((f) => f.path)).toContain(orphanPath);
  });
});

describe("cleanupOrphanSpecFiles — nút dọn file", () => {
  it("should delete the orphan but keep the file still in use", async () => {
    const seen = await asIfHoursLater(() => findOrphanSpecFiles(admin()));
    const result = await asIfHoursLater(() =>
      runAs(adminGv, () => cleanupOrphanSpecFiles())
    );
    // Kèm cả danh sách action NHÌN THẤY và câu nó trả về: "Bucket sạch" cũng là
    // `success`, nên nếu chỉ kiểm success thì ca này pass suông khi hàm dò hỏng.
    const why = `dò thấy ${seen.length} file: ${seen.map((f) => f.path).join(", ")} | action nói: ${JSON.stringify(result)}`;
    expect(result.success, why).toBeTruthy();

    expect(await fileExists(orphanPath), `file mồ côi phải biến mất — ${why}`).toBe(
      false
    );

    // Ca quan trọng nhất của cả nhóm: dọn quá tay là MẤT ĐỀ BÀI THẬT của giáo viên.
    expect(await fileExists(usedPath), "file đang được đề trỏ tới phải còn nguyên").toBe(
      true
    );
  });

  it("should report a clean bucket instead of failing when there is nothing to do", async () => {
    // Không bù giờ: mọi file còn lại đều trong thời gian ân hạn → không có gì để dọn.
    const result = await runAs(adminGv, () => cleanupOrphanSpecFiles());
    expect(result.success).toContain("sạch");
  });
});

describe("purgeTestUsers — nút dọn tài khoản test", () => {
  // ⚠️ ĐỂ CUỐI CÙNG: action này xóa MỌI tài khoản khớp tiền tố test, gồm cả tài
  // khoản của chính bộ test này. Mọi ca cần tài khoản phải chạy xong trước đây.
  it("should delete accounts matching the test prefixes", async () => {
    const username = `ao.rac.${ts}`;
    const created = await admin().auth.admin.createUser({
      email: emailOf(username),
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Tai Khoan Rac", role: "teacher", username },
    });
    if (created.error) throw new Error(`Tạo tài khoản rác: ${created.error.message}`);
    trackUser(created.data.user.id);

    const result = await runAs(adminGv, () => purgeTestUsers());
    expect(result.success, result.error).toBeTruthy();

    const { data } = await admin().auth.admin.getUserById(created.data.user.id);
    expect(data?.user ?? null, "tài khoản test phải bị xóa khỏi auth").toBeNull();

    // Khóa học cascade theo giáo viên chủ, tài khoản thì action vừa xóa hết —
    // không còn gì cho `cleanupAll` dọn, và báo "còn sót" ở đây là báo động giả.
    forgetTracked();
  });
});
