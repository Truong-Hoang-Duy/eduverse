// E2E luồng USERNAME — bản kế thừa `scripts/e2e-phase1.mjs`.
//
// Script cũ CHÉP LẠI thân action bằng JS (`signupAndLogin` tự gọi
// `admin.createUser` rồi `signInWithPassword`), nên nó kiểm được Supabase chứ
// không kiểm được action: đổi luật validate trong `actions/auth.ts` mà quên đổi
// script thì test vẫn xanh. Ở đây gọi thẳng `signupTeacher` / `signupStudent` /
// `login` / `logout`, và session do CHÍNH ACTION ghi vào hộp cookie.
//
// Chạy: pnpm test:e2e (cần .env.local + mạng). Dữ liệu tự tạo, tự dọn.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { login, logout, signupStudent, signupTeacher } from "@/lib/actions/auth";
import { createClass } from "@/lib/actions/classes";
import { createCourse } from "@/lib/actions/courses";
import { createClient } from "@/lib/supabase/server";

import {
  admin,
  cleanupAll,
  clientFor,
  emailOf,
  expectRedirect,
  newJar,
  runAs,
  signIn,
  TEST_PASSWORD,
  trackCourseCode,
  trackUser,
  uniqueSuffix,
  withJar,
  type TestUser,
} from "./_harness";

// 10 chữ số cuối là đủ để không đụng nhau giữa các lần chạy, mà username vẫn
// nằm trong giới hạn 20 ký tự của `USERNAME_PATTERN`.
const ts = uniqueSuffix().slice(-10);

/**
 * Mã khóa phải là 2-6 CHỮ CÁI IN HOA (`COURSE_CODE_PATTERN`), nên không nhét
 * timestamp thẳng vào được — đổi từng chữ số thành chữ cái (0→A … 9→J).
 */
const COURSE_CODE =
  "EE" + ts.slice(-4).replace(/\d/g, (d) => String.fromCharCode(65 + Number(d)));
const CLASS_CODE = `${COURSE_CODE}01`;

const teacherUsername = `e2e.gv.${ts}`;
const studentUsername = `e2e.hv.${ts}`;

let teacher: TestUser;
let classId: string;

/** Đọc hồ sơ bằng service-role — dùng để kiểm chứng, không phải để dựng. */
async function profileOf(username: string) {
  const { data } = await admin()
    .from("profiles")
    .select("id, username, role, full_name")
    .eq("username", username)
    .maybeSingle();
  return data;
}

function signupForm(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

/** Bộ trường hợp lệ cho đăng ký giáo viên — ca test chỉ ghi đè phần cần sai. */
function teacherFields(overrides: Record<string, string> = {}) {
  return signupForm({
    username: `e2e.tmp.${ts}`,
    full_name: "GV Tam",
    password: TEST_PASSWORD,
    password_confirm: TEST_PASSWORD,
    invite_code: process.env.TEACHER_INVITE_CODE ?? "",
    ...overrides,
  });
}

beforeAll(() => {
  if (!process.env.TEACHER_INVITE_CODE) {
    throw new Error(
      "Thiếu TEACHER_INVITE_CODE trong web/.env.local — không kiểm được luồng đăng ký giáo viên."
    );
  }
});

afterAll(cleanupAll);

describe("signupTeacher — validate trước khi đụng DB", () => {
  it("should refuse a wrong invite code and create nobody", async () => {
    const username = `e2e.moi.${ts}`;
    const result = await withJar(newJar(), () =>
      signupTeacher({}, teacherFields({ username, invite_code: "sai-ma-moi" }))
    );
    expect(result.error).toContain("Mã mời");

    // Không chỉ tin thông báo: phải chắc chắn KHÔNG có tài khoản nào ra đời.
    expect(await profileOf(username)).toBeNull();
  });

  it("should require every field", async () => {
    const result = await withJar(newJar(), () =>
      signupTeacher({}, teacherFields({ full_name: "  " }))
    );
    expect(result.error).toContain("đầy đủ");
  });

  it("should reject a username that breaks the format", async () => {
    for (const username of ["ab", "Có Dấu", "qua.dai.qua.dai.qua.dai.999"]) {
      const result = await withJar(newJar(), () =>
        signupTeacher({}, teacherFields({ username }))
      );
      expect(result.error, `với username=${JSON.stringify(username)}`).toContain(
        "Tên tài khoản 3-20 ký tự"
      );
    }
  });

  it("should reject a password shorter than 6 characters", async () => {
    const result = await withJar(newJar(), () =>
      signupTeacher({}, teacherFields({ password: "12345", password_confirm: "12345" }))
    );
    expect(result.error).toContain("ít nhất 6 ký tự");
  });

  it("should reject a mismatched confirmation", async () => {
    const result = await withJar(newJar(), () =>
      signupTeacher({}, teacherFields({ password_confirm: "khac-han" }))
    );
    expect(result.error).toContain("không khớp");
  });
});

describe("signupTeacher — đường thành công", () => {
  it("should create the account, save the username and sign the teacher in", async () => {
    const jar = newJar();
    const destination = await expectRedirect(() =>
      withJar(jar, () => signupTeacher({}, teacherFields({ username: teacherUsername })))
    );
    expect(destination).toBe("/");

    const profile = await profileOf(teacherUsername);
    expect(profile, "trigger handle_new_user phải tạo hồ sơ").not.toBeNull();
    expect(profile?.role).toBe("teacher");
    expect(profile?.full_name).toBe("GV Tam");
    trackUser(profile!.id);

    teacher = {
      id: profile!.id,
      username: teacherUsername,
      email: emailOf(teacherUsername),
      jar,
    };

    // Bằng chứng "đăng ký xong là đăng nhập luôn": session nằm trong hộp cookie
    // do CHÍNH action ghi, không phải do test dựng.
    const supabase = await runAs(teacher, () => createClient());
    const { data } = await supabase.auth.getUser();
    expect(data.user?.id).toBe(profile!.id);
  });

  it("should refuse a username somebody already took", async () => {
    const result = await withJar(newJar(), () =>
      signupTeacher({}, teacherFields({ username: teacherUsername }))
    );
    expect(result.error).toContain("đã có người dùng");
  });
});

describe("createCourse + createClass — giáo viên mở lớp", () => {
  it("should reject a course code that is not 2-6 capital letters", async () => {
    const result = await runAs(teacher, () =>
      createCourse({}, signupForm({ code: "js1", name: "Khoa Sai Ma" }))
    );
    expect(result.error).toContain("2-6 chữ cái in hoa");
  });

  it("should create the course", async () => {
    const result = await runAs(teacher, () =>
      createCourse({}, signupForm({ code: COURSE_CODE, name: "Khoa Test E2E" }))
    );
    expect(result.success, result.error).toContain(COURSE_CODE);
    trackCourseCode(COURSE_CODE);

    // `createCourse` lấy teacher_id TỪ SESSION, không nhận từ form — nếu ai đó
    // đổi sang nhận từ form thì học viên gán được khóa cho giáo viên khác.
    const { data } = await admin()
      .from("courses")
      .select("id, teacher_id")
      .eq("code", COURSE_CODE)
      .single();
    expect(data?.teacher_id).toBe(teacher.id);
  });

  it("should reject a class code that does not follow the course code", async () => {
    const { data: course } = await admin()
      .from("courses")
      .select("id")
      .eq("code", COURSE_CODE)
      .single();

    const result = await runAs(teacher, () =>
      createClass(
        {},
        signupForm({ course_id: course!.id, class_code: "01", total_sessions: "5" })
      )
    );
    expect(result.error).toContain("Mã lớp gồm mã khóa");
  });

  it("should open the class", async () => {
    const { data: course } = await admin()
      .from("courses")
      .select("id")
      .eq("code", COURSE_CODE)
      .single();

    const result = await runAs(teacher, () =>
      createClass(
        {},
        signupForm({ course_id: course!.id, class_code: CLASS_CODE, total_sessions: "5" })
      )
    );
    expect(result.success, result.error).toContain(CLASS_CODE);

    const { data } = await admin()
      .from("classes")
      .select("id")
      .eq("class_code", CLASS_CODE)
      .single();
    classId = data!.id;
  });

  it("should show the new class in the signup combo box for anonymous visitors", async () => {
    // Trang đăng ký chưa đăng nhập, nên RPC này phải chạy được với quyền anon.
    const supabase = await runAs(null, () => createClient());
    const { data } = await supabase.rpc("list_available_classes");
    expect(
      (data ?? []).some(
        (c: { class_code: string; course_name: string }) =>
          c.class_code === CLASS_CODE && c.course_name === "Khoa Test E2E"
      )
    ).toBe(true);
  });
});

describe("signupStudent — đăng ký học viên theo mã lớp", () => {
  it("should require a class code", async () => {
    const result = await withJar(newJar(), () =>
      signupStudent(
        {},
        signupForm({
          username: `e2e.nol.${ts}`,
          full_name: "Khong Lop",
          password: TEST_PASSWORD,
          password_confirm: TEST_PASSWORD,
        })
      )
    );
    expect(result.error).toContain("chọn lớp");
  });

  it("should fail on a class code that does not exist and leave no profile behind", async () => {
    // Trigger `handle_new_user` là nơi CHẶN THẬT: nó tự ghi danh theo mã lớp và
    // nổ nếu mã sai. Action chỉ dịch lỗi đó thành câu tiếng Việt.
    const username = `e2e.sai.${ts}`;
    const result = await withJar(newJar(), () =>
      signupStudent(
        {},
        signupForm({
          username,
          full_name: "HV Sai Ma",
          password: TEST_PASSWORD,
          password_confirm: TEST_PASSWORD,
          class_code: "SAIMA99",
        })
      )
    );
    expect(result.error).toContain("Đăng ký thất bại");
    expect(await profileOf(username)).toBeNull();
  });

  it("should sign the student up, sign them in and enrol them automatically", async () => {
    const jar = newJar();
    const destination = await expectRedirect(() =>
      withJar(jar, () =>
        signupStudent(
          {},
          signupForm({
            username: studentUsername,
            full_name: "HV Test E2E",
            password: TEST_PASSWORD,
            password_confirm: TEST_PASSWORD,
            // Mã lớp gõ thường phải vẫn nhận — action tự viết hoa.
            class_code: CLASS_CODE.toLowerCase(),
          })
        )
      )
    );
    expect(destination).toBe("/");

    const profile = await profileOf(studentUsername);
    expect(profile?.role).toBe("student");
    trackUser(profile!.id);

    const { data: enrollments } = await admin()
      .from("enrollments")
      .select("student_id")
      .eq("class_id", classId);
    expect(
      (enrollments ?? []).some((e) => e.student_id === profile!.id),
      "trigger phải tự ghi danh vào đúng lớp"
    ).toBe(true);
  });
});

describe("login / logout", () => {
  it("should require both fields", async () => {
    const result = await withJar(newJar(), () =>
      login({}, signupForm({ username: teacherUsername, password: "" }))
    );
    expect(result.error).toContain("đầy đủ");
  });

  it("should say the username does not exist", async () => {
    const result = await withJar(newJar(), () =>
      login({}, signupForm({ username: "khong.ton.tai.999", password: TEST_PASSWORD }))
    );
    expect(result.error).toBe("Tên tài khoản không tồn tại.");
  });

  it("should tell a wrong password apart from a wrong username", async () => {
    // Hai câu KHÁC NHAU là chủ ý: người dùng cần biết mình gõ sai ô nào.
    const result = await withJar(newJar(), () =>
      login({}, signupForm({ username: teacherUsername, password: "sai-mat-khau" }))
    );
    expect(result.error).toBe("Mật khẩu không đúng.");
  });

  it("should log in with the username and put a working session in the cookies", async () => {
    const jar = newJar();
    const destination = await expectRedirect(() =>
      withJar(jar, () =>
        // Gõ HOA cũng phải vào được — action tự viết thường.
        login({}, signupForm({ username: teacherUsername.toUpperCase(), password: TEST_PASSWORD }))
      )
    );
    expect(destination).toBe("/");

    const supabase = await withJar(jar, () => createClient());
    const { data } = await supabase.auth.getUser();
    expect(data.user?.id).toBe(teacher.id);
  });

  it("should clear the session on logout", async () => {
    const jar = newJar();
    await expectRedirect(() =>
      withJar(jar, () =>
        login({}, signupForm({ username: teacherUsername, password: TEST_PASSWORD }))
      )
    );

    expect(await expectRedirect(() => withJar(jar, () => logout()))).toBe("/login");

    const supabase = await withJar(jar, () => createClient());
    const { data } = await supabase.auth.getUser();
    expect(data.user, "đăng xuất rồi thì cookie không còn phiên nào").toBeNull();
  });
});

describe("RLS sau khi đăng ký — probe bằng REST, không qua action", () => {
  // Nhóm này CỐ Ý gọi thẳng bảng: nó kiểm hàng rào ở tầng DB, thứ phải đứng
  // vững kể cả khi kẻ tấn công bỏ qua toàn bộ code app.
  it("should stop a student from editing the class", async () => {
    const profile = await profileOf(studentUsername);
    const student: TestUser = {
      id: profile!.id,
      username: studentUsername,
      email: emailOf(studentUsername),
      jar: await signIn(studentUsername),
    };
    const supabase = await clientFor(student);

    const { data } = await supabase
      .from("classes")
      .update({ description: "hacked" })
      .eq("id", classId)
      .select();
    expect((data ?? []).length).toBe(0);

    const { data: courses } = await supabase.from("courses").select("id");
    expect((courses ?? []).length, "học viên không được thấy bảng courses").toBe(0);
  });

  it("should let the teacher see the student's username in their own class", async () => {
    const supabase = await clientFor(teacher);
    const { data } = await supabase
      .from("enrollments")
      .select("profiles(username)")
      .eq("class_id", classId);
    expect(
      (data ?? []).some(
        (e) => (e.profiles as unknown as { username: string } | null)?.username === studentUsername
      )
    ).toBe(true);
  });
});
