// E2E chấm bài — bản kế thừa `scripts/e2e-phase3.mjs`.
//
// Script cũ `fetch` thẳng vào ai-service ("gọi đúng như Server Action gradeFiles
// làm"), nên nó kiểm được FastAPI chứ KHÔNG kiểm được action: mọi guard của
// `gradeFiles` (phiên đăng nhập, số file, ngân sách dung lượng, RLS trên đề
// bài) chưa từng có test nào. Ở đây gọi thẳng thân hàm.
//
// ⚠️ Cần ai-service chạy: `.venv/Scripts/python -m uvicorn app.main:app --port 8000`
//    (port khác thì đặt AI_SERVICE_URL=http://localhost:<port>).
//
// ⚠️ HẠN MỨC GEMINI free tier là 20 lượt/NGÀY. Bộ này cố ý chỉ tiêu 3 lượt:
// mọi ca chặn-trước-khi-gọi-AI và 2 ca lỗi của ai-service (.doc đời cũ, đề
// không tồn tại) đều KHÔNG đụng tới Gemini. Thêm ca gọi AI thì cân nhắc kỹ.
// E2E gọi AI đỏ thì NGHI GEMINI TRƯỚC — đọc log ai-service, đừng sửa code.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  extractZipForGrading,
  gradeFiles,
  type GradeInputFile,
} from "@/lib/actions/grading";
import { SPEC_BUCKET } from "@/lib/spec-storage";
import { GRADING_BUDGET } from "@/lib/submission-files";
import { buildZip } from "@/lib/zip-fixture";

import {
  admin,
  cleanupAll,
  clientFor,
  createUser,
  runAs,
  trackCourseCode,
  trackFile,
  uniqueSuffix,
  type TestUser,
} from "./_harness";

const ts = uniqueSuffix();
const CODE = `EG${String(ts).slice(-4)}`;

/**
 * File .docx thật (ZIP chứa `word/document.xml`) với bài làm đạt điểm cao. Dán
 * sẵn base64 vì đây là file nhị phân do Word sinh ra, không dựng lại bằng tay
 * được — `buildZip` chỉ dùng cho ZIP bài nộp bình thường.
 */
const DOCX_B64 =
  "UEsDBBQAAAAIAIw8/lx4SrCG5AAAAL8BAAARAAAAd29yZC9kb2N1bWVudC54bWyVkU1LxDAQhu/+iiF4UMSmCn7QbbrgQcSDF+t9Y5ptA8lMSLJbRfzvJosfBz2sl5cZhucZmGmXL87CVodoCAU7q2oGGhUNBkfBnvrb02u27A7auRlIbZzGBBnA2MyCTSn5hvOoJu1krMhrzLM1BSdTbsPIZwqDD6R0jNnnLD+v60vupEHWZeUzDa87ty9dKJG6G2nASgeOEO7lVj6qYHxqeZmVDLv0vzhFGBNE6qfNwyQTCLhY/Iu6y4sFXO0NJcIxAz8bT749ezrI6srSeLTqs6qBw7eifF8d/4nzz3uV4usX3QdQSwECFAAUAAAACACMPP5ceEqwhuQAAAC/AQAAEQAAAAAAAAAAAAAAgAEAAAAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAEAAQA/AAAAEwEAAAAA";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const GOOD_ANSWER = [
  "const soThuNhat = 5;",
  "const soThuHai = 7;",
  "const tong = soThuNhat + soThuHai;",
  "console.log(`Tong: ${tong}`);",
].join("\n");

let gv: TestUser;
let otherGv: TestUser;
let courseId: string;
let assignmentId: string;
/** Đề có dòng DB nhưng file đã bị xóa khỏi bucket — để thử nhánh 404. */
let brokenAssignmentId: string;
/** Đề không có file đính kèm nào (`spec_file_path` null). */
let filelessAssignmentId: string;

function textFile(name: string, content: string, mimeType = "text/javascript"): GradeInputFile {
  const bytes = Buffer.from(content, "utf8");
  return { name, mimeType, contentB64: bytes.toString("base64"), size: bytes.length };
}

/** Đếm ĐỆ QUY mọi file trong bucket đề bài (file nằm trong thư mục theo course_id). */
async function countSpecFiles(prefix = ""): Promise<number> {
  const { data } = await admin().storage.from(SPEC_BUCKET).list(prefix, { limit: 1000 });
  let total = 0;
  for (const item of data ?? []) {
    // Thư mục thì `id` là null trong API Storage của Supabase.
    if (item.id === null) {
      total += await countSpecFiles(prefix ? `${prefix}/${item.name}` : item.name);
    } else {
      total += 1;
    }
  }
  return total;
}

beforeAll(async () => {
  gv = await createUser(`e3g.gv.${ts}`, { full_name: "GV Cham Bai", role: "teacher" });
  otherGv = await createUser(`e3g.gv2.${ts}`, { full_name: "GV Khac", role: "teacher" });

  const teacher = await clientFor(gv);
  const { data: course, error: courseErr } = await teacher
    .from("courses")
    .insert({ code: CODE, name: "JavaScript Basic", teacher_id: gv.id })
    .select("id")
    .single();
  if (courseErr) throw new Error(`Tạo khóa: ${courseErr.message}`);
  courseId = course.id;
  trackCourseCode(CODE);

  const specPath = `${courseId}/de-buoi-1.md`;
  const spec = [
    "# Đề bài buổi 1: Tính tổng",
    "Viết chương trình JavaScript:",
    "1. Khai báo 2 biến a=5, b=7 bằng let hoặc const",
    "2. Tính tổng và in ra console dạng `Tong: 12`",
    "3. Đặt tên biến rõ nghĩa",
  ].join("\n");
  const { error: uploadErr } = await teacher.storage
    .from(SPEC_BUCKET)
    .upload(specPath, new Blob([spec], { type: "text/markdown" }));
  if (uploadErr) throw new Error(`Upload đề: ${uploadErr.message}`);
  trackFile(specPath);

  const rows = [
    { session_number: 1, title: "Tinh tong hai so", spec_file_path: specPath },
    // Trỏ tới file KHÔNG tồn tại — ai-service phải trả 404 chứ không sập.
    { session_number: 2, title: "De hong", spec_file_path: `${courseId}/khong-co-that.md` },
    { session_number: 3, title: "De chua co file", spec_file_path: null },
  ];
  const { data: created, error: assignErr } = await teacher
    .from("assignments")
    .insert(rows.map((r) => ({ ...r, course_id: courseId })))
    .select("id, session_number");
  if (assignErr) throw new Error(`Tạo đề: ${assignErr.message}`);

  const bySession = new Map(created!.map((a) => [a.session_number, a.id]));
  assignmentId = bySession.get(1)!;
  brokenAssignmentId = bySession.get(2)!;
  filelessAssignmentId = bySession.get(3)!;
});

afterAll(cleanupAll);

describe("gradeFiles — chặn TRƯỚC khi gọi AI (không tốn lượt Gemini)", () => {
  it("should refuse a signed-out caller", async () => {
    const { error } = await runAs(null, () =>
      gradeFiles({ assignmentId, files: [textFile("a.js", "console.log(1);")] })
    );
    expect(error).toContain("Phiên đăng nhập");
  });

  it("should refuse an empty file list", async () => {
    const { error } = await runAs(gv, () => gradeFiles({ assignmentId, files: [] }));
    expect(error).toBe("Chưa chọn file bài làm.");
  });

  it("should refuse more files than the budget allows", async () => {
    const files = Array.from({ length: GRADING_BUDGET.maxFiles + 1 }, (_, i) =>
      textFile(`file-${i}.js`, "console.log(1);")
    );
    const { error } = await runAs(gv, () => gradeFiles({ assignmentId, files }));
    expect(error).toContain(`Tối đa ${GRADING_BUDGET.maxFiles} file`);
  });

  it("should refuse a payload over the total size budget", async () => {
    // Guard THẬT ở server: vượt `bodySizeLimit` của Next thì lỗi rất mờ mịt.
    // `size` là số byte GỐC nên khai báo là đủ, không cần dựng file thật.
    const files: GradeInputFile[] = [
      { ...textFile("to.js", "x"), size: GRADING_BUDGET.maxTotalBytes + 1 },
    ];
    const { error } = await runAs(gv, () => gradeFiles({ assignmentId, files }));
    expect(error).toContain("dung lượng file quá lớn");
  });

  it("should not find an assignment that belongs to another teacher", async () => {
    // RLS `assignments_teacher_all` là hàng rào; nếu thủng thì GV bất kỳ chấm
    // được trên đề của người khác.
    const { error } = await runAs(otherGv, () =>
      gradeFiles({ assignmentId, files: [textFile("a.js", "console.log(1);")] })
    );
    expect(error).toBe("Không tìm thấy đề bài.");
  });

  it("should refuse an assignment with no spec file attached", async () => {
    const { error } = await runAs(gv, () =>
      gradeFiles({
        assignmentId: filelessAssignmentId,
        files: [textFile("a.js", "console.log(1);")],
      })
    );
    expect(error).toContain("chưa có file");
  });
});

describe("extractZipForGrading — giải nén bài nộp, không đụng AI", () => {
  it("should refuse a signed-out caller", async () => {
    const zip = Buffer.from(buildZip([{ name: "a.js", content: "console.log(1);" }]));
    const { error } = await runAs(null, () =>
      extractZipForGrading({ zipB64: zip.toString("base64") })
    );
    expect(error).toContain("Phiên đăng nhập");
  });

  it("should keep source files and drop the junk around them", async () => {
    const zip = Buffer.from(
      buildZip([
        { name: "bai-lam/index.js", content: GOOD_ANSWER },
        { name: "bai-lam/style.css", content: "body { margin: 0; }" },
        // Rác quen thuộc trong thư mục bài nộp — bỏ IM LẶNG, không báo lỗi đỏ.
        { name: "bai-lam/node_modules/left-pad/index.js", content: "module.exports=1;" },
        { name: "bai-lam/.git/config", content: "[core]" },
      ])
    );
    const { files, skipped, error } = await runAs(gv, () =>
      extractZipForGrading({ zipB64: zip.toString("base64") })
    );
    expect(error).toBeUndefined();

    const names = (files ?? []).map((f) => f.name);
    expect(names).toContain("bai-lam/index.js");
    expect(names).toContain("bai-lam/style.css");
    expect(names.some((n) => n.includes("node_modules"))).toBe(false);
    expect(names.some((n) => n.includes(".git"))).toBe(false);
    expect(skipped).toBeDefined();

    // Nội dung phải đi qua nguyên vẹn dưới dạng base64 — đây là thứ gửi cho AI.
    const index = (files ?? []).find((f) => f.name === "bai-lam/index.js")!;
    expect(Buffer.from(index.contentB64, "base64").toString("utf8")).toBe(GOOD_ANSWER);
    expect(index.size).toBeGreaterThan(0);
  });

  it("should report a broken archive instead of throwing", async () => {
    const { files, error } = await runAs(gv, () =>
      extractZipForGrading({ zipB64: Buffer.from("khong phai zip").toString("base64") })
    );
    expect(error, "file .zip hỏng phải ra thông báo, không phải stack trace").toBeTruthy();
    expect(files).toBeUndefined();
  });
});

describe("gradeFiles — lỗi từ ai-service (không tốn lượt Gemini)", () => {
  it("should surface a missing spec file as a readable message", async () => {
    const { grade, error } = await runAs(gv, () =>
      gradeFiles({
        assignmentId: brokenAssignmentId,
        files: [textFile("a.js", "console.log(1);")],
      })
    );
    expect(grade).toBeUndefined();
    expect(error, "phải là câu tiếng Việt, không phải lỗi thô").toBeTruthy();
    expect(error).not.toContain("undefined");
  });

  it("should reject a legacy .doc submission with guidance", async () => {
    // ai-service chặn ở tầng trích chữ (400) TRƯỚC khi gọi Gemini — không chấm
    // bừa trên bytes rác.
    const { error } = await runAs(gv, () =>
      gradeFiles({
        assignmentId,
        files: [textFile("bai-lam.doc", "noi dung word cu", "application/msword")],
      })
    );
    expect(error).toBeTruthy();
    expect(error).toContain(".docx");
  });
});

describe("gradeFiles — chấm thật bằng Gemini (3 lượt)", () => {
  let goodScore = 0;

  it("should grade a good submission and return score + bullets", async () => {
    const { grade, error } = await runAs(gv, () =>
      gradeFiles({ assignmentId, files: [textFile("bai-lam.js", GOOD_ANSWER)] })
    );
    expect(error, "đỏ ở đây thì NGHI GEMINI TRƯỚC — đọc log ai-service").toBeUndefined();
    expect(Number.isInteger(grade!.score)).toBe(true);
    expect(grade!.score).toBeGreaterThanOrEqual(0);
    expect(grade!.score).toBeLessThanOrEqual(100);
    expect(grade!.bullets.length).toBeGreaterThan(0);

    // Nhận xét phải NGẮN và không tự thêm ký tự đầu dòng (UI tự thêm bullet).
    for (const bullet of grade!.bullets) {
      expect(bullet.length).toBeLessThan(300);
      expect(/^\s*[-•*]/.test(bullet)).toBe(false);
    }
    goodScore = grade!.score;
  });

  it("should read a Word .docx submission", async () => {
    // Gemini KHÔNG đọc được .docx nhị phân — ai-service phải tự trích chữ ra.
    const { grade, error } = await runAs(gv, () =>
      gradeFiles({
        assignmentId,
        files: [
          {
            name: "bai-lam.docx",
            mimeType: DOCX_MIME,
            contentB64: DOCX_B64,
            size: Buffer.from(DOCX_B64, "base64").length,
          },
        ],
      })
    );
    expect(error, "đỏ ở đây thì NGHI GEMINI TRƯỚC — đọc log ai-service").toBeUndefined();
    expect(grade!.score).toBeGreaterThanOrEqual(50);
  });

  it("should score a submission that misses the requirements lower", async () => {
    const { grade, error } = await runAs(gv, () =>
      gradeFiles({
        assignmentId,
        files: [textFile("bai-lam.js", "console.log('hello');")],
      })
    );
    expect(error, "đỏ ở đây thì NGHI GEMINI TRƯỚC — đọc log ai-service").toBeUndefined();
    expect(grade!.score, `tốt=${goodScore} vs kém=${grade!.score}`).toBeLessThan(goodScore);
  });
});

describe("chấm bài KHÔNG lưu gì", () => {
  it("should not write a single file to Storage while a request goes through", async () => {
    // Toàn bộ web chỉ có ĐÚNG 1 lệnh `.upload()` (file đề trong
    // `createAssignment`). Bucket phình sau khi chấm nghĩa là ai đó đã thêm
    // bước upload vào đường chấm bài.
    const before = await countSpecFiles();

    // Lượt này đi hết đường web → ai-service → đọc file đề từ Storage, chỉ dừng
    // ngay TRƯỚC Gemini (ai-service từ chối .doc đời cũ). Đủ để lộ mọi bước ghi
    // lén mà không tiêu một lượt hạn mức nào.
    await runAs(gv, () =>
      gradeFiles({
        assignmentId,
        files: [textFile("bai-lam.doc", "noi dung", "application/msword")],
      })
    );

    expect(await countSpecFiles()).toBe(before);
  });

  it("should not keep any submission or grade table around", async () => {
    // Bảng `submissions`/`grades` đã bị XÓA (migration 20260718000000) — nếu ai
    // hồi sinh chúng thì chấm bài lại bắt đầu lưu bài làm của học viên.
    //
    // ⚠️ KHÔNG dùng `{ head: true }` ở đây: request HEAD không có body nên
    // supabase-js trả `error: null` CẢ KHI bảng không tồn tại — đã đo, kể cả với
    // một cái tên bịa hoàn toàn. Ca này khi đó pass suông theo cả hai chiều.
    for (const table of ["submissions", "grades"] as const) {
      const { error } = await admin()
        .from(table as unknown as "profiles")
        .select("id")
        .limit(1);
      expect(error?.code, `bảng "${table}" không được tồn tại lại`).toBe("PGRST205");
    }

    // Đối chứng: cùng cách gọi trên một bảng CÓ THẬT phải không lỗi — nếu không
    // thì ca trên xanh chỉ vì mọi truy vấn đều hỏng.
    const { error: control } = await admin().from("profiles").select("id").limit(1);
    expect(control).toBeNull();
  });
});
