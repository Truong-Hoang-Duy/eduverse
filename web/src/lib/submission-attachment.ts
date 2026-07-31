/**
 * Đường "file nhị phân" dùng chung cho tab Bài tập hàng ngày và tab Hỏi bài.
 *
 * Hai tab đó gửi file dạng base64 (giữ được ảnh chụp code, ảnh giao diện, PDF),
 * khác tab Sản phẩm cuối khóa vốn chỉ gửi CHỮ. Đây là chỗ duy nhất biết cách bọc
 * và đóng gói kiểu file đó — trước đây mỗi tab tự chép một bản.
 *
 * Dùng `FileReader` nên CHỈ import từ client component.
 */

import type { GradeInputFile } from "@/lib/actions/grading";
import { checkFileReadable } from "@/lib/file-check";
import type { PickedFile } from "@/lib/read-dropped-files";
import type { PickedItem } from "@/lib/use-submission-picker";

/**
 * Một file chờ gửi AI. Lấy từ máy thì còn `file` gốc (base64 hóa lúc bấm gửi, để
 * không giữ chuỗi base64 to trong state); lấy từ .zip thì server đã giải nén sẵn
 * nên chỉ có `contentB64`.
 */
export interface Attachment extends PickedItem {
  file: File | null;
  contentB64: string | null;
  mimeType: string;
}

/** Đọc File thành base64 (bỏ phần "data:...;base64," ở đầu). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error(`Không đọc được file ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Bọc file người dùng chọn — chưa đọc nội dung, để nạp thư mục lớn vẫn nhanh. */
export function attachmentsFromPicked(picked: PickedFile[]): { items: Attachment[] } {
  return {
    items: picked.map(({ file, path }) => ({
      // Cùng tên + cùng cỡ + cùng giờ sửa = cùng một file, dù thả mấy lượt.
      key: `${path}:${file.size}:${file.lastModified}`,
      path,
      size: file.size,
      file,
      contentB64: null,
      mimeType: file.type,
    })),
  };
}

/** Bọc file server vừa giải nén từ .zip — đã có sẵn nội dung base64. */
export function attachmentFromZipEntry(entry: GradeInputFile): Attachment {
  return {
    key: `zip:${entry.name}:${entry.size}`,
    path: entry.name,
    size: entry.size,
    file: null,
    contentB64: entry.contentB64,
    mimeType: entry.mimeType,
  };
}

/**
 * Đóng gói để gửi Server Action.
 *
 * Trả `{ error }` thay vì ném, vì lỗi hay gặp nhất ở đây là file bị DLP của công
 * ty mã hóa — cần hiện nguyên câu hướng dẫn cho GV chứ không phải một stack trace.
 * Chặn ngay tại máy: gửi lên AI thì nó cũng chỉ nhận được bytes rác.
 */
export async function toGradeInputFiles(
  items: Attachment[]
): Promise<{ files?: GradeInputFile[]; error?: string }> {
  const files: GradeInputFile[] = [];

  for (const item of items) {
    if (item.file) {
      const unreadable = await checkFileReadable(item.file);
      if (unreadable) return { error: unreadable };
    }
    files.push({
      name: item.path,
      mimeType: item.mimeType,
      contentB64: item.contentB64 ?? (await fileToBase64(item.file!)),
      size: item.size,
    });
  }

  return { files };
}
