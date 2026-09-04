// Chuyển mẫu tin Zalo (chứa markup nhẹ do GV tự gõ) thành nội dung dán được
// vào khung chat Zalo PC với đúng định dạng.
//
// Zalo PC là khung soạn thảo contenteditable: dán HTML từ ứng dụng ngoài ĐƯỢC
// giữ định dạng nếu chỉ dùng đúng tập thẻ mà bảng "Định dạng văn bản"
// (Ctrl+Shift+X) của Zalo hỗ trợ — <b>, <i>, <br> — xem
// `.claude/docs/DECISIONS.md` (nghiên cứu 2026-09-04). Zalo KHÔNG có bảng chọn
// màu nên cố tình không sinh ra màu chữ; header dùng đậm để thay thế.
// <p>/<li> lồng nhau bị Zalo chèn thêm dòng trống khi dán — vì vậy toàn bộ nội
// dung gói trong MỘT <div>, xuống dòng bằng <br>, bullet là ký tự "• " thuần
// (không dùng <ul><li> thật).
//
// Cú pháp markup GV gõ trong `zalo_templates.template_text`:
//   **đậm**       → <b>đậm</b>
//   _nghiêng_     → <i>nghiêng</i>
//   "- " đầu dòng → gạch đầu dòng ("• " khi copy)
//
// Cặp ký hiệu ĐƯỢC PHÉP TRẢI QUA NHIỀU DÒNG (GV gõ `**` ở đầu lời chào và đóng
// mãi 2 đoạn sau — bản đầu quét từng dòng riêng nên không khớp, in ra nguyên
// ký hiệu `**`; sửa 2026-09-04). Vì thế markup được thay TRƯỚC khi tách dòng và
// thẻ được để ÔM QUA `<br>` (`<b>dòng 1<br>dòng 2</b>`).
//
// ⚠️ ĐỪNG "cẩn thận" đóng thẻ cuối mỗi dòng rồi mở lại ở dòng sau
// (`</b><br><b>`): đã thử 2026-09-04 và Zalo coi mỗi cụm thẻ là một KHỐI
// riêng nên chèn thêm một dòng trống giữa chúng — chữ ký "Trân trọng, / Thầy
// Duy" bị tách đôi. Thẻ ôm qua `<br>` mới ra đúng khoảng cách.

/** Chỉ khớp THẺ DO CHÍNH FILE NÀY chèn — chữ của GV đã được escape trước đó
 *  nên không còn ký tự `<`/`>` thật nào lọt vào đây. */
const INLINE_TAG_RE = /<\/?[bi]>/g;

const BOLD_RE = /\*\*([\s\S]+?)\*\*/g;

/** `_nghiêng_`: dấu mở phải đứng đầu chuỗi / sau khoảng trắng / sau một thẻ vừa
 *  mở, dấu đóng phải đứng trước khoảng trắng, dấu câu, thẻ hoặc cuối chuỗi —
 *  để `snake_case` và tên placeholder gõ nhầm không bị hiểu thành in nghiêng. */
const ITALIC_RE = /(^|[\s>])_(\S|\S[\s\S]*?\S)_(?=[\s<.,;:!?)]|$)/g;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isBulletLine(line: string): boolean {
  return /^[-•]\s+/.test(line);
}

/** Bỏ ký hiệu gạch đầu dòng, kể cả khi bị LẶP: GV gõ `- {tom_tat}` trong mẫu mà
 *  AI cũng đã thêm "- " cho từng kiến thức → dòng đầu thành "- - Vòng lặp for".
 *  Gộp lại thành đúng MỘT bullet thay vì in ra "• - Vòng lặp for". */
function bulletContent(line: string): string {
  return line.replace(/^(?:[-•]\s+)+/, "");
}

/** Nội dung HTML để ghi vào clipboard (`text/html`) — dán vào Zalo lên đúng đậm/nghiêng/bullet. */
export function zaloMarkupToHtml(text: string): string {
  const withMarkup = escapeHtml(text)
    .replace(BOLD_RE, "<b>$1</b>")
    .replace(ITALIC_RE, "$1<i>$2</i>");

  const htmlLines = withMarkup.split("\n").map((line) => {
    // Dòng trống thật sự rỗng khiến "<br><br>" bị Zalo gộp mất, không ra khoảng
    // cách nào khi dán — chèn "&nbsp;" để dòng có nội dung (dù vô hình). Vẫn
    // giữ nguyên thẻ nằm trên dòng đó, bỏ đi là hỏng cặp đóng/mở.
    if (line.replace(INLINE_TAG_RE, "").trim() === "") {
      return `${line.replace(/\s+/g, "")}&nbsp;`;
    }
    return isBulletLine(line) ? `• ${bulletContent(line)}` : line;
  });

  return `<div>${htmlLines.join("<br>")}</div>`;
}

/** Nội dung `text/plain` dự phòng — bỏ ký tự markup, chuẩn hóa bullet thành "• ". */
export function zaloMarkupToPlainText(text: string): string {
  return text
    .replace(BOLD_RE, "$1")
    .replace(ITALIC_RE, "$1$2")
    .split("\n")
    .map((line) => (isBulletLine(line) ? `• ${bulletContent(line)}` : line))
    .join("\n");
}
