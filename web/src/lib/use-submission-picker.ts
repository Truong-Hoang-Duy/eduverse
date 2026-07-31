"use client";

/**
 * Toàn bộ phần "nhận file bài làm" của 3 công cụ AI trong khu Chấm bài.
 *
 * Trước đây mỗi tool tự viết lấy: `grading-tool` và `help-tool` trùng nhau gần
 * 200 dòng, còn `project-review-tool` viết kiểu thứ ba. Hook này giữ phần CHUNG
 * (kéo thả, đọc thư mục, lọc rác, gom lỗi, cộng dồn/thay thế, đếm file bỏ qua)
 * và tham số hóa đúng những chỗ 3 tool KHÁC nhau thật:
 *
 * | | Bài tập / Hỏi bài | Sản phẩm cuối khóa |
 * |---|---|---|
 * | `filter` | giữ ảnh + PDF/Word | bỏ (ảnh là asset) |
 * | `budget` | 6MB | 2MB |
 * | `toItems` | bọc File, base64 lúc gửi | đọc thành chữ ngay |
 * | `unzip` | `extractZipForGrading` | `extractZipFiles` |
 *
 * Bốn khác biệt đó là quyết định có chủ ý (xem DECISIONS.md) — đừng gộp nốt.
 */

import { useRef, useState, useTransition } from "react";

import { unsupportedSubmissionReason } from "@/lib/file-check";
import {
  pickedFromDrop,
  pickedFromInput,
  type PickedFile,
} from "@/lib/read-dropped-files";
import {
  emptyTally,
  formatBytes,
  skipReasonFor,
  stripCommonRoot,
  type Budget,
  type FilterOptions,
  type SkipTally,
} from "@/lib/submission-files";

/** Thứ tối thiểu hook cần biết về một file để dựng danh sách và đếm dung lượng. */
export interface PickedItem {
  /** Định danh chống trùng khi thả nhiều lượt. */
  key: string;
  path: string;
  size: number;
}

export interface UnzipResult<T> {
  items?: T[];
  skipped?: SkipTally;
  error?: string;
}

export interface SubmissionPickerOptions<T extends PickedItem> {
  filter: FilterOptions;
  budget: Budget;
  /**
   * Đổi file đã lọc thành item của tool (bọc File, hoặc đọc thành chữ).
   *
   * Trả thêm `skipped` cho những file CHỈ lúc đọc mới biết là hỏng — lọc theo
   * tên ở trên không bắt được, mà bỏ im lặng thì GV tưởng đã gửi đủ.
   */
  toItems: (
    picked: PickedFile[]
  ) => { items: T[]; skipped?: SkipTally } | Promise<{ items: T[]; skipped?: SkipTally }>;
  /** Giải nén .zip — mỗi tool có Server Action riêng vì kiểu trả về khác nhau. */
  unzip: (zip: File) => Promise<UnzipResult<T>>;
  /**
   * Đang có kết quả AI trên màn hình hay chưa.
   *
   * Có rồi mà GV nạp tiếp = sang bài/em khác → XÓA sạch danh sách cũ. Chưa có
   * thì cộng dồn, để thêm file quên cho cùng một bài vẫn được (user chốt
   * 2026-07-31, ban đầu chỉ áp cho tab bài tập, nay dùng chung cả 3).
   */
  hasResult: boolean;
  /** Gọi mỗi khi danh sách đổi — tool dùng để bỏ kết quả AI đã cũ. */
  onItemsChanged: () => void;
}

export function useSubmissionPicker<T extends PickedItem>({
  filter,
  budget,
  toItems,
  unzip,
  hasResult,
  onItemsChanged,
}: SubmissionPickerOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [skipped, setSkipped] = useState<SkipTally>(emptyTally());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [reading, startReading] = useTransition();

  // dragenter/dragleave bắn cả khi con trỏ đi qua phần tử con → đếm độ sâu, chứ
  // set/unset theo từng event thì viền highlight nháy liên tục.
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  function apply(incoming: T[], tally: SkipTally, source: string, startFresh: boolean) {
    let added = 0;
    setItems((prev) => {
      const base = startFresh ? [] : prev;
      const seen = new Set(base.map((a) => a.key));
      const fresh = incoming.filter((a) => !seen.has(a.key));
      added = fresh.length;
      return [...base, ...fresh];
    });
    setSkipped((prev) => {
      const next = startFresh ? emptyTally() : { ...prev };
      for (const key of Object.keys(tally) as (keyof SkipTally)[]) {
        next[key] += tally[key];
      }
      return next;
    });

    // Nói việc vừa xảy ra. "Đã bỏ qua gì" nằm ở cuối danh sách, còn "file không
    // được lưu lại" nằm ở vùng thả — không lặp ở đây để câu này còn đọc được.
    const bytes = incoming.reduce((sum, a) => sum + a.size, 0);
    setNotice(
      `${startFresh ? "Đã bỏ bài trước. " : ""}Đã nạp ${added} file (${formatBytes(bytes)}) từ ${source}.`
    );
  }

  function load(picked: PickedFile[]) {
    // Đọc TRƯỚC khi xóa kết quả — sau khi `onItemsChanged` chạy thì `hasResult`
    // của lượt render này vẫn là giá trị cũ, nên phải chốt ngay tại đây.
    const startFresh = hasResult;

    onItemsChanged();
    setError("");
    setNotice("");

    if (picked.length === 0) {
      setError("Không tìm thấy file nào trong thứ vừa chọn.");
      return;
    }

    // Tên nguồn để báo cho GV: thư mục thì lấy tên thư mục gốc.
    const root = picked.find((p) => p.path.includes("/"))?.path.split("/")[0];
    const source = root ? `thư mục "${root}"` : "file đã chọn";

    if (picked.length === 1 && picked[0].path.toLowerCase().endsWith(".zip")) {
      startReading(async () => {
        try {
          const res = await unzip(picked[0].file);
          if (res.error) {
            setError(res.error);
            return;
          }
          apply(
            res.items ?? [],
            res.skipped ?? emptyTally(),
            `file nén "${picked[0].file.name}"`,
            startFresh
          );
        } catch {
          setError("Không đọc được file .zip này.");
        }
      });
      return;
    }

    // Lỗi ĐÁNG GIẢI THÍCH (Word đời cũ, .rar) báo to; rác trong thư mục
    // (node_modules, lock file...) bỏ im lặng rồi tổng kết một dòng.
    const loud: string[] = [];
    const tally = emptyTally();
    const kept: PickedFile[] = [];

    for (const item of picked) {
      const complaint = unsupportedSubmissionReason(item.path);
      if (complaint) {
        loud.push(complaint);
        continue;
      }
      const reason = skipReasonFor(item.path, filter);
      if (reason) {
        tally[reason] += 1;
        continue;
      }
      if (item.file.size > budget.maxFileBytes) {
        tally["too-big"] += 1;
        continue;
      }
      kept.push(item);
    }

    if (loud.length > 0) {
      setError(
        loud.length === 1
          ? loud[0]
          : `${loud[0]} (và ${loud.length - 1} file khác bị loại)`
      );
    }

    startReading(async () => {
      const read = await toItems(kept);
      for (const key of Object.keys(tally) as (keyof SkipTally)[]) {
        tally[key] += read.skipped?.[key] ?? 0;
      }
      // Bỏ đoạn thư mục gốc chung để đường dẫn gọn và AI đọc dễ bố cục.
      apply(stripCommonRoot(read.items), tally, source, startFresh);
    });
  }

  async function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);

    // PHẢI gom entry ĐỒNG BỘ ở đây: `dataTransfer.items` bị xóa ngay khi handler
    // trả về, `await` trước khi gom là mất sạch dữ liệu.
    const entries = Array.from(e.dataTransfer.items).map((item) =>
      item.webkitGetAsEntry()
    );
    const plainFiles = Array.from(e.dataTransfer.files);

    load(await pickedFromDrop(entries, plainFiles, filter));
  }

  function handleInput(list: FileList | null, input: HTMLInputElement | null) {
    load(pickedFromInput(Array.from(list ?? []), filter));
    // Dọn input để chọn LẠI đúng file vừa bỏ vẫn kích hoạt onChange.
    if (input) input.value = "";
  }

  function remove(key: string) {
    setItems((prev) => prev.filter((a) => a.key !== key));
    onItemsChanged();
  }

  function clear() {
    setItems([]);
    setSkipped(emptyTally());
    setNotice("");
    setError("");
    onItemsChanged();
  }

  return {
    items,
    skipped,
    notice,
    error,
    reading,
    dragging,
    setError,
    remove,
    clear,
    /** Truyền thẳng vào `<SubmissionDropzone>`. */
    dropzone: {
      dragging,
      reading,
      fileInputRef,
      folderInputRef,
      onDrop: handleDrop,
      onInputChange: handleInput,
      onDragEnter: (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      },
      onDragLeave: (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) setDragging(false);
      },
    },
  };
}

export type SubmissionDropzoneState = ReturnType<
  typeof useSubmissionPicker
>["dropzone"];
