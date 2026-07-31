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
// Bộ này phủ CẢ `/teacher/assignments` (chấm bài) lẫn tab "Hỏi bài" — hai công
// cụ dùng chung đề bài, chung guard, chung đường file, nên dùng chung fixture
// luôn thay vì tạo thêm một bộ tài khoản + khóa + đề cho mỗi lần chạy.
//
// ⚠️ HẠN MỨC GEMINI free tier là 20 lượt/NGÀY. Bộ này cố ý chỉ tiêu 5 lượt (3
// chấm bài + 2 hỏi bài): mọi ca chặn-trước-khi-gọi-AI và 2 ca lỗi của ai-service
// (.doc đời cũ, đề không tồn tại) đều KHÔNG đụng tới Gemini. Thêm ca gọi AI thì
// cân nhắc kỹ.
// E2E gọi AI đỏ thì NGHI GEMINI TRƯỚC — đọc log ai-service, đừng sửa code.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  extractZipForGrading,
  gradeFiles,
  type GradeInputFile,
} from "@/lib/actions/grading";
import { helpStudent } from "@/lib/actions/student-help";
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
/** Đề buổi 5/9/14: có trắc nghiệm KÈM ĐÁP ÁN in trong đề + phần thực hành. */
let quizAssignmentId: string;

/** Đáp án đúng: 1-C, 2-B, 3-C — in thẳng trong đề để AI đối chiếu. */
const QUIZ_SPEC = [
  "# Đề buổi 4: Lý thuyết + Thực hành",
  "",
  "## Phần 1 — Trắc nghiệm (3 câu)",
  "Câu 1: Từ khóa nào dùng để khai báo hằng số trong JavaScript?",
  "A. var    B. let    C. const    D. function",
  "Câu 2: Kết quả của phép 2 + \"2\" trong JavaScript là gì?",
  "A. 4    B. \"22\"    C. báo lỗi    D. undefined",
  "Câu 3: Vòng lặp nào chắc chắn chạy ít nhất một lần?",
  "A. for    B. while    C. do...while    D. forEach",
  "",
  "ĐÁP ÁN PHẦN TRẮC NGHIỆM: 1-C, 2-B, 3-C",
  "",
  "## Phần 2 — Thực hành",
  "Khai báo a=5, b=7, tính tổng và in ra màn hình dạng `Tong: 12`.",
].join("\n");

/** Em chọn 1-C (đúng), 2-A (SAI, đúng là B), 3-C (đúng) → 2/3. */
const QUIZ_ANSWERS = [
  "Phần trắc nghiệm:",
  "Câu 1: C",
  "Câu 2: A",
  "Câu 3: C",
].join("\n");

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

  // Đề buổi 4: có trắc nghiệm kèm đáp án in trong đề.
  const quizPath = `${courseId}/de-buoi-4.md`;
  const { error: quizUploadErr } = await teacher.storage
    .from(SPEC_BUCKET)
    .upload(quizPath, new Blob([QUIZ_SPEC], { type: "text/markdown" }));
  if (quizUploadErr) throw new Error(`Upload đề trắc nghiệm: ${quizUploadErr.message}`);
  trackFile(quizPath);

  const rows = [
    { session_number: 1, title: "Tinh tong hai so", spec_file_path: specPath },
    // Trỏ tới file KHÔNG tồn tại — ai-service phải trả 404 chứ không sập.
    { session_number: 2, title: "De hong", spec_file_path: `${courseId}/khong-co-that.md` },
    { session_number: 3, title: "De chua co file", spec_file_path: null },
    { session_number: 4, title: "Ly thuyet va thuc hanh", spec_file_path: quizPath },
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
  quizAssignmentId = bySession.get(4)!;
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
    expect(grade!.score!).toBeGreaterThanOrEqual(0);
    expect(grade!.score!).toBeLessThanOrEqual(100);
    expect(grade!.bullets.length).toBeGreaterThan(0);

    // Mặc định là chấm THỰC HÀNH — không được lòi ra bảng trắc nghiệm bịa.
    expect(grade!.quiz, "chế độ mặc định không có phần trắc nghiệm").toBeNull();

    // Nhận xét phải NGẮN và không tự thêm ký tự đầu dòng (UI tự thêm bullet).
    for (const bullet of grade!.bullets) {
      expect(bullet.length).toBeLessThan(300);
      expect(/^\s*[-•*]/.test(bullet)).toBe(false);
    }
    goodScore = grade!.score!;
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

describe("gradeFiles — chấm trắc nghiệm bằng đáp án in trong đề (1 lượt)", () => {
  it("should mark each question against the key printed in the spec", async () => {
    // Ca đáng giá nhất của tính năng: đáp án nằm trong ĐỀ (1-C, 2-B, 3-C), em
    // chọn 1-C, 2-A, 3-C. Chấm đúng nghĩa là AI đã ĐỌC đáp án của giáo viên chứ
    // không tự suy ra theo hiểu biết của nó.
    const { grade, error } = await runAs(gv, () =>
      gradeFiles({
        assignmentId: quizAssignmentId,
        mode: "both",
        files: [
          textFile("dap-an.txt", QUIZ_ANSWERS, "text/plain"),
          textFile("bai-lam.js", GOOD_ANSWER),
        ],
      })
    );
    expect(error, "đỏ ở đây thì NGHI GEMINI TRƯỚC — đọc log ai-service").toBeUndefined();

    const quiz = grade!.quiz!;
    expect(quiz.tong_so).toBe(3);
    expect(quiz.so_dung).toBe(2);

    const wrong = quiz.cau_hoi.filter((c) => !c.dung);
    expect(wrong.map((c) => c.cau), "chỉ câu 2 sai").toEqual([2]);
    expect(wrong[0].dap_an_dung.toUpperCase()).toContain("B");

    // Chế độ "both" phải có ĐỦ cả hai phần, và điểm thực hành KHÔNG bị trộn.
    expect(grade!.score).not.toBeNull();
    expect(grade!.bullets.length).toBeGreaterThan(0);
  });
});

describe("helpStudent — chặn TRƯỚC khi gọi AI (không tốn lượt Gemini)", () => {
  const oneFile = [textFile("bai-lam.js", "console.log(1);")];

  it("should refuse a signed-out caller", async () => {
    const { error } = await runAs(null, () =>
      helpStudent({ assignmentId, files: oneFile })
    );
    expect(error).toContain("Phiên đăng nhập");
  });

  it("should require an assignment to give hints about", async () => {
    const { error } = await runAs(gv, () =>
      helpStudent({ assignmentId: "", files: [] })
    );
    expect(error).toContain("chọn đề bài");
  });

  it("should refuse more files than the budget allows", async () => {
    const files = Array.from({ length: GRADING_BUDGET.maxFiles + 1 }, (_, i) =>
      textFile(`file-${i}.js`, "console.log(1);")
    );
    const { error } = await runAs(gv, () => helpStudent({ assignmentId, files }));
    expect(error).toContain(`Tối đa ${GRADING_BUDGET.maxFiles} file`);
  });

  it("should refuse a payload over the total size budget", async () => {
    const files: GradeInputFile[] = [
      { ...textFile("to.js", "x"), size: GRADING_BUDGET.maxTotalBytes + 1 },
    ];
    const { error } = await runAs(gv, () => helpStudent({ assignmentId, files }));
    expect(error).toContain("dung lượng file quá lớn");
  });

  it("should not find an assignment that belongs to another teacher", async () => {
    const { error } = await runAs(otherGv, () =>
      helpStudent({ assignmentId, files: oneFile })
    );
    expect(error).toBe("Không tìm thấy đề bài.");
  });

  it("should refuse an assignment with no spec file attached", async () => {
    const { error } = await runAs(gv, () =>
      helpStudent({ assignmentId: filelessAssignmentId, files: oneFile })
    );
    expect(error).toContain("chưa có file");
  });

  it("should ACCEPT an empty file list — that is the 'em chưa biết bắt đầu' case", async () => {
    // Khác hẳn `gradeFiles` (đòi ít nhất 1 file). Dùng đề hỏng để đi hết guard
    // rồi dừng ở bước tải đề — chứng minh không guard nào chặn, mà KHÔNG tốn
    // một lượt Gemini nào.
    const { error } = await runAs(gv, () =>
      helpStudent({ assignmentId: brokenAssignmentId, files: [] })
    );
    expect(error, "danh sách file rỗng phải đi lọt mọi guard").not.toContain(
      "Chưa chọn"
    );
    expect(error).toBeTruthy();
  });
});

describe("helpStudent — gợi ý thật bằng Gemini (2 lượt)", () => {
  it("should give starting steps and no diagnosis when there is no code", async () => {
    const { help, error } = await runAs(gv, () =>
      helpStudent({
        assignmentId,
        files: [],
        question: "Em chưa biết bắt đầu từ đâu ạ",
      })
    );
    expect(error, "đỏ ở đây thì NGHI GEMINI TRƯỚC — đọc log ai-service").toBeUndefined();

    expect(help!.cac_buoc.length).toBeGreaterThan(0);
    // Em chưa gửi gì thì không thể chẩn đoán "em đang ở đâu" hay "cần sửa gì".
    expect(help!.dang_o_dau).toBe("");
    expect(help!.can_sua).toEqual([]);
  });

  it("should diagnose where the student got to when code is attached", async () => {
    const halfDone = [
      // Khai báo biến xong, CHƯA tính tổng — đúng kiểu bài dở em hay gửi.
      textFile("bai-lam.js", "const a = 5;\nconst b = 7;\nconsole.log(a);"),
    ];
    const { help, error } = await runAs(gv, () =>
      helpStudent({
        assignmentId,
        files: halfDone,
        question: "Em chạy ra 5 thôi ạ, không ra Tong: 12",
      })
    );
    expect(error, "đỏ ở đây thì NGHI GEMINI TRƯỚC — đọc log ai-service").toBeUndefined();

    expect(help!.dang_o_dau, "có code thì phải nói được em đang ở đâu").not.toBe("");
    expect(help!.cac_buoc.length).toBeGreaterThan(0);
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
