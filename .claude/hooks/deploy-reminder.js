// UserPromptSubmit hook: khi prompt của user có chữ "deploy", tự động chèn
// nội dung .claude/docs/GIT-WORKFLOW-RULES.md vào context của lượt đó.
//
// Vì sao cần: file đó siết hơn CLAUDE.md (cấm tự merge develop->main, cấm
// Co-Authored-By trong commit, bắt xác nhận riêng từng lần commit/push) nhưng
// KHÔNG nằm trong docs router của CLAUDE.md nên Claude không tự đọc — chỉ nạp
// khi user gõ thẳng @đường-dẫn. Từng có lần Claude không biết file này tồn
// tại và làm sai (2026-08-29). Hook này đảm bảo file luôn được nạp đúng lúc
// thay vì trông chờ Claude tự nhớ ra.
//
// Dùng Node (CommonJS) thay vì jq vì máy chạy hook này không có jq cài sẵn.

const fs = require("fs");
const path = require("path");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

let input;
try {
  input = JSON.parse(readStdin() || "{}");
} catch {
  input = {};
}

const prompt = typeof input.prompt === "string" ? input.prompt : "";

if (/deploy/i.test(prompt)) {
  const rulesPath = path.join(__dirname, "..", "docs", "GIT-WORKFLOW-RULES.md");
  let rules;
  try {
    rules = fs.readFileSync(rulesPath, "utf8");
  } catch (err) {
    // File bị xóa/đổi tên: đừng chặn prompt của user, chỉ báo lỗi ra stderr.
    process.stderr.write(`deploy-reminder hook: không đọc được ${rulesPath}: ${err.message}\n`);
    process.exit(0);
  }

  const additionalContext =
    '[Tự động chèn vì prompt có chữ "deploy"] Đây là ' +
    ".claude/docs/GIT-WORKFLOW-RULES.md — áp dụng TRƯỚC khi làm bất kỳ thao " +
    "tác git nào trong lượt này (không tự ý merge develop->main, không thêm " +
    "dòng Co-Authored-By vào commit, chỉ commit/push khi user xác nhận riêng " +
    "từng lần):\n\n" +
    rules;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext,
      },
    })
  );
}
