"use client";

import { useState } from "react";

import { ImageLightbox } from "@/components/gallery/image-lightbox";
import { SafeImage } from "@/components/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IMAGE_URL_MAX, imageUrlError, imageUrlWarning } from "@/lib/image-url";

/**
 * Nhập ảnh sản phẩm bằng LINK (không upload lên hệ thống).
 *
 * Em tự đưa ảnh lên một trang host ảnh miễn phí rồi dán link vào đây — tab
 * Hướng dẫn có đủ các bước, nhưng đặt luôn link + gợi ý ngay tại đây để khỏi
 * phải rời trang giữa chừng lúc đang điền sản phẩm. Khung xem trước ngay bên
 * dưới là cách kiểm tra chắc chắn nhất: link nào không hiện ảnh ở đây thì cũng
 * sẽ không hiện với mọi người.
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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
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
      <p className="text-xs text-muted-foreground">
        Chưa có link ảnh?{" "}
        <a
          href="https://postimages.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Mở postimages.org ↗
        </a>{" "}
        (miễn phí, không cần tài khoản) → kéo ảnh vào → Upload → copy dòng{" "}
        <span className="font-medium text-foreground">&quot;Direct link&quot;</span> → dán vào ô bên dưới.
      </p>

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
        <>
          <div className="flex flex-wrap gap-3">
            {urls.map((url, i) => (
              <div key={url} className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewIndex(i);
                  }}
                  className="group relative cursor-zoom-in overflow-hidden rounded-lg border border-border/70 bg-muted transition-all duration-200 hover:scale-[1.03] hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-left block"
                  aria-label={`Bấm để xem ảnh ${i + 1} kích thước đầy đủ`}
                >
                  <SafeImage
                    src={url}
                    alt={`Ảnh ${i + 1} của sản phẩm`}
                    className="h-24 w-32 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25 flex items-end p-1.5 pointer-events-none">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-xs backdrop-blur-xs flex items-center gap-1">
                      🔍 Xem ảnh
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(url);
                  }}
                  title="Bỏ ảnh này"
                  className="absolute -top-2 -right-2 z-10 flex size-6 items-center justify-center rounded-full border bg-background text-xs shadow-sm hover:bg-destructive hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <ImageLightbox
            images={urls}
            currentIndex={previewIndex}
            onClose={() => setPreviewIndex(null)}
            onNavigate={setPreviewIndex}
          />
        </>
      )}

    </div>
  );
}
