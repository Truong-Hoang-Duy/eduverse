"use client";

import { useActionState, useEffect, useState } from "react";

import { DriveLinkChip } from "@/components/drive-link-chip";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMyDriveLink } from "@/lib/actions/drive-link";
import { looksLikeGoogleDrive } from "@/lib/drive-url";
import type { ActionResult } from "@/lib/types";

/**
 * Học viên khai link Drive nộp bài. MỘT link dùng cho MỌI lớp — nên form này
 * hiện ở lớp nào cũng sửa cùng một giá trị, phải nói rõ để em không tưởng mỗi
 * lớp một link.
 *
 * Lưu xong thì THU GỌN lại thành một chip bấm được (yêu cầu user 2026-07-30):
 * link Drive dài loằng ngoằng, hiện nguyên văn vừa rối vừa phá bố cục.
 */
export function DriveLinkForm({ initialUrl }: { initialUrl: string | null }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveMyDriveLink,
    {}
  );
  const [saved, setSaved] = useState(initialUrl);
  const [editing, setEditing] = useState(!initialUrl);
  const [value, setValue] = useState(initialUrl ?? "");

  // Lưu xong: chốt giá trị mới và thu gọn lại.
  useEffect(() => {
    if (!state.success) return;
    const next = value.trim();
    setSaved(next || null);
    setEditing(!next);
  }, [state.success, value]);

  const warnNotDrive = value.trim().length > 0 && !looksLikeGoogleDrive(value);

  if (!editing && saved) {
    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <DriveLinkChip url={saved} label="Mở thư mục Drive của tôi" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Sửa
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Giáo viên và các bạn cùng lớp xem được đường dẫn này. Dùng chung cho
          tất cả lớp của bạn.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <Label htmlFor="drive_url">Đường dẫn thư mục Drive nộp bài</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="drive_url"
          name="drive_url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://drive.google.com/drive/folders/..."
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
        {saved && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setValue(saved);
              setEditing(false);
            }}
          >
            Hủy
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Tạo một thư mục trên Google Drive, đặt quyền cho người có link xem được,
        rồi dán vào đây. Bài tập các buổi em upload hết vào thư mục đó — giáo
        viên và các bạn cùng lớp sẽ mở được để xem và góp ý.
        <strong className="font-medium"> Một đường dẫn dùng cho mọi lớp.</strong>
      </p>
      {warnNotDrive && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️ Đường dẫn này không thuộc Google Drive — kiểm tra lại xem có dán đúng
          không (vẫn lưu được nếu bạn cố ý dùng dịch vụ khác).
        </p>
      )}
      <FormMessage result={state} />
    </form>
  );
}
