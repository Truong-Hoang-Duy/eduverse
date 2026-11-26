/**
 * Trích xuất mã nguồn và markdown từ Jupyter Notebook (.ipynb).
 *
 * Bản TS này chạy song song với `ipynb_to_text` bên `ai-service/app/storage.py`
 * (dùng cho đường AI chấm bài) — sửa luật trích chữ ở một bên nhớ xem bên kia.
 *
 * Jupyter Notebook là file JSON chứa các ô (cells): code, markdown, raw.
 * Khi chạy notebook, `outputs` có thể chứa ảnh biểu đồ dạng base64 (matplotlib/seaborn)
 * rất nặng. Hàm này:
 * - Trích xuất các ô Markdown và Code theo thứ tự kèm chỉ số ô (# [Cell N - ...]).
 * - Trích xuất text outputs (kết quả print, bảng text, lỗi exception).
 * - Bỏ qua ảnh base64 trong outputs để tránh làm tràn token và loãng ngữ cảnh AI.
 * - Nếu không parse được JSON (file hỏng hoặc văn bản thuần), trả về nguyên văn chuỗi gốc.
 */

interface NotebookCell {
  cell_type?: string;
  source?: string | string[];
  outputs?: NotebookOutput[];
}

interface NotebookOutput {
  output_type?: string;
  text?: string | string[];
  data?: Record<string, unknown>;
  ename?: string;
  evalue?: string;
}

interface NotebookData {
  cells?: NotebookCell[];
}

export function ipynbToText(raw: string): string {
  try {
    const nb = JSON.parse(raw) as NotebookData;
    if (!nb || !Array.isArray(nb.cells)) return raw;

    const parts: string[] = [];
    let idx = 1;

    for (const cell of nb.cells) {
      if (!cell || typeof cell !== "object") continue;
      const cellType = cell.cell_type || "code";
      const source = Array.isArray(cell.source)
        ? cell.source.join("")
        : String(cell.source ?? "");

      const trimmedSource = source.trim();
      if (!trimmedSource) {
        idx++;
        continue;
      }

      if (cellType === "markdown") {
        parts.push(`# [Cell ${idx} - Markdown]\n${trimmedSource}`);
      } else if (cellType === "code") {
        let cellStr = `# [Cell ${idx} - Code]\n${trimmedSource}`;
        const outputs = Array.isArray(cell.outputs) ? cell.outputs : [];
        const outputTexts: string[] = [];

        for (const out of outputs) {
          if (!out || typeof out !== "object") continue;
          if (out.text) {
            const t = Array.isArray(out.text) ? out.text.join("") : String(out.text);
            if (t.trim()) outputTexts.push(t.trim());
          } else if (out.data && typeof out.data === "object") {
            const plain = out.data["text/plain"];
            if (plain) {
              const t = Array.isArray(plain) ? plain.join("") : String(plain);
              if (t.trim()) outputTexts.push(t.trim());
            }
          } else if (out.output_type === "error") {
            const ename = out.ename || "";
            const evalue = out.evalue || "";
            outputTexts.push(`Error: ${ename}: ${evalue}`.trim());
          }
        }

        if (outputTexts.length > 0) {
          let combined = outputTexts.join("\n");
          if (combined.length > 2000) {
            combined = combined.slice(0, 2000) + "\n... [Output truncated]";
          }
          cellStr += `\n# [Output]\n# ${combined.replace(/\n/g, "\n# ")}`;
        }
        parts.push(cellStr);
      } else {
        parts.push(`# [Cell ${idx} - ${cellType}]\n${trimmedSource}`);
      }
      idx++;
    }

    return parts.length > 0 ? parts.join("\n\n") : raw;
  } catch {
    return raw;
  }
}
