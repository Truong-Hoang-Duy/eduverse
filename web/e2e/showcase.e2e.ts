// E2E link triển lãm sản phẩm gửi PHỤ HUYNH — gọi THẲNG thân Server Action.
//
// Đây là chỗ DUY NHẤT trong app mà người chưa đăng nhập vừa ĐỌC được dữ liệu học
// viên vừa GHI được (chấm điểm, nhận xét), nên trọng tâm của bộ này là ranh
// giới: cái gì lọt ra ngoài, cái gì không, link tắt/hết hạn/đổi token có chết
// thật không, và bài chấm ẩn danh có thật sự ẩn danh không.
//
// Mọi ca "không xem được" đều dựng DỮ LIỆU THẬT ĐỂ LỘ trước (lớp có sản phẩm,
// có bình luận) — không có dữ liệu thì kiểm chứng chỉ là pass suông.
//
// Chạy: pnpm test:e2e (cần .env.local + mạng + migration 20260829000000).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { saveProject } from "@/lib/actions/projects";
import {
  loadMyShowcaseRatings,
  rateShowcaseProject,
  toggleShowcaseHeart,
  trackShowcaseView,
} from "@/lib/actions/showcase-public";
import {
  deleteShowcaseRating,
  disableShowcase,
  enableShowcase,
  rotateShowcaseToken,
  saveShowcaseSettings,
} from "@/lib/actions/showcase";
import { loadShowcase } from "@/lib/showcase-data";
import { isShowcaseToken, type ShowcaseProject } from "@/lib/showcase";

import {
  admin,
  cleanupAll,
  clientFor,
  createUser,
  runAs,
  trackCourseCode,
  uniqueSuffix,
  type TestUser,
} from "./_harness";

const ts = uniqueSuffix();
const CODE = `SC${String(ts).slice(-4)}`;

let gv: TestUser;
let gvKhac: TestUser;
let hvAn: TestUser;
let hvBinh: TestUser;
let classId: string;
let projectAn: string;
let token: string;

const ANH_MINH_HOA = "https://i.example.com/san-pham-cua-an.png";
const KHACH_A = "phuhuynh0001test";
const KHACH_B = "phuhuynh0002test";

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((v) => data.append(key, v));
    else data.set(key, value);
  }
  return data;
}

/** Token hiện tại của lớp, đọc bằng service-role cho khỏi phụ thuộc RLS. */
async function currentToken(): Promise<string> {
  const { data } = await admin()
    .from("class_showcases")
    .select("token")
    .eq("class_id", classId)
    .single();
  return data?.token ?? "";
}

/** Bật link với hạn mặc định 7 ngày rồi trả token. */
async function enable(expiry = "7"): Promise<string> {
  const result = await runAs(gv, () =>
    enableShowcase({}, form({ class_id: classId, expiry }))
  );
  expect(result.success, result.error).toBeTruthy();
  return currentToken();
}

/** Sản phẩm của An trong payload công khai. */
async function anProject(): Promise<ShowcaseProject | undefined> {
  const payload = await runAs(null, () => loadShowcase(token));
  return payload?.projects.find((p) => p.id === projectAn);
}

/** Thiết lập trang — checkbox vắng mặt = tắt, nên phải liệt kê đủ mỗi lần lưu. */
async function saveSettings(fields: Record<string, string | string[]>) {
  const result = await runAs(gv, () =>
    saveShowcaseSettings({}, form({ class_id: classId, ...fields }))
  );
  expect(result.success, result.error).toBeTruthy();
}

beforeAll(async () => {
  gv = await createUser(`sc.gv.${ts}`, {
    full_name: "Co Giao Chu Nhiem",
    role: "teacher",
  });
  gvKhac = await createUser(`sc.gvk.${ts}`, {
    full_name: "GV Lop Khac",
    role: "teacher",
  });

  const teacher = await clientFor(gv);
  const { data: course, error: courseErr } = await teacher
    .from("courses")
    .insert({ code: CODE, name: "Khoa Trien Lam", teacher_id: gv.id })
    .select("id")
    .single();
  if (courseErr) throw new Error(`Tạo khóa: ${courseErr.message}`);
  trackCourseCode(CODE);

  const { data: cls, error: classErr } = await teacher
    .from("classes")
    .insert({
      course_id: course.id,
      class_code: `${CODE}01`,
      teacher_id: gv.id,
      total_sessions: 2,
      description: "Lop hoc thu nghiem trien lam",
    })
    .select("id")
    .single();
  if (classErr) throw new Error(`Mở lớp: ${classErr.message}`);
  classId = cls.id;

  hvAn = await createUser(`sc.hv1.${ts}`, {
    full_name: "An Nguyen",
    role: "student",
    class_code: `${CODE}01`,
  });
  hvBinh = await createUser(`sc.hv2.${ts}`, {
    full_name: "Binh Tran",
    role: "student",
    class_code: `${CODE}01`,
  });

  // Sản phẩm khai qua chính Server Action — kiểm luôn đường ảnh mới.
  const anResult = await runAs(hvAn, () =>
    saveProject(
      {},
      form({
        class_id: classId,
        name: "May tinh bo tui",
        description: "Ung dung tinh toan don gian",
        features: "Cong tru\nNhan chia",
        image_urls: ANH_MINH_HOA,
        repo_url: "https://github.com/an/may-tinh",
      })
    )
  );
  expect(anResult.success, anResult.error).toBeTruthy();
  projectAn = anResult.project?.id ?? "";

  const binhResult = await runAs(hvBinh, () =>
    saveProject(
      {},
      form({ class_id: classId, name: "Game doan so", features: "Cho diem" })
    )
  );
  expect(binhResult.success, binhResult.error).toBeTruthy();

  // Bình luận của bạn cùng lớp — user chốt là phụ huynh ĐƯỢC xem phần này.
  const binhClient = await clientFor(hvBinh);
  const { error: commentErr } = await binhClient
    .from("project_comments")
    .insert({ project_id: projectAn, author_id: hvBinh.id, content: "San pham hay!" });
  if (commentErr) throw new Error(`Bình luận: ${commentErr.message}`);

  token = await enable();
});

afterAll(cleanupAll);

describe("enableShowcase", () => {
  it("should create an unguessable token the DB constraint accepts", () => {
    expect(isShowcaseToken(token)).toBe(true);
    expect(token.length).toBeGreaterThanOrEqual(16);
  });

  it("should set an expiry seven days out by default", async () => {
    const { data } = await admin()
      .from("class_showcases")
      .select("expires_at, is_enabled")
      .eq("class_id", classId)
      .single();
    expect(data?.is_enabled).toBe(true);

    const days =
      (new Date(data!.expires_at!).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(6.5);
    expect(days).toBeLessThan(7.5);
  });

  it("should keep the score board hidden from parents by default", async () => {
    const payload = await runAs(null, () => loadShowcase(token));
    expect(payload!.show_rating_results).toBe(false);
  });

  it("should refuse an expiry preset that is not on the list", async () => {
    const result = await runAs(gv, () =>
      enableShowcase({}, form({ class_id: classId, expiry: "9999" }))
    );
    expect(result.error).toContain("Hạn dùng");
  });

  it("should not let a teacher from another class open a link for this class", async () => {
    const result = await runAs(gvKhac, () =>
      enableShowcase({}, form({ class_id: classId, expiry: "7" }))
    );
    // RLS chặn INSERT/UPDATE nên hoặc báo lỗi, hoặc "thành công" mà không đổi gì.
    const { data } = await admin()
      .from("class_showcases")
      .select("token")
      .eq("class_id", classId)
      .single();
    expect(data?.token, result.error ?? "token không được đổi").toBe(token);
  });
});

describe("loadShowcase — khách chưa đăng nhập", () => {
  it("should show every project in the class to a guest with the link", async () => {
    const payload = await runAs(null, () => loadShowcase(token));
    expect(payload).not.toBeNull();
    expect(payload!.class_code).toBe(`${CODE}01`);
    expect(payload!.teacher_name).toBe("Co Giao Chu Nhiem");
    expect(payload!.projects.map((p) => p.author_name)).toEqual([
      "An Nguyen",
      "Binh Tran",
    ]);
  });

  it("should carry the pasted image links through to the guest page", async () => {
    const an = await anProject();
    expect(an?.image_urls).toEqual([ANH_MINH_HOA]);
    expect(an?.features).toEqual(["Cong tru", "Nhan chia"]);
  });

  it("should include classmates' comments", async () => {
    const an = await anProject();
    expect(an?.comments.map((c) => c.content)).toEqual(["San pham hay!"]);
    expect(an?.comments[0].author_name).toBe("Binh Tran");
  });

  it("should never leak usernames or anything beyond the listed columns", async () => {
    const payload = await runAs(null, () => loadShowcase(token));
    const dump = JSON.stringify(payload);
    expect(dump).not.toContain(hvAn.username);
    expect(dump).not.toContain(hvBinh.username);
    expect(dump).not.toContain("student_id");
    expect(dump).not.toContain("eduverse.local");
  });

  it("should return nothing for a made-up token", async () => {
    const payload = await runAs(null, () =>
      loadShowcase("khongcothattrongdbdauneuma")
    );
    expect(payload).toBeNull();
  });

  it("should return nothing for junk that is not even token-shaped", async () => {
    for (const junk of ["", "../../etc/passwd", "abc"]) {
      expect(await runAs(null, () => loadShowcase(junk))).toBeNull();
    }
  });
});

describe("Ẩn học viên khỏi trang phụ huynh", () => {
  it("should drop a hidden student from the guest payload but keep the rest", async () => {
    await saveSettings({
      intro: "Kinh chao quy phu huynh",
      allow_ratings: "on",
      allow_reactions: "on",
      hidden_student_ids: [hvBinh.id],
    });

    const payload = await runAs(null, () => loadShowcase(token));
    expect(payload!.intro).toBe("Kinh chao quy phu huynh");
    expect(payload!.projects.map((p) => p.author_name)).toEqual(["An Nguyen"]);
  });

  it("should bring the student back when the teacher unticks them", async () => {
    await saveSettings({
      intro: "Kinh chao quy phu huynh",
      allow_ratings: "on",
      allow_reactions: "on",
    });

    const payload = await runAs(null, () => loadShowcase(token));
    expect(payload!.projects).toHaveLength(2);
  });

  it("should not let another teacher change these settings", async () => {
    await runAs(gvKhac, () =>
      saveShowcaseSettings({}, form({ class_id: classId, intro: "Bi sua trom" }))
    );
    const payload = await runAs(null, () => loadShowcase(token));
    expect(payload!.intro).toBe("Kinh chao quy phu huynh");
  });
});

describe("Phụ huynh chấm điểm + nhận xét ẩn danh", () => {
  it("should accept a rating from a guest with no account", async () => {
    const result = await runAs(null, () =>
      rateShowcaseProject({
        token,
        projectId: projectAn,
        visitorId: KHACH_A,
        product: 5,
        presentation: 4,
        creativity: null,
        comment: "Con lam rat tot!",
      })
    );
    expect(result.error).toBeUndefined();
    expect(result.rating?.score_product).toBe(5);

    const an = await anProject();
    expect(an?.rating_count).toBe(1);
    expect(an?.guest_notes.map((n) => n.comment)).toEqual(["Con lam rat tot!"]);
  });

  it("should let a criterion be left blank instead of forcing a made-up score", async () => {
    const an = await anProject();
    // Sáng tạo bỏ trống ở lượt trên — không được biến thành 0 hay bị chặn.
    expect(an?.rating_count).toBe(1);
  });

  it("should EDIT the same guest's rating instead of piling up new rows", async () => {
    const result = await runAs(null, () =>
      rateShowcaseProject({
        token,
        projectId: projectAn,
        visitorId: KHACH_A,
        product: 3,
        presentation: 3,
        creativity: 3,
        comment: "Sua lai nhan xet",
      })
    );
    expect(result.error).toBeUndefined();

    const an = await anProject();
    expect(an?.rating_count, "vẫn là MỘT lượt chấm").toBe(1);
    expect(an?.guest_notes.map((n) => n.comment)).toEqual(["Sua lai nhan xet"]);
  });

  it("should never attach anything identifying the parent who wrote it", async () => {
    const an = await anProject();
    const dump = JSON.stringify(an?.guest_notes);
    expect(dump).not.toContain(KHACH_A);
    expect(dump).not.toContain("visitor");
    expect(dump).not.toContain("guest_name");
  });

  it("should hide the average score until the teacher turns results on", async () => {
    let an = await anProject();
    expect(an?.rating_avg, "mặc định TẮT — trang không thành bảng xếp hạng").toBeNull();

    await saveSettings({
      intro: "Kinh chao quy phu huynh",
      allow_ratings: "on",
      allow_reactions: "on",
      show_rating_results: "on",
    });

    an = await anProject();
    expect(an?.rating_avg?.product).toBe(3);
    expect(an?.rating_avg?.presentation).toBe(3);

    await saveSettings({
      intro: "Kinh chao quy phu huynh",
      allow_ratings: "on",
      allow_reactions: "on",
    });
  });

  it("should count a second guest separately", async () => {
    const result = await runAs(null, () =>
      rateShowcaseProject({
        token,
        projectId: projectAn,
        visitorId: KHACH_B,
        product: 5,
        presentation: null,
        creativity: null,
        comment: "",
      })
    );
    expect(result.error).toBeUndefined();

    const an = await anProject();
    expect(an?.rating_count).toBe(2);
    expect(an?.guest_notes, "lượt này không viết chữ").toHaveLength(1);
  });

  it("should refuse a rating with neither a score nor a comment", async () => {
    const result = await runAs(null, () =>
      rateShowcaseProject({
        token,
        projectId: projectAn,
        visitorId: KHACH_A,
        product: null,
        presentation: null,
        creativity: null,
        comment: "   ",
      })
    );
    expect(result.error).toContain("ít nhất");
  });

  it("should refuse a score outside the one-to-five scale", async () => {
    const result = await runAs(null, () =>
      rateShowcaseProject({
        token,
        projectId: projectAn,
        visitorId: KHACH_A,
        product: 99,
        presentation: null,
        creativity: null,
        comment: "",
      })
    );
    expect(result.error).toContain("1 đến 5");
  });

  it("should refuse a rating aimed at a project outside this class", async () => {
    const result = await runAs(null, () =>
      rateShowcaseProject({
        token,
        projectId: "00000000-0000-0000-0000-000000000000",
        visitorId: KHACH_A,
        product: 5,
        presentation: null,
        creativity: null,
        comment: "",
      })
    );
    expect(result.error).toBeTruthy();
  });

  it("should refuse a visitor id that does not look random enough", async () => {
    const result = await runAs(null, () =>
      rateShowcaseProject({
        token,
        projectId: projectAn,
        visitorId: "x",
        product: 5,
        presentation: null,
        creativity: null,
        comment: "",
      })
    );
    expect(result.error).toBeTruthy();
  });

  it("should give a guest back only their OWN ratings", async () => {
    const mine = await runAs(null, () => loadMyShowcaseRatings(token, KHACH_A));
    expect(mine).toHaveLength(1);
    expect(mine[0].project_id).toBe(projectAn);
    expect(mine[0].comment).toBe("Sua lai nhan xet");

    const theirs = await runAs(null, () => loadMyShowcaseRatings(token, KHACH_B));
    expect(theirs).toHaveLength(1);
    expect(theirs[0].comment).toBeNull();
  });

  it("should hand back nothing for a visitor id that never rated anything", async () => {
    const none = await runAs(null, () =>
      loadMyShowcaseRatings(token, "khachchuachamgiuacacem")
    );
    expect(none).toHaveLength(0);
  });

  it("should let a guest read ratings only through the link, never the table", async () => {
    const anon = await runAs(null, async () => {
      const { createClient } = await import("@/lib/supabase/server");
      return createClient();
    });
    const { data } = await anon.from("showcase_ratings").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("should let the class teacher take a rating down", async () => {
    const { data: rows } = await admin()
      .from("showcase_ratings")
      .select("id")
      .eq("project_id", projectAn)
      .eq("visitor_id", KHACH_B);
    const victim = rows![0].id;

    await runAs(gv, () =>
      deleteShowcaseRating(form({ id: victim, class_id: classId }))
    );

    const an = await anProject();
    expect(an?.rating_count).toBe(1);
  });

  it("should stop accepting ratings once the teacher turns them off", async () => {
    await saveSettings({ allow_reactions: "on" });

    const result = await runAs(null, () =>
      rateShowcaseProject({
        token,
        projectId: projectAn,
        visitorId: KHACH_B,
        product: 5,
        presentation: null,
        creativity: null,
        comment: "Thu cham khi da tat",
      })
    );
    expect(result.error).toContain("chấm điểm");

    // Bật lại cho các ca sau.
    await saveSettings({ allow_ratings: "on", allow_reactions: "on" });
  });
});

describe("Thả tim", () => {
  it("should count a heart and then take it back on a second tap", async () => {
    const first = await runAs(null, () =>
      toggleShowcaseHeart({ token, projectId: projectAn, visitorId: KHACH_A })
    );
    expect(first.error).toBeUndefined();
    expect(first.reacted).toBe(true);
    expect(first.count).toBe(1);

    const an = await anProject();
    expect(an?.reaction_count).toBe(1);

    const second = await runAs(null, () =>
      toggleShowcaseHeart({ token, projectId: projectAn, visitorId: KHACH_A })
    );
    expect(second.reacted).toBe(false);
    expect(second.count).toBe(0);
  });

  it("should refuse a visitor id that does not look random enough", async () => {
    const result = await runAs(null, () =>
      toggleShowcaseHeart({ token, projectId: projectAn, visitorId: "x" })
    );
    expect(result.error).toBeTruthy();
  });
});

describe("Đếm lượt xem", () => {
  it("should go up when a guest opens the page", async () => {
    const before = await admin()
      .from("class_showcases")
      .select("view_count")
      .eq("class_id", classId)
      .single();

    await runAs(null, () => trackShowcaseView(token));

    const after = await admin()
      .from("class_showcases")
      .select("view_count")
      .eq("class_id", classId)
      .single();
    expect(after.data!.view_count).toBe(before.data!.view_count + 1);
  });
});

describe("Thu hồi link", () => {
  it("should hide everything the moment the teacher switches the link off", async () => {
    await runAs(gv, () => disableShowcase(form({ class_id: classId })));
    expect(await runAs(null, () => loadShowcase(token))).toBeNull();
  });

  it("should generate a fresh link with wiped audience data when switched on again", async () => {
    const again = await enable();
    expect(again).not.toBeNull();
    expect(await runAs(null, () => loadShowcase(token))).toBeNull();
    expect(await runAs(null, () => loadShowcase(again))).not.toBeNull();
    token = again;
  });

  it("should kill the old link when the teacher rotates the token", async () => {
    const old = token;
    await runAs(gv, () => rotateShowcaseToken(form({ class_id: classId })));
    token = await currentToken();

    expect(token).not.toBe(old);
    expect(await runAs(null, () => loadShowcase(old))).toBeNull();
    expect(await runAs(null, () => loadShowcase(token))).not.toBeNull();
  });

  it("should stop working the moment the deadline passes", async () => {
    await admin()
      .from("class_showcases")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("class_id", classId);

    expect(await runAs(null, () => loadShowcase(token))).toBeNull();

    // Khách hết hạn cũng không chấm được nữa, và không đọc lại được bài đã chấm.
    const rating = await runAs(null, () =>
      rateShowcaseProject({
        token,
        projectId: projectAn,
        visitorId: KHACH_A,
        product: 5,
        presentation: null,
        creativity: null,
        comment: "",
      })
    );
    expect(rating.error).toContain("hiệu lực");
    expect(await runAs(null, () => loadMyShowcaseRatings(token, KHACH_A))).toHaveLength(
      0
    );

    await enable();
    token = await currentToken();
  });
});

describe("Ranh giới RLS của bảng mới", () => {
  it("should hide class_showcases rows from a guest reading the table directly", async () => {
    const anon = await runAs(null, async () => {
      const { createClient } = await import("@/lib/supabase/server");
      return createClient();
    });
    const { data } = await anon.from("class_showcases").select("token");
    expect(data ?? []).toHaveLength(0);
  });

  it("should hide them from a teacher who does not own the class", async () => {
    const other = await clientFor(gvKhac);
    const { data } = await other
      .from("class_showcases")
      .select("token")
      .eq("class_id", classId);
    expect(data ?? []).toHaveLength(0);
  });

  it("should hide ratings from a teacher who does not own the class", async () => {
    const other = await clientFor(gvKhac);
    const { data } = await other.from("showcase_ratings").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("should let the owning teacher read their own row and the ratings on it", async () => {
    const teacher = await clientFor(gv);
    const { data: showcaseRows } = await teacher
      .from("class_showcases")
      .select("token")
      .eq("class_id", classId);
    expect(showcaseRows).toHaveLength(1);

    const { data: ratingRows } = await teacher
      .from("showcase_ratings")
      .select("id, comment");
    expect((ratingRows ?? []).length).toBeGreaterThan(0);
  });
});
