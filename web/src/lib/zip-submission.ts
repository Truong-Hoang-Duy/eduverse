/**
 * Giải nén .zip bài làm của học viên + lọc rác — dùng chung cho CẢ hai tab chấm
 * bài. Chỉ chạy SERVER (qua `zip.ts` dùng `node:zlib`).
 *
 * File bài làm KHÔNG được lưu ở đâu cả: bytes chỉ tồn tại trong RAM của request
 * này rồi gửi thẳng sang ai-service. Đừng thêm bước upload Storage vào đây.
 */
import "server-only";

import { looksEncrypted } from "@/lib/file-check";
import {
  emptyTally,
  skipReasonFor,
  type Budget,
  type FilterOptions,
  type SkipTally,
} from "@/lib/submission-files";
import { listZipEntries, type ZipEntry } from "@/lib/zip";

/** Trần cho chính file .zip gửi lên (trước khi giải nén). */
export const ZIP_MAX_BYTES = 6 * 1024 * 1024;

export interface UnzipResult {
  entries?: ZipEntry[];
  skipped?: SkipTally;
  error?: string;
}

export function unzipSubmission(
  zipB64: string,
  options: FilterOptions,
  budget: Budget
): UnzipResult {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(zipB64, "base64"));
  } catch {
    return { error: "File .zip gửi lên bị lỗi, hãy thử lại." };
  }

  if (bytes.length === 0) {
    return { error: "File .zip rỗng." };
  }
  if (bytes.length > ZIP_MAX_BYTES) {
    return {
      error: `File .zip nặng ${Math.round(bytes.length / 1024 / 1024)}MB, quá 6MB. Hãy giải nén rồi chọn thư mục thay vì gửi cả file nén.`,
    };
  }

  const skipped = emptyTally();

  // `keep` chặn theo TÊN trước khi bung dữ liệu → node_modules vài trăm MB không
  // bao giờ được giải nén vào RAM.
  const found = listZipEntries(bytes, (name) => {
    const reason = skipReasonFor(name, options);
    if (reason) {
      skipped[reason] += 1;
      return false;
    }
    return true;
  });

  if (found.length === 0) {
    return {
      error:
        "Trong file .zip không có file bài làm nào đọc được (chỉ có file nén, hoặc thư mục sinh tự động).",
    };
  }

  const entries: ZipEntry[] = [];
  for (const entry of found) {
    if (entry.data.length > budget.maxFileBytes) {
      skipped["too-big"] += 1;
      continue;
    }
    if (looksEncrypted(entry.data)) {
      skipped.junk += 1;
      continue;
    }
    entries.push(entry);
  }

  if (entries.length === 0) {
    return { error: "Mọi file trong .zip đều quá lớn hoặc không đọc được." };
  }

  return { entries, skipped };
}
