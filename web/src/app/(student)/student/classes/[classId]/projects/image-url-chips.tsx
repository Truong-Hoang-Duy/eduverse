"use client";

import { useState } from "react";

import { SafeImage } from "@/components/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IMAGE_URL_MAX, imageUrlError, imageUrlWarning } from "@/lib/image-url";

/**
 * Nhập ảnh sản phẩm bằng LINK (không upload lên hệ thống).
 *
 * Em tự đưa ảnh lên một trang host ảnh miễn phí rồi dán link vào đây — xem tab
 * Hướng dẫn. Khung xem trước ngay bên dưới là cách kiểm tra chắc chắn nhất: link
 * nào không hiện ảnh ở đây thì cũng sẽ không hiện với thầy cô và phụ huynh.
 */
export function ImageUrlChips({
  urls,
  onChange,
  max,
}: {
  urls: string[];
  onChange: (next: string[]) => void;
  max: number;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const atMax = urls.length >= max;

  function add() {
    if (atMax) return;
    const value = draft.trim();
    const problem = imageUrlError(value);
    if (problem) {
      setError(problem);
      setWarning("");
      return;
    }
    if (urls.includes(value)) {
      setError("Ảnh này đã có trong danh sách rồi.");
      setWarning("");
      return;
    }
    setError("");
    setWarning(imageUrlWarning(value) ?? "");
    onChange([...urls, value]);
    setDraft("");
  }

  function remove(url: string) {
    onChange(urls.filter((u) => u !== url));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Đừng submit cả form khi thêm ảnh.
              e.preventDefault();
              add();
            }
          }}
          placeholder={
            atMax ? `Đã đủ ${max} ảnh` : "Dán link ảnh rồi Enter (https://...)"
          }
          maxLength={IMAGE_URL_MAX}
          disabled={atMax}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={!draft.trim() || atMax}
        >
          Thêm ảnh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {warning && <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ {warning}</p>}

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {urls.map((url, i) => (
            <div key={url} className="relative">
              <SafeImage
                src={url}
                alt={`Ảnh ${i + 1} của sản phẩm`}
                className="h-24 w-32 rounded-md border bg-muted object-cover"
              />
              <button
                type="button"
                onClick={() => remove(url)}
                title="Bỏ ảnh này"
                className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border bg-background text-xs shadow-sm hover:bg-destructive hover:text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Ảnh đầu tiên được dùng làm ảnh bìa trên trang phụ huynh. Link nào không
        hiện được ở khung xem trước thì cũng sẽ không hiện với người khác.
      </p>
    </div>
  );
}
