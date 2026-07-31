import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isAdminUsername } from "./admin-access";

/**
 * Đây là RANH GIỚI BẢO MẬT của khu `/teacher/admin` — khu đó chạy bằng
 * service-role nên KHÔNG có RLS đỡ phía dưới. Trước đây không có test nào.
 *
 * Tính chất quan trọng nhất: **fail closed** — quên khai `ADMIN_USERNAMES` phải
 * dẫn tới KHÔNG ai vào được, chứ không phải mở cửa cho mọi giáo viên.
 */
describe("isAdminUsername", () => {
  const original = process.env.ADMIN_USERNAMES;

  beforeEach(() => {
    delete process.env.ADMIN_USERNAMES;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_USERNAMES;
    else process.env.ADMIN_USERNAMES = original;
  });

  it("should let NOBODY in when the variable is missing", () => {
    expect(isAdminUsername("duy")).toBe(false);
    expect(isAdminUsername("bat_ky_ai")).toBe(false);
  });

  it("should let nobody in when the variable is empty or only separators", () => {
    for (const value of ["", "   ", ",", " , , "]) {
      process.env.ADMIN_USERNAMES = value;
      expect(isAdminUsername("duy"), `với ADMIN_USERNAMES=${JSON.stringify(value)}`).toBe(
        false
      );
    }
  });

  it("should never treat a null username as an admin", () => {
    process.env.ADMIN_USERNAMES = "duy";
    expect(isAdminUsername(null)).toBe(false);
  });

  it("should accept a declared username", () => {
    process.env.ADMIN_USERNAMES = "duy";
    expect(isAdminUsername("duy")).toBe(true);
  });

  it("should ignore case on both sides", () => {
    process.env.ADMIN_USERNAMES = "Duy,ADMIN2";
    expect(isAdminUsername("duy")).toBe(true);
    expect(isAdminUsername("DUY")).toBe(true);
    expect(isAdminUsername("admin2")).toBe(true);
  });

  it("should tolerate spaces around the commas", () => {
    process.env.ADMIN_USERNAMES = " duy , admin2 ";
    expect(isAdminUsername("duy")).toBe(true);
    expect(isAdminUsername("admin2")).toBe(true);
  });

  it("should require the WHOLE username to match, not a prefix", () => {
    // "duy" không được mở cửa cho "duy2" hay "duyth1" — tài khoản thật của dự án
    // có tên rất giống nhau (duyth1, d2012...).
    process.env.ADMIN_USERNAMES = "duy";
    expect(isAdminUsername("duy2")).toBe(false);
    expect(isAdminUsername("duyth1")).toBe(false);
    expect(isAdminUsername("uy")).toBe(false);
  });

  it("should not let an empty username slip through an empty entry", () => {
    process.env.ADMIN_USERNAMES = "duy,,";
    expect(isAdminUsername("")).toBe(false);
  });
});
